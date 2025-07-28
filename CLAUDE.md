# KROM API Explorer Documentation

## Overview
A Next.js application for exploring external crypto APIs to discover new tokens and analyze their social presence. Features real-time X/Twitter analysis and new token discovery from GeckoTerminal.

**Live URL**: https://majestic-centaur-0d5fcc.netlify.app  
**GitHub**: https://github.com/Masssa75/krom-api-explorer

## Key Features

### 1. Main Explorer Page (/)
- **Trending Tokens**: Fetches trending tokens from GeckoTerminal
- **Standalone X Analysis**: Analyze any token's Twitter/X presence without database storage
- **Manual Import**: Save selected tokens to Supabase for further processing

### 2. New Token Discovery Page (/new-tokens)
- **Real-time New Pools**: Shows tokens created in the last 1-48 hours
- **Quality Scoring**: Custom algorithm (0-100) based on:
  - Volume (30 points max)
  - Unique buyers (25 points max)
  - Liquidity depth (20 points max)
  - Price performance (15 points max)
  - Age bonus for ultra-fresh tokens (10 points max)
- **Pagination**: Browse through hundreds of new tokens
- **Advanced Filters**:
  - Network: Solana, Ethereum, Base, Polygon, Avalanche, BSC
  - Age: 1h, 6h, 12h, 24h, 48h
  - Min Volume: $0 to $100K+
  - Min Liquidity: $0 to $100K+
  - Min Buyers: 0 to 100+
- **Sorting Options**: Age, Quality Score, Volume, Buyers, Liquidity, Price Change, FDV
- **Integrated X Analysis**: Analyze social presence for any token
- **Auto-refresh**: Optional 30-second refresh

### 3. Standalone X Analysis
- **AI Model**: Kimi K2 via OpenRouter (60-second timeout configured)
- **No Database**: Pure real-time analysis
- **Scoring**: 1-10 scale with color-coded badges
- **Analysis Includes**:
  - Tweet count and quality assessment
  - Token type detection (meme/utility)
  - Legitimacy factor (Low/Medium/High)
  - Best tweet extraction
  - Detailed reasoning

## Tech Stack
- **Framework**: Next.js 15.4.4 with App Router
- **Deployment**: Netlify with 60-second function timeout
- **APIs**: 
  - GeckoTerminal (token data)
  - ScraperAPI + Nitter (X/Twitter data)
  - OpenRouter/Kimi K2 (AI analysis)
- **Styling**: Tailwind CSS

## Environment Variables
Required in Netlify:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SCRAPERAPI_KEY`
- `OPEN_ROUTER_API_KEY` (for Kimi K2 access)

## API Endpoints

### GeckoTerminal Integration
- `GET /api/geckoterminal/trending` - Fetch trending pools
- `GET /api/geckoterminal/new-pools` - Fetch newly created pools with filters
- `GET /api/geckoterminal/token-info` - Get token metadata
- `POST /api/geckoterminal/process-trending` - Save tokens to database

### X Analysis
- `POST /api/x-analyze-standalone` - Analyze token's X/Twitter presence
  - Input: `{ contract_address, symbol, network }`
  - Output: Score, tier, token type, tweet analysis

## Quality Score Algorithm
```javascript
function calculateQualityScore(attributes, ageHours) {
  let score = 0;
  
  // Volume (0-30 points)
  if (volume24h > 100000) score += 30;
  else if (volume24h > 50000) score += 25;
  // ... scaled down to 5 points for >$1K
  
  // Buyers (0-25 points)
  if (buyers24h > 100) score += 25;
  else if (buyers24h > 50) score += 20;
  // ... scaled down to 5 points for >5 buyers
  
  // Liquidity (0-20 points)
  if (reserveUsd > 100000) score += 20;
  else if (reserveUsd > 50000) score += 15;
  // ... scaled down to 5 points for >$10K
  
  // Price Change (0-15 points)
  if (priceChange24h > 100) score += 15;
  else if (priceChange24h > 50) score += 10;
  // ... scaled down to 2 points for positive
  
  // Age Bonus (0-10 points)
  if (ageHours < 1) score += 10;
  else if (ageHours < 6) score += 8;
  // ... scaled down to 4 points for <24h
  
  return Math.round(score);
}
```

## Usage Tips

### Finding Quality New Tokens
1. **Ultra-fresh High Volume**: Age < 1h, Min Volume $10K+
2. **Quality Gems**: Age < 24h, Min Volume $25K+, Sort by Quality Score
3. **Pump Candidates**: Age < 6h, Sort by Price Change %

### X Analysis Interpretation
- **7-10 Score**: Strong community, real engagement, potential gem
- **5-6 Score**: Moderate activity, worth monitoring
- **1-4 Score**: Low/fake engagement, likely scam or low quality

## Recent Updates (July 28, 2025)
- ✅ Fixed Kimi K2 authentication issues
- ✅ Increased Netlify function timeout to 60 seconds
- ✅ Added pagination for browsing hundreds of tokens
- ✅ Integrated X analysis button in new tokens table
- ✅ Removed default filters to show all tokens
- ✅ Added informative notes about data volume
- ✅ Implemented multi-page fetching for global sorting (up to 10K tokens)
- ✅ Fixed client-side errors preventing page load
- ⚠️ X analysis currently failing - investigating API issues

## Known Limitations
- X analysis takes 15-25 seconds due to web scraping
- GeckoTerminal API only shows most recent ~200 pools (about 10 minutes of data)
- Cannot fetch historical data beyond what's currently in the API
- Estimated 25,000+ tokens launched on Solana daily (based on extrapolation)
- Some networks have fewer new tokens than others

## Development

```bash
# Install dependencies
npm install

# Run locally (port 3000 or 3001)
npm run dev

# Build
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## Deployment Notes
- Netlify functions configured with 60-second timeout
- Automatic deployments on git push to main branch
- Environment variables must be set in Netlify dashboard

---
**Last Updated**: July 28, 2025  
**Version**: 2.0.0 - Full X Analysis Integration