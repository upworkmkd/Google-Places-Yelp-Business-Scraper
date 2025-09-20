# Local Business Data Extractor (Google + Yelp + FB)

A comprehensive Apify Actor that extracts and merges local business data from Google Maps, Yelp, and Facebook Pages. This actor provides enriched business information including contact details, ratings, reviews, and social profiles with intelligent deduplication across platforms.

## 🚀 Features

- **Multi-Platform Scraping**: Extracts data from Google Maps, Yelp, and Facebook Business Pages
- **Intelligent Deduplication**: Automatically identifies and merges duplicate businesses across platforms
- **Rich Data Extraction**: 
  - Business name, category, and address
  - Phone numbers and websites
  - Email addresses (when available)
  - Opening hours
  - Ratings and review counts from each platform
  - Social media profiles
  - Business status (open/closed/temporarily closed)
- **Rate Limiting**: Built-in delays to avoid being blocked
- **Error Handling**: Comprehensive error logging and recovery
- **TypeScript**: Fully typed for better development experience

## 📋 Input Schema

```json
{
  "keywords": ["plumber", "electrician"],
  "locations": ["New York", "Los Angeles"],
  "maxResultsPerSource": 50,
  "includeFacebook": true,
  "includeYelp": true,
  "includeGoogleMaps": true
}
```

### Input Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `keywords` | string[] | Yes | - | Array of business types/keywords to search for |
| `locations` | string[] | Yes | - | Array of locations to search in |
| `maxResultsPerSource` | number | No | 50 | Maximum results per source (1-200) |
| `includeFacebook` | boolean | No | true | Whether to include Facebook scraping |
| `includeYelp` | boolean | No | true | Whether to include Yelp scraping |
| `includeGoogleMaps` | boolean | No | true | Whether to include Google Maps scraping |

## 📤 Output Format

The actor returns a JSON object with the following structure:

```json
{
  "success": true,
  "totalBusinesses": 45,
  "businesses": [
    {
      "id": "merged_1703123456789_abc123def",
      "name": "ABC Plumbing Services",
      "category": "Plumber",
      "address": "123 Main St, New York, NY 10001",
      "phone": "+1-555-123-4567",
      "website": "https://abcplumbing.com",
      "email": "info@abcplumbing.com",
      "openingHours": {
        "monday": "8:00 AM - 6:00 PM",
        "tuesday": "8:00 AM - 6:00 PM",
        "wednesday": "8:00 AM - 6:00 PM",
        "thursday": "8:00 AM - 6:00 PM",
        "friday": "8:00 AM - 6:00 PM",
        "saturday": "9:00 AM - 4:00 PM",
        "sunday": "Closed"
      },
      "googleMaps": {
        "rating": 4.5,
        "reviewsCount": 127,
        "placeId": "ChIJd8BlQ2BZwokRAFQEcDlJRAI"
      },
      "yelp": {
        "rating": 4.3,
        "reviewsCount": 89,
        "yelpId": "abc-plumbing-services-new-york"
      },
      "facebook": {
        "pageUrl": "https://facebook.com/abcplumbingny",
        "pageId": "abcplumbingny",
        "verified": true
      },
      "socialProfiles": {
        "instagram": "https://instagram.com/abcplumbingny",
        "twitter": "https://twitter.com/abcplumbingny"
      },
      "businessStatus": "open",
      "source": "merged",
      "lastUpdated": "2024-01-15T10:30:00.000Z",
      "confidence": 0.95
    }
  ],
  "errors": [],
  "summary": {
    "googleMaps": 25,
    "yelp": 20,
    "facebook": 15,
    "merged": 30,
    "unique": 15
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 18+ 
- Apify CLI (for deployment)
- TypeScript (for development)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd apify_places_scrapper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run locally**
   ```bash
   npm start
   ```

### Apify Deployment

1. **Install Apify CLI**
   ```bash
   npm install -g @apify/cli
   ```

2. **Login to Apify**
   ```bash
   apify login
   ```

3. **Deploy the actor**
   ```bash
   apify push
   ```

## 🔧 Configuration

### Environment Variables

No environment variables are required for basic operation. The actor uses default settings for rate limiting and user agents.

### Rate Limiting

The actor includes built-in rate limiting:
- Google Maps: 2-second delay between searches
- Yelp: 3-second delay between searches  
- Facebook: 4-second delay between searches

### User Agents

The actor uses realistic user agents to avoid detection:
```
Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
```

## 📊 Data Quality & Confidence Scoring

Each business record includes a confidence score (0-1) based on:
- **Name presence**: 0.3 points
- **Address presence**: 0.3 points  
- **Phone number**: 0.2 points
- **Website**: 0.1 points
- **Rating data**: 0.1 points

## 🔄 Deduplication Logic

The actor uses intelligent matching to identify duplicate businesses:

1. **Exact name match**: 0.4 confidence
2. **Fuzzy name matching**: Up to 0.3 confidence (using Fuse.js)
3. **Address similarity**: Up to 0.3 confidence
4. **Phone number match**: 0.3 confidence
5. **Website match**: 0.4 confidence

Businesses with a combined confidence score > 0.7 are considered matches and merged.

## 🚨 Error Handling

The actor includes comprehensive error handling:
- Individual scraper failures don't stop the entire process
- All errors are logged and included in the output
- Graceful degradation when platforms are unavailable
- Retry logic for transient failures

## 💰 Pricing Suggestions

### Free Tier
- Up to 100 results per run
- Basic data fields only
- Standard rate limiting

### Pro Tier  
- Up to 500 results per run
- All data fields including social profiles
- Faster processing with optimized rate limiting
- Priority support

### Enterprise Tier
- Unlimited results
- Custom data fields
- Dedicated infrastructure
- White-label options

## 👨‍💻 Author

**Manoj Dhiman** - AI & Full Stack Software Engineer
- 🌐 Website: [https://manojdhiman.me/](https://manojdhiman.me/)
- 💼 Specializing in AI-powered applications, machine learning, and intelligent automation
- 🚀 8+ years of experience in full-stack development and AI solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Contact support through Apify platform
- Check the documentation for common solutions
- Reach out to the author at [https://manojdhiman.me/](https://manojdhiman.me/)

## 🔄 Changelog

### v0.1.0
- Initial release
- Google Maps, Yelp, and Facebook scraping
- Intelligent deduplication
- Comprehensive data extraction
- TypeScript implementation