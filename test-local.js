#!/usr/bin/env node

/**
 * Local Testing Script for Local Business Data Extractor
 * Created by Manoj Dhiman (https://manojdhiman.me/)
 * 
 * This script allows you to test the actor locally before publishing to Apify
 */

const { Actor } = require('apify');
const fs = require('fs');
const path = require('path');

// Import the main function
const { main } = require('./dist/main.js');

async function testLocally() {
  console.log('🧪 Starting Local Test for Local Business Data Extractor');
  console.log('📝 Created by Manoj Dhiman (https://manojdhiman.me/)');
  console.log('=' .repeat(60));

  try {
    // Read test input
    const testInputPath = path.join(__dirname, 'test-input.json');
    if (!fs.existsSync(testInputPath)) {
      console.error('❌ test-input.json not found. Please create it first.');
      process.exit(1);
    }

    const testInput = JSON.parse(fs.readFileSync(testInputPath, 'utf8'));
    console.log('📋 Test Input:', JSON.stringify(testInput, null, 2));
    console.log('');

    // Create a mock actor for testing
    const mockActor = {
      getInput: async () => {
        console.log('Debug: getInput called, returning:', testInput);
        return testInput;
      },
      setValue: async (key, value) => {
        console.log(`💾 Storing ${key}:`, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
      },
      pushData: async (data) => {
        console.log(`📊 Pushing ${data.length} businesses to dataset`);
      },
      log: {
        info: (msg) => console.log(`ℹ️  ${msg}`),
        error: (msg) => console.error(`❌ ${msg}`),
        warning: (msg) => console.warn(`⚠️  ${msg}`),
      },
      sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      launchPuppeteer: async () => {
        console.log('🚀 Launching Puppeteer browser...');
        const puppeteer = require('puppeteer');
        const headless = process.env.HEADLESS === 'true';
        return await puppeteer.launch({
          headless: headless,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }
    };

    // Set the mock actor globally for the main function
    global.actor = mockActor;

    console.log('🚀 Starting actor execution...');
    console.log('Debug: Global actor set:', !!global.actor);
    console.log('Debug: Actor has getInput:', typeof global.actor.getInput);
    console.log('');

    // Run the main function
    await main();

    console.log('');
    console.log('✅ Local test completed successfully!');
    console.log('📊 Check the output above for results');
    console.log('🔍 You can also check the generated files in the project directory');

  } catch (error) {
    console.error('❌ Local test failed:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testLocally().catch(console.error);
}

module.exports = { testLocally };
