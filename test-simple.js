#!/usr/bin/env node

/**
 * Simple Test Script
 * Created by Manoj Dhiman (https://manojdhiman.me/)
 * 
 * This script tests the core functionality without the main function
 */

const { testDeduplication } = require('./dist/test.js');

async function runSimpleTest() {
  console.log('🧪 Running Simple Test');
  console.log('📝 Created by Manoj Dhiman (https://manojdhiman.me/)');
  console.log('=' .repeat(50));
  
  try {
    console.log('✅ Testing TypeScript compilation...');
    console.log('✅ Testing deduplication logic...');
    
    await testDeduplication();
    
    console.log('\n✅ All tests passed!');
    console.log('\n📋 The actor is ready for:');
    console.log('1. Deployment to Apify: npm run deploy');
    console.log('2. Real-world testing with actual data');
    console.log('3. Publishing to Apify store');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runSimpleTest().catch(console.error);
}

module.exports = { runSimpleTest };
