# KROM API Explorer

A tool for exploring DexScreener and GeckoTerminal APIs to find trending tokens and add them as additional signal sources.

## Manual Token Processing Workflow

### Prerequisites

Add these environment variables in Netlify Dashboard (Site Settings → Environment Variables):
- `SUPABASE_URL` = `https://eucfoommxxvqmmwdbkdv.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (get from main .env file)

### How to Use

1. **Visit the deployed app**: https://majestic-centaur-0d5fcc.netlify.app

2. **Step 1 - Preview**: Click "Fetch Solana Trending Tokens" to see what's trending on GeckoTerminal

3. **Step 2 - Save**: Click "Save New Tokens to Supabase" to store them with `source='geckoterminal'`

4. **Step 3 - Analyze**: Run your existing edge functions:
   - `crypto-x-analyzer-nitter` - Will analyze X/Twitter presence
   - `crypto-analyzer` - Will analyze token quality
   - `crypto-notifier` - Will send Telegram alerts for high scores

### What This Does

- Fetches trending Solana tokens from GeckoTerminal
- Filters out standard tokens (SOL, USDC, etc) and low volume (<$10k)
- Saves new tokens to your `crypto_calls` table
- Reuses all your existing analysis infrastructure

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Next Steps

Once you verify this works manually, you can:
1. Create a cron job to run this automatically
2. Add more sources (DexScreener when we find the right endpoint)
3. Adjust filtering criteria based on results