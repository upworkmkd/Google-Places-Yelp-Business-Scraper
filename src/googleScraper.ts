import { Actor } from 'apify';
import { BusinessData, ScraperInput, ScraperResult, ActorInterface } from './types';

export class GoogleMapsScraper {
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
            this.actor.log.info(`Scraping Google Maps for "${keyword}" in "${location}"`);
            
            const searchResults = await this.scrapeSearchResults(
              browser, 
              keyword, 
              location
            );
            
            businesses.push(...searchResults);
            
            // Rate limiting
            await this.actor.sleep(2000);
            
          } catch (error) {
            const errorMsg = `Error scraping Google Maps for "${keyword}" in "${location}": ${error}`;
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
        source: 'google',
        errors
      };
      
    } catch (error) {
      const errorMsg = `Google Maps scraper failed: ${error}`;
      this.actor.log.error(errorMsg);
      return {
        businesses: [],
        totalFound: 0,
        source: 'google',
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

      // Navigate to Google Maps search
      const searchQuery = encodeURIComponent(`${keyword} in ${location}`);
      const mapsUrl = `https://www.google.com/maps/search/${searchQuery}`;
      
      await page.goto(mapsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for results to load
      await page.waitForSelector('[role="main"]', { timeout: 10000 });
      
      // Scroll to load more results
      await this.scrollToLoadResults(page);
      
      // Extract business data
      const businessElements = await page.$$('[data-result-index]');
      
      for (let i = 0; i < Math.min(businessElements.length, this.input.maxResultsPerSource); i++) {
        try {
          const businessData = await this.extractBusinessData(page, businessElements[i], i);
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
    const maxScrollAttempts = 5;

    do {
      previousHeight = currentHeight;
      
      // Scroll down
      await page.evaluate(() => {
        const scrollableElement = document.querySelector('[role="main"]');
        if (scrollableElement) {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        }
      });
      
      // Wait for new content to load
      await page.waitForTimeout(2000);
      
      // Get new height
      currentHeight = await page.evaluate(() => {
        const scrollableElement = document.querySelector('[role="main"]');
        return scrollableElement ? scrollableElement.scrollHeight : 0;
      });
      
      scrollAttempts++;
    } while (currentHeight > previousHeight && scrollAttempts < maxScrollAttempts);
  }

  private async extractBusinessData(page: any, element: any, index: number): Promise<BusinessData | null> {
    try {
      // Click on the business to get detailed info
      await element.click();
      await page.waitForTimeout(2000);

      // Extract business information
      const businessData = await page.evaluate((el: any) => {
        const extractText = (selector: string) => {
          const element = document.querySelector(selector);
          return element ? element.textContent?.trim() : '';
        };

        const extractRating = (selector: string) => {
          const element = document.querySelector(selector);
          if (element) {
            const text = element.textContent || '';
            const match = text.match(/(\d+\.?\d*)/);
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

        // Extract basic info
        const name = extractText('h1[data-attrid="title"]') || extractText('h1') || '';
        const address = extractText('[data-item-id="address"]') || extractText('[data-attrid="kc:/location/location:address"]') || '';
        const phone = extractText('[data-item-id="phone"]') || extractText('[data-attrid="kc:/business/phone:phone"]') || '';
        const website = extractText('[data-item-id="authority"]') || extractText('[data-attrid="kc:/business/website:website"]') || '';
        
        // Extract rating and reviews
        const rating = extractRating('[data-attrid="kc:/business/rating:rating"]') || extractRating('[aria-label*="stars"]');
        const reviewsCount = extractNumber('[data-attrid="kc:/business/rating:rating"]') || extractNumber('[aria-label*="reviews"]');
        
        // Extract category
        const category = extractText('[data-attrid="kc:/business/type:type"]') || extractText('[data-item-id="type"]') || '';
        
        // Extract hours
        const hoursElement = document.querySelector('[data-item-id="oh"]');
        let openingHours = {};
        if (hoursElement) {
          const hoursText = hoursElement.textContent || '';
          // Parse hours (simplified)
          const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          const lines = hoursText.split('\n');
          days.forEach((day, index) => {
            if (lines[index]) {
              (openingHours as any)[day] = lines[index].trim();
            }
          });
        }

        return {
          name,
          address,
          phone,
          website,
          category,
          rating,
          reviewsCount,
          openingHours
        };
      }, element);

      if (!businessData.name) {
        return null;
      }

      // Generate unique ID
      const id = `google_${Date.now()}_${index}`;

      return {
        id,
        name: businessData.name,
        category: businessData.category,
        address: businessData.address,
        phone: businessData.phone || undefined,
        website: businessData.website || undefined,
        openingHours: businessData.openingHours,
        googleMaps: {
          rating: businessData.rating,
          reviewsCount: businessData.reviewsCount
        },
        businessStatus: 'open', // Default assumption
        source: 'google',
        lastUpdated: new Date().toISOString(),
        confidence: this.calculateConfidence(businessData)
      };

    } catch (error) {
      this.actor.log.warning(`Error extracting business data: ${error}`);
      return null;
    }
  }

  private calculateConfidence(businessData: any): number {
    let score = 0;
    
    if (businessData.name) score += 0.3;
    if (businessData.address) score += 0.3;
    if (businessData.phone) score += 0.2;
    if (businessData.website) score += 0.1;
    if (businessData.rating) score += 0.1;
    
    return Math.min(score, 1);
  }
}
