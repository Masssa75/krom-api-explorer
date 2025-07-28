import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface GeckoPool {
  id: string;
  type: string;
  attributes: {
    base_token_price_usd: string;
    address: string;
    name: string;
    pool_created_at: string;
    fdv_usd: string;
    market_cap_usd: string | null;
    volume_usd: {
      h24: string;
    };
    transactions: {
      h24: {
        buys: number;
        sells: number;
      };
    };
  };
  relationships: {
    base_token: {
      data: {
        id: string;
        type: string;
      };
    };
    dex: {
      data: {
        id: string;
        type: string;
      };
    };
  };
}

export async function POST(request: Request) {
  try {
    const { network = 'solana' } = await request.json();
    
    // Fetch trending pools from GeckoTerminal
    const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/${network}/trending_pools`);
    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      return NextResponse.json({ error: 'No trending pools found' }, { status: 404 });
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      tokens: [] as any[]
    };

    // Process each pool
    for (const pool of data.data as GeckoPool[]) {
      try {
        // Extract token info
        const baseTokenId = pool.relationships.base_token.data.id;
        // GeckoTerminal IDs are like "solana_CONTRACT_ADDRESS"
        const contractAddress = baseTokenId.split('_')[1];
        const [tokenSymbol, quoteCurrency] = pool.attributes.name.split(' / ');
        
        // Skip if it's a standard pair token (SOL, USDC, etc)
        if (['SOL', 'USDC', 'USDT', 'ETH', 'BTC'].includes(tokenSymbol)) {
          results.skipped++;
          continue;
        }

        // Check if we already have this token
        const { data: existing } = await supabase
          .from('crypto_calls')
          .select('id, source')
          .eq('contract_address', contractAddress)
          .eq('network', network);

        if (existing && existing.length > 0) {
          results.skipped++;
          continue;
        }

        // Calculate some metrics for filtering
        const volume24h = parseFloat(pool.attributes.volume_usd.h24);
        const createdAt = new Date(pool.attributes.pool_created_at);
        const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        
        // Filter criteria (adjust as needed)
        if (volume24h < 10000) { // Skip low volume
          results.skipped++;
          continue;
        }

        // Create a new entry
        const newCall = {
          id: crypto.randomUUID(),
          source: 'geckoterminal',
          krom_id: null,
          ticker: tokenSymbol,
          contract_address: contractAddress,
          network: network,
          buy_timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          raw_data: {
            source: 'geckoterminal_trending',
            pool,
            metrics: {
              volume_24h: volume24h,
              age_days: ageInDays,
              price_usd: pool.attributes.base_token_price_usd,
              fdv_usd: pool.attributes.fdv_usd,
              transactions_24h: pool.attributes.transactions.h24
            }
          }
        };

        const { error: insertError } = await supabase
          .from('crypto_calls')
          .insert(newCall);

        if (insertError) {
          console.error('Insert error:', insertError);
          results.errors++;
        } else {
          results.processed++;
          results.tokens.push({
            symbol: tokenSymbol,
            contract: contractAddress,
            volume_24h: volume24h,
            age_days: ageInDays.toFixed(1)
          });
        }

      } catch (error) {
        console.error('Error processing pool:', error);
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Processed ${results.processed} new tokens, skipped ${results.skipped}, errors: ${results.errors}`
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}