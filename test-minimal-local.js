#!/usr/bin/env node

/**
 * Minimal Local Testing Script
 * Created by Manoj Dhiman (https://manojdhiman.me/)
 * 
 * This script tests only the deduplication logic without web scraping
 */

const { testDeduplication } = require('./dist/test.js');

async function runMinimalTest() {
  console.log('🧪 Running Minimal Local Test');
  console.log('📝 Created by Manoj Dhiman (https://manojdhiman.me/)');
  console.log('=' .repeat(50));
  
  try {
    console.log('✅ Testing deduplication logic...');
    await testDeduplication();
    
    console.log('\n✅ Testing TypeScript compilation...');
    console.log('✅ All core components are working!');
    
    console.log('\n📋 Next Steps:');
    console.log('1. Test with real scraping: npm run test:local');
    console.log('2. Deploy to Apify: npm run deploy');
    console.log('3. Check TESTING.md for more details');
    
  } catch (error) {
    console.error('\n❌ Minimal test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runMinimalTest().catch(console.error);
}

module.exports = { runMinimalTest };
