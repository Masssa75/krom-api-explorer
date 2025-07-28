# KROM API Explorer Documentation

## Overview
A Next.js application for exploring external crypto APIs (DexScreener, GeckoTerminal) to identify trending tokens and add them as additional signal sources to the KROM analysis ecosystem.

**Live URL**: https://majestic-centaur-0d5fcc.netlify.app  
**GitHub**: https://github.com/Masssa75/krom-api-explorer

## Purpose
This app enables manual discovery and import of trending tokens from external sources into the KROM ecosystem. Once imported, these tokens are processed by the same analysis pipeline as KROM calls.

## Key Features
- **API Testing**: Explore DexScreener and GeckoTerminal endpoints
- **Token Discovery**: Find trending tokens on various networks
- **Manual Import**: Save selected tokens to Supabase with `source='geckoterminal'`
- **Filtering**: Excludes standard tokens (SOL, USDC) and low-volume tokens (<$10k)

## Tech Stack
- **Framework**: Next.js 15.4.4 with App Router
- **Database**: Supabase (shared with main KROM ecosystem)
- **Deployment**: Netlify
- **APIs**: GeckoTerminal, DexScreener (in progress)

## Environment Variables
Set in Netlify Dashboard:
- `SUPABASE_URL` - Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## API Endpoints

### Testing Endpoints
- `GET /api/test/dexscreener` - Test available DexScreener endpoints
- `GET /api/test/geckoterminal` - Test available GeckoTerminal endpoints

### Data Endpoints
- `GET /api/geckoterminal/trending?network={network}` - Fetch trending pools
- `POST /api/geckoterminal/process-trending` - Save trending tokens to database

## Manual Workflow

1. **Fetch Trending**: Click button to get trending Solana tokens from GeckoTerminal
2. **Preview**: Review discovered tokens (symbol, contract, volume, age)
3. **Save**: Store new tokens to `crypto_calls` table with `source='geckoterminal'`
4. **Analyze**: Run existing edge functions on new tokens

## Database Integration

Tokens are saved to the `crypto_calls` table with:
- `source = 'geckoterminal'` - Identifies the signal source
- `contract_address` - Token contract address
- `network` - Blockchain network (e.g., 'solana')
- `raw_data` - Original API response with metrics
- Standard fields for compatibility with existing analysis

## Current Implementation Status

### Working
- ✅ GeckoTerminal trending pools fetching
- ✅ Token filtering and preview
- ✅ Database storage with proper source attribution
- ✅ Integration with existing analysis pipeline
- ✅ **Standalone X Analysis** - Kimi K2 powered analysis without database storage
  - Uses same AI model and prompt as main KROM analysis app
  - Provides score (1-10), tier (ALPHA/SOLID/BASIC/TRASH), token type (meme/utility), legitimacy factor
  - Real-time analysis with inline results display
  - No database dependencies - purely exploratory

### In Progress
- 🔄 DexScreener API integration (endpoints need investigation)
- 🔄 Automated polling via cron jobs
- 🔄 Additional filtering criteria

## Next Steps
1. Set up automated polling (cron job every 5-15 minutes)
2. Add DexScreener when proper endpoints are found
3. Create dashboard to track performance by source
4. Add more sophisticated filtering (liquidity, holder count, etc.)

## Development

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build
npm run build
```

## Architecture Notes

This app is designed as a lightweight "feeder" for the main KROM ecosystem:
- Discovers tokens from external sources
- Stores them in the standard format
- Existing infrastructure handles analysis and notifications
- No duplicate analysis code needed

## Known Issues
- DexScreener trending endpoint returns errors (need to find correct endpoint)
- GeckoTerminal ETH trending sometimes empty (rate limiting?)

---
**Last Updated**: July 28, 2025  
**Version**: 1.0.0