// Simple test file to demonstrate the actor functionality
import { BusinessData } from './types';
import { ResultMerger } from './mergeResults';

// Sample test data
const sampleBusinesses: BusinessData[] = [
  {
    id: 'google_1',
    name: 'ABC Plumbing Services',
    category: 'Plumber',
    address: '123 Main St, New York, NY 10001',
    phone: '+1-555-123-4567',
    website: 'https://abcplumbing.com',
    businessStatus: 'open',
    source: 'google',
    lastUpdated: new Date().toISOString(),
    confidence: 0.9,
    googleMaps: {
      rating: 4.5,
      reviewsCount: 127
    }
  },
  {
    id: 'yelp_1',
    name: 'ABC Plumbing Services',
    category: 'Plumbing Contractor',
    address: '123 Main St, New York, NY 10001',
    phone: '+1-555-123-4567',
    website: 'https://abcplumbing.com',
    businessStatus: 'open',
    source: 'yelp',
    lastUpdated: new Date().toISOString(),
    confidence: 0.85,
    yelp: {
      rating: 4.3,
      reviewsCount: 89
    }
  },
  {
    id: 'facebook_1',
    name: 'ABC Plumbing Services',
    category: 'Plumber',
    address: '123 Main St, New York, NY 10001',
    phone: '+1-555-123-4567',
    businessStatus: 'open',
    source: 'facebook',
    lastUpdated: new Date().toISOString(),
    confidence: 0.8,
    facebook: {
      pageUrl: 'https://facebook.com/abcplumbingny',
      pageId: 'abcplumbingny',
      verified: true
    }
  },
  {
    id: 'google_2',
    name: 'XYZ Electric Co',
    category: 'Electrician',
    address: '456 Oak Ave, Los Angeles, CA 90210',
    phone: '+1-555-987-6543',
    website: 'https://xyzelectric.com',
    businessStatus: 'open',
    source: 'google',
    lastUpdated: new Date().toISOString(),
    confidence: 0.95
  }
];

async function testDeduplication() {
  console.log('Testing deduplication with sample data...');
  console.log(`Input: ${sampleBusinesses.length} businesses`);
  
  const merger = new ResultMerger(sampleBusinesses);
  const mergedResults = await merger.merge();
  
  console.log(`Output: ${mergedResults.length} businesses`);
  console.log('\nMerged results:');
  
  mergedResults.forEach((business, index) => {
    console.log(`\n${index + 1}. ${business.name}`);
    console.log(`   Source: ${business.source}`);
    console.log(`   Address: ${business.address}`);
    console.log(`   Phone: ${business.phone}`);
    console.log(`   Website: ${business.website}`);
    console.log(`   Confidence: ${business.confidence}`);
    
    if (business.googleMaps) {
      console.log(`   Google Maps: ${business.googleMaps.rating} stars (${business.googleMaps.reviewsCount} reviews)`);
    }
    if (business.yelp) {
      console.log(`   Yelp: ${business.yelp.rating} stars (${business.yelp.reviewsCount} reviews)`);
    }
    if (business.facebook) {
      console.log(`   Facebook: ${business.facebook.pageUrl} (verified: ${business.facebook.verified})`);
    }
  });
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDeduplication().catch(console.error);
}

export { testDeduplication };
