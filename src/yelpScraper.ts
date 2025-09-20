import { Actor } from 'apify';
import { BusinessData, ScraperInput, ScraperResult, ActorInterface } from './types';

export class YelpScraper {
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
            this.actor.log.info(`Scraping Yelp for "${keyword}" in "${location}"`);
            
            const searchResults = await this.scrapeSearchResults(
              browser, 
              keyword, 
              location
            );
            
            businesses.push(...searchResults);
            
            // Rate limiting
            await this.actor.sleep(3000);
            
          } catch (error) {
            const errorMsg = `Error scraping Yelp for "${keyword}" in "${location}": ${error}`;
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
        source: 'yelp',
        errors
      };
      
    } catch (error) {
      const errorMsg = `Yelp scraper failed: ${error}`;
      this.actor.log.error(errorMsg);
      return {
        businesses: [],
        totalFound: 0,
        source: 'yelp',
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

      // Navigate to Yelp search
      const searchQuery = encodeURIComponent(`${keyword} in ${location}`);
      const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(keyword)}&find_loc=${encodeURIComponent(location)}`;
      
      await page.goto(yelpUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 10000 });
      
      // Scroll to load more results
      await this.scrollToLoadResults(page);
      
      // Extract business data from search results
      const businessElements = await page.$$('[data-testid="search-result"]');
      
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

        const extractRating = (selector: string) => {
          const element = document.querySelector(selector);
          if (element) {
            const ariaLabel = element.getAttribute('aria-label') || '';
            const match = ariaLabel.match(/(\d+\.?\d*)\s*star/);
            return match ? parseFloat(match[1]) : null;
          }
          return null;
        };

        const extractNumber = (selector: string) => {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || '';
            const match = text.match(/(\d+)/);
            return match ? parseInt(match[1]) : null;
          }
          return null;
        };

        // Extract basic info from search result
        const name = extractText('h3 a') || extractText('h3') || '';
        const category = extractText('[data-testid="category"]') || '';
        const address = extractText('[data-testid="address"]') || '';
        const phone = extractText('[data-testid="phone"]') || '';
        
        // Extract rating and reviews
        const rating = extractRating('[data-testid="rating"]');
        const reviewsCount = extractNumber('[data-testid="review-count"]');
        
        // Extract business link
        const businessLink = el.querySelector('h3 a')?.href || '';

        return {
          name,
          category,
          address,
          phone,
          businessLink,
          rating,
          reviewsCount
        };
      }, element);

      if (!businessData.name) {
        return null;
      }

      // Try to get more detailed info from business page
      let detailedInfo = {};
      if (businessData.businessLink) {
        try {
          detailedInfo = await this.getDetailedBusinessInfo(page, businessData.businessLink);
        } catch (error) {
          this.actor.log.warning(`Failed to get detailed info for ${businessData.name}: ${error}`);
        }
      }

      // Generate unique ID
      const id = `yelp_${Date.now()}_${index}`;

      return {
        id,
        name: businessData.name,
        category: businessData.category,
        address: businessData.address,
        phone: businessData.phone || undefined,
        website: (detailedInfo as any)['website'] || undefined,
        email: (detailedInfo as any)['email'] || undefined,
        openingHours: (detailedInfo as any)['openingHours'] || undefined,
        yelp: {
          rating: businessData.rating,
          reviewsCount: businessData.reviewsCount,
          yelpId: this.extractYelpId(businessData.businessLink)
        },
        businessStatus: 'open', // Default assumption
        source: 'yelp',
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

        const extractHours = () => {
          const hoursElement = document.querySelector('[data-testid="hours"]');
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

        return {
          website: extractText('[data-testid="website"]') || extractText('a[href*="biz_redir"]'),
          email: extractText('[data-testid="email"]'),
          openingHours: extractHours()
        };
      });

      await newPage.close();
      return detailedInfo;
      
    } catch (error) {
      this.actor.log.warning(`Error getting detailed business info: ${error}`);
      return {};
    }
  }

  private extractYelpId(businessUrl: string): string | undefined {
    const match = businessUrl.match(/\/biz\/([^/?]+)/);
    return match ? match[1] : undefined;
  }

  private calculateConfidence(businessData: any, detailedInfo: any): number {
    let score = 0;
    
    if (businessData.name) score += 0.3;
    if (businessData.address) score += 0.3;
    if (businessData.phone) score += 0.2;
    if (detailedInfo.website) score += 0.1;
    if (businessData.rating) score += 0.1;
    
    return Math.min(score, 1);
  }
}
