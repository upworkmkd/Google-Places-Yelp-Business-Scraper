import { Actor } from 'apify';
import { BusinessData, ScraperInput, ScraperResult, ActorInterface } from './types';

export class FacebookScraper {
  private actor: ActorInterface;
  private input: ScraperInput;

  constructor(actor: ActorInterface, input: ScraperInput) {
    this.actor = actor;
    this.input = input;
  }

  async scrape(): Promise<ScraperResult> {
    const businesses: BusinessData[] = [];
    const errors: string[] = [];

    try {
      const browser = await this.actor.launchPuppeteer();
      
      for (const keyword of this.input.keywords) {
        for (const location of this.input.locations) {
          try {
            this.actor.log.info(`Scraping Facebook for "${keyword}" in "${location}"`);
            
            const searchResults = await this.scrapeSearchResults(
              browser, 
              keyword, 
              location
            );
            
            businesses.push(...searchResults);
            
            // Rate limiting
            await this.actor.sleep(4000);
            
          } catch (error) {
            const errorMsg = `Error scraping Facebook for "${keyword}" in "${location}": ${error}`;
            this.actor.log.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      await browser.close();
      
      // Limit results per source
      const limitedBusinesses = businesses.slice(0, this.input.maxResultsPerSource);
      
      return {
        businesses: limitedBusinesses,
        totalFound: businesses.length,
        source: 'facebook',
        errors
      };
      
    } catch (error) {
      const errorMsg = `Facebook scraper failed: ${error}`;
      this.actor.log.error(errorMsg);
      return {
        businesses: [],
        totalFound: 0,
        source: 'facebook',
        errors: [errorMsg]
      };
    }
  }

  private async scrapeSearchResults(browser: any, keyword: string, location: string): Promise<BusinessData[]> {
    const page = await browser.newPage();
    const businesses: BusinessData[] = [];

    try {
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to Facebook search
      const searchQuery = encodeURIComponent(`${keyword} ${location}`);
      const facebookUrl = `https://www.facebook.com/search/pages/?q=${searchQuery}&type=pages`;
      
      await page.goto(facebookUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await page.waitForSelector('[data-pagelet="SearchResults"]', { timeout: 15000 });
      
      // Scroll to load more results
      await this.scrollToLoadResults(page);
      
      // Extract business data from search results
      const businessElements = await page.$$('[data-pagelet="SearchResults"] > div > div');
      
      for (let i = 0; i < Math.min(businessElements.length, this.input.maxResultsPerSource); i++) {
        try {
          const businessData = await this.extractBusinessDataFromSearch(page, businessElements[i], i);
          if (businessData) {
            businesses.push(businessData);
          }
        } catch (error) {
          this.actor.log.warning(`Failed to extract business data for element ${i}: ${error}`);
        }
      }

    } catch (error) {
      this.actor.log.error(`Error in scrapeSearchResults: ${error}`);
    } finally {
      await page.close();
    }

    return businesses;
  }

  private async scrollToLoadResults(page: any): Promise<void> {
    let previousHeight = 0;
    let currentHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 3;

    do {
      previousHeight = currentHeight;
      
      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Wait for new content to load
      await page.waitForTimeout(3000);
      
      // Get new height
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
      
      scrollAttempts++;
    } while (currentHeight > previousHeight && scrollAttempts < maxScrollAttempts);
  }

  private async extractBusinessDataFromSearch(page: any, element: any, index: number): Promise<BusinessData | null> {
    try {
      const businessData = await page.evaluate((el: any) => {
        const extractText = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() : '';
        };

        const extractLink = (selector: string) => {
          const element = document.querySelector(selector) as HTMLAnchorElement;
          return element ? element.href : '';
        };

        // Extract basic info from search result
        const name = extractText('a[role="link"] span') || extractText('a[role="link"]') || '';
        const category = extractText('[data-testid="subtitle"]') || '';
        const pageLink = extractLink('a[role="link"]') || '';

        return {
          name,
          category,
          pageLink
        };
      }, element);

      if (!businessData.name || !businessData.pageLink) {
        return null;
      }

      // Get detailed info from the business page
      let detailedInfo = {};
      try {
        detailedInfo = await this.getDetailedBusinessInfo(page, businessData.pageLink);
      } catch (error) {
        this.actor.log.warning(`Failed to get detailed info for ${businessData.name}: ${error}`);
      }

      // Generate unique ID
      const id = `facebook_${Date.now()}_${index}`;

      return {
        id,
        name: businessData.name,
        category: businessData.category,
        address: (detailedInfo as any)['address'] || '',
        phone: (detailedInfo as any)['phone'] || undefined,
        website: (detailedInfo as any)['website'] || undefined,
        email: (detailedInfo as any)['email'] || undefined,
        openingHours: (detailedInfo as any)['openingHours'] || undefined,
        facebook: {
          pageUrl: businessData.pageLink,
          pageId: this.extractPageId(businessData.pageLink),
          verified: (detailedInfo as any)['verified'] || false
        },
        socialProfiles: (detailedInfo as any)['socialProfiles'] || undefined,
        businessStatus: (detailedInfo as any)['businessStatus'] || 'open',
        source: 'facebook',
        lastUpdated: new Date().toISOString(),
        confidence: this.calculateConfidence(businessData, detailedInfo)
      };

    } catch (error) {
      this.actor.log.warning(`Error extracting business data: ${error}`);
      return null;
    }
  }

  private async getDetailedBusinessInfo(page: any, businessUrl: string): Promise<any> {
    try {
      const newPage = await page.browser().newPage();
      await newPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      await newPage.goto(businessUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      
      const detailedInfo = await newPage.evaluate(() => {
        const extractText = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() : '';
        };

        const extractLink = (selector: string) => {
          const element = document.querySelector(selector) as HTMLAnchorElement;
          return element ? element.href : '';
        };

        const extractHours = () => {
          const hoursElement = document.querySelector('[data-testid="hours"]') || 
                              document.querySelector('[data-pagelet="PageInfo"]');
          if (!hoursElement) return {};
          
          const hoursText = hoursElement.textContent || '';
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const lines = hoursText.split('\n').filter((line: string) => line.trim());
          
          const hours: any = {};
          days.forEach((day, index) => {
            if (lines[index]) {
              hours[day] = lines[index].trim();
            }
          });
          
          return hours;
        };

        const extractSocialProfiles = () => {
          const profiles: any = {};
          const links = document.querySelectorAll('a[href*="instagram.com"]');
          if (links.length > 0) {
            profiles.instagram = (links[0] as HTMLAnchorElement).href;
          }
          
          const twitterLinks = document.querySelectorAll('a[href*="twitter.com"]');
          if (twitterLinks.length > 0) {
            profiles.twitter = (twitterLinks[0] as HTMLAnchorElement).href;
          }
          
          const linkedinLinks = document.querySelectorAll('a[href*="linkedin.com"]');
          if (linkedinLinks.length > 0) {
            profiles.linkedin = (linkedinLinks[0] as HTMLAnchorElement).href;
          }
          
          return Object.keys(profiles).length > 0 ? profiles : undefined;
        };

        return {
          address: extractText('[data-testid="address"]') || extractText('[data-pagelet="PageInfo"] [data-testid="address"]'),
          phone: extractText('[data-testid="phone"]') || extractText('[data-pagelet="PageInfo"] [data-testid="phone"]'),
          website: extractText('[data-testid="website"]') || extractText('[data-pagelet="PageInfo"] [data-testid="website"]'),
          email: extractText('[data-testid="email"]') || extractText('[data-pagelet="PageInfo"] [data-testid="email"]'),
          openingHours: extractHours(),
          verified: document.querySelector('[data-testid="verified"]') !== null,
          socialProfiles: extractSocialProfiles(),
          businessStatus: document.querySelector('[data-testid="closed"]') ? 'closed' : 'open'
        };
      });

      await newPage.close();
      return detailedInfo;
      
    } catch (error) {
      this.actor.log.warning(`Error getting detailed business info: ${error}`);
      return {};
    }
  }

  private extractPageId(pageUrl: string): string | undefined {
    const match = pageUrl.match(/facebook\.com\/([^/?]+)/);
    return match ? match[1] : undefined;
  }

  private calculateConfidence(businessData: any, detailedInfo: any): number {
    let score = 0;
    
    if (businessData.name) score += 0.3;
    if (detailedInfo.address) score += 0.3;
    if (detailedInfo.phone) score += 0.2;
    if (detailedInfo.website) score += 0.1;
    if (detailedInfo.verified) score += 0.1;
    
    return Math.min(score, 1);
  }
}
