# 🧪 Local Testing Guide

**Created by Manoj Dhiman (https://manojdhiman.me/)**

This guide explains how to test the Local Business Data Extractor locally before publishing to the Apify store.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Simple Test (Recommended First)
```bash
npm run test:simple
```

### 3. Run Full Test (Optional)
```bash
npm run test:local
```

## 📋 Test Configurations

### Test Input Files

1. **`test-input.json`** - Full test with all platforms
   ```json
   {
     "keywords": ["plumber", "electrician"],
     "locations": ["New York", "Los Angeles"],
     "maxResultsPerSource": 10,
     "includeFacebook": true,
     "includeYelp": true,
     "includeGoogleMaps": true
   }
   ```

2. **`test-minimal.json`** - Minimal test (Google Maps + Yelp only)
   ```json
   {
     "keywords": ["coffee shop"],
     "locations": ["San Francisco"],
     "maxResultsPerSource": 5,
     "includeFacebook": false,
     "includeYelp": true,
     "includeGoogleMaps": true
   }
   ```

## 🔧 Available Test Commands

### Basic Testing
```bash
# Simple test (recommended first - fastest)
npm run test:simple

# Minimal test (core functionality)
npm run test:minimal

# Test only deduplication logic
npm run test:single

# Full local test with browser visible
npm run test:local

# Headless test (no browser window)
npm run test:headless
```

### Custom Test Input
```bash
# Use custom input file
cp your-input.json test-input.json
npm run test:local
```

## 🐛 Debugging Tips

### 1. Enable Verbose Logging
The test script shows detailed logs including:
- Input parameters
- Scraping progress
- Data extraction results
- Error messages
- Final output

### 2. Browser Debugging
By default, the test runs with `headless: false` so you can see the browser:
- Watch the scraping process
- Debug selector issues
- Monitor network requests

### 3. Check Output
The test will display:
- Number of businesses found per source
- Deduplication results
- Final merged data
- Any errors encountered

## 🔍 Testing Different Scenarios

### Test Individual Platforms
```bash
# Google Maps only
echo '{"keywords":["restaurant"],"locations":["Chicago"],"maxResultsPerSource":5,"includeFacebook":false,"includeYelp":false,"includeGoogleMaps":true}' > test-input.json
npm run test:local

# Yelp only
echo '{"keywords":["restaurant"],"locations":["Chicago"],"maxResultsPerSource":5,"includeFacebook":false,"includeYelp":true,"includeGoogleMaps":false}' > test-input.json
npm run test:local

# Facebook only
echo '{"keywords":["restaurant"],"locations":["Chicago"],"maxResultsPerSource":5,"includeFacebook":true,"includeYelp":false,"includeGoogleMaps":false}' > test-input.json
npm run test:local
```

### Test Different Locations
```bash
# International locations
echo '{"keywords":["cafe"],"locations":["London","Paris"],"maxResultsPerSource":3}' > test-input.json
npm run test:local

# Small towns
echo '{"keywords":["grocery"],"locations":["Springfield IL"],"maxResultsPerSource":5}' > test-input.json
npm run test:local
```

## ⚠️ Important Notes

### Rate Limiting
- The test includes built-in delays (2-4 seconds between requests)
- Don't run multiple tests simultaneously
- Be respectful of the target websites' terms of service

### Browser Requirements
- Chrome/Chromium must be installed
- Puppeteer will download its own browser if needed
- Ensure stable internet connection

### Data Quality
- Test results may vary based on location and keywords
- Some businesses may not have complete data
- Facebook scraping may be limited due to login requirements

## 🚨 Troubleshooting

### Common Issues

1. **Build Errors**
   ```bash
   # Clean and rebuild
   rm -rf dist/
   npm run build
   ```

2. **Puppeteer Issues**
   ```bash
   # Install Puppeteer with dependencies
   npm install puppeteer --save
   ```

3. **Memory Issues**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=4096 test-local.js
   ```

4. **Network Timeouts**
   - Check internet connection
   - Try different keywords/locations
   - Reduce maxResultsPerSource

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run test:local
```

## 📊 Expected Results

A successful test should show:
- ✅ Input parameters loaded
- ✅ Browser launched
- ✅ Scraping progress for each platform
- ✅ Data extraction results
- ✅ Deduplication process
- ✅ Final merged data
- ✅ No critical errors

## 🔄 Before Publishing

1. **Test All Platforms**: Ensure Google Maps, Yelp, and Facebook work
2. **Test Different Locations**: Try various cities and countries
3. **Test Error Handling**: Use invalid inputs to test error responses
4. **Check Data Quality**: Verify extracted data is accurate and complete
5. **Performance Test**: Ensure reasonable execution time
6. **Memory Test**: Check for memory leaks with larger datasets

## 📞 Support

If you encounter issues:
- Check the console output for error messages
- Verify your test input format
- Ensure all dependencies are installed
- Contact the author at [https://manojdhiman.me/](https://manojdhiman.me/)

---

**Happy Testing! 🎉**
