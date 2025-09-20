#!/usr/bin/env node

/**
 * Deduplication Testing Script
 * Created by Manoj Dhiman (https://manojdhiman.me/)
 * 
 * This script tests only the deduplication logic without web scraping
 */

const { testDeduplication } = require('./dist/test.js');

async function runDeduplicationTest() {
  console.log('🧪 Testing Deduplication Logic');
  console.log('📝 Created by Manoj Dhiman (https://manojdhiman.me/)');
  console.log('=' .repeat(50));
  
  try {
    await testDeduplication();
    console.log('\n✅ Deduplication test completed successfully!');
  } catch (error) {
    console.error('\n❌ Deduplication test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runDeduplicationTest().catch(console.error);
}

module.exports = { runDeduplicationTest };
