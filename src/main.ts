import { Actor } from 'apify';
import { ScraperInput, BusinessData, ActorInterface } from './types';
import { GoogleMapsScraper } from './googleScraper';
import { YelpScraper } from './yelpScraper';
import { FacebookScraper } from './facebookScraper';
import { ResultMerger } from './mergeResults';

// Initialize the Actor
// Created by Manoj Dhiman (https://manojdhiman.me/)
function getActor(): ActorInterface {
  return (global as any).actor || new Actor();
}

// Main execution function
async function main() {
  try {
    // Get input from Apify or test environment
    const actor = getActor();
    let input: ScraperInput;
    try {
      input = await actor.getInput() as ScraperInput;
    } catch (error) {
      // If getInput fails, it might be a test environment
      console.log('⚠️  Actor.getInput() failed, this might be a test environment');
      console.log('Debug: getInput error:', error);
      throw new Error('No input provided - make sure to set up test input properly');
    }
    
    if (!input) {
      throw new Error('No input provided');
    }

    // Validate input
    if (!input.keywords || input.keywords.length === 0) {
      throw new Error('Keywords are required');
    }
    
    if (!input.locations || input.locations.length === 0) {
      throw new Error('Locations are required');
    }

    // Set defaults
    const config: ScraperInput = {
      keywords: input.keywords,
      locations: input.locations,
      maxResultsPerSource: input.maxResultsPerSource || 50,
      includeFacebook: input.includeFacebook !== false,
      includeYelp: input.includeYelp !== false,
      includeGoogleMaps: input.includeGoogleMaps !== false
    };

    actor.log.info(`Starting Local Business Data Extractor`);
    actor.log.info(`Keywords: ${config.keywords.join(', ')}`);
    actor.log.info(`Locations: ${config.locations.join(', ')}`);
    actor.log.info(`Max results per source: ${config.maxResultsPerSource}`);

    const allBusinesses: BusinessData[] = [];
    const allErrors: string[] = [];

    // Run Google Maps scraper
    if (config.includeGoogleMaps) {
      try {
        actor.log.info('Starting Google Maps scraping...');
        const googleScraper = new GoogleMapsScraper(actor, config);
        const googleResults = await googleScraper.scrape();
        
        allBusinesses.push(...googleResults.businesses);
        allErrors.push(...googleResults.errors);
        
        actor.log.info(`Google Maps: Found ${googleResults.businesses.length} businesses`);
      } catch (error) {
        const errorMsg = `Google Maps scraper failed: ${error}`;
        actor.log.error(errorMsg);
        allErrors.push(errorMsg);
      }
    }

    // Run Yelp scraper
    if (config.includeYelp) {
      try {
        actor.log.info('Starting Yelp scraping...');
        const yelpScraper = new YelpScraper(actor, config);
        const yelpResults = await yelpScraper.scrape();
        
        allBusinesses.push(...yelpResults.businesses);
        allErrors.push(...yelpResults.errors);
        
        actor.log.info(`Yelp: Found ${yelpResults.businesses.length} businesses`);
      } catch (error) {
        const errorMsg = `Yelp scraper failed: ${error}`;
        actor.log.error(errorMsg);
        allErrors.push(errorMsg);
      }
    }

    // Run Facebook scraper
    if (config.includeFacebook) {
      try {
        actor.log.info('Starting Facebook scraping...');
        const facebookScraper = new FacebookScraper(actor, config);
        const facebookResults = await facebookScraper.scrape();
        
        allBusinesses.push(...facebookResults.businesses);
        allErrors.push(...facebookResults.errors);
        
        actor.log.info(`Facebook: Found ${facebookResults.businesses.length} businesses`);
      } catch (error) {
        const errorMsg = `Facebook scraper failed: ${error}`;
        actor.log.error(errorMsg);
        allErrors.push(errorMsg);
      }
    }

    actor.log.info(`Total businesses found before deduplication: ${allBusinesses.length}`);

    // Deduplicate and merge results
    let finalResults: BusinessData[] = [];
    if (allBusinesses.length > 0) {
      try {
        actor.log.info('Starting deduplication process...');
        const merger = new ResultMerger(allBusinesses);
        finalResults = await merger.merge();
        actor.log.info(`Final results after deduplication: ${finalResults.length} businesses`);
      } catch (error) {
        const errorMsg = `Deduplication failed: ${error}`;
        actor.log.error(errorMsg);
        allErrors.push(errorMsg);
        // If deduplication fails, return all businesses
        finalResults = allBusinesses;
      }
    }

    // Store results in Apify Dataset
    if (finalResults.length > 0) {
      try {
        await actor.pushData(finalResults);
        actor.log.info(`Successfully stored ${finalResults.length} businesses in Apify Dataset`);
      } catch (error) {
        const errorMsg = `Failed to store results in dataset: ${error}`;
        actor.log.error(errorMsg);
        allErrors.push(errorMsg);
      }
    }

    // Set actor output
    const output = {
      success: true,
      totalBusinesses: finalResults.length,
      businesses: finalResults,
      errors: allErrors,
      summary: {
        googleMaps: config.includeGoogleMaps ? allBusinesses.filter(b => b.source === 'google').length : 0,
        yelp: config.includeYelp ? allBusinesses.filter(b => b.source === 'yelp').length : 0,
        facebook: config.includeFacebook ? allBusinesses.filter(b => b.source === 'facebook').length : 0,
        merged: finalResults.filter(b => b.source === 'merged').length,
        unique: finalResults.filter(b => b.source !== 'merged').length
      },
      timestamp: new Date().toISOString()
    };

    await actor.setValue('OUTPUT', output);
    actor.log.info('Actor execution completed successfully');

  } catch (error) {
    const actor = getActor();
    console.log('Debug: Caught error:', error);
    console.log('Debug: Error type:', typeof error);
    console.log('Debug: Error instanceof Error:', error instanceof Error);
    
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    actor.log.error(`Actor execution failed: ${errorMessage}`);
    
    // Set error output
    const errorOutput = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    };
    
    await actor.setValue('OUTPUT', errorOutput);
    throw error;
  }
}

// Handle actor termination
const actor = getActor();
if ('on' in actor) {
  (actor as any).on('abort', () => {
    actor.log.info('Actor aborted');
  });
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    const actor = getActor();
    actor.log.error(`Unhandled error: ${error}`);
    process.exit(1);
  });
}

export { main };
