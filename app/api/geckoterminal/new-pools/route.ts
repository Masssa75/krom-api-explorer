import { NextResponse } from 'next/server';

interface NewPoolsQuery {
  network?: string;
  hours?: number;
  min_volume?: number;
  min_liquidity?: number;
  min_buyers?: number;
  page?: number;
  include_tokens?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const options: NewPoolsQuery = {
    network: searchParams.get('network') || 'solana',
    hours: parseInt(searchParams.get('hours') || '24', 10) || 24,
    min_volume: parseFloat(searchParams.get('min_volume') || '1000') || 1000,
    min_liquidity: parseFloat(searchParams.get('min_liquidity') || '5000') || 5000,
    min_buyers: parseInt(searchParams.get('min_buyers') || '3', 10) || 3,
    page: parseInt(searchParams.get('page') || '1', 10) || 1,
    include_tokens: searchParams.get('include_tokens') === 'true'
  };
  
  try {
    // Fetch new pools from GeckoTerminal
    const url = `https://api.geckoterminal.com/api/v2/networks/${options.network}/new_pools?page=${options.page}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `GeckoTerminal API failed: ${response.status}`
      }, { status: response.status });
    }
    
    const data = await response.json();
    
    if (!data.data) {
      return NextResponse.json({
        success: false,
        error: 'No data returned from GeckoTerminal API'
      }, { status: 500 });
    }
    
    // Filter pools based on criteria
    const now = new Date();
    const hours = options.hours || 24;
    const cutoffTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    interface PoolData {
      id: string;
      attributes: {
        pool_created_at: string;
        volume_usd: { h1: string; h6: string; h24: string };
        reserve_in_usd: string;
        transactions: { 
          h1: { buys: number; sells: number; buyers: number; sellers: number };
          h6: { buys: number; sells: number; buyers: number; sellers: number };
          h24: { buys: number; sells: number; buyers: number; sellers: number };
        };
        base_token_price_usd: string;
        fdv_usd: string;
        market_cap_usd?: string | null;
        address: string;
        name: string;
        price_change_percentage: {
          m5: string;
          m15: string;
          m30: string;
          h1: string;
          h6: string;
          h24: string;
        };
      };
      relationships: {
        base_token: { data: { id: string } };
        quote_token: { data: { id: string } };
        dex: { data: { id: string } };
      };
    }
    
    const filteredPools = data.data.filter((pool: PoolData) => {
      const poolCreated = new Date(pool.attributes.pool_created_at);
      const volume24h = parseFloat(pool.attributes.volume_usd.h24) || 0;
      const reserveUsd = parseFloat(pool.attributes.reserve_in_usd) || 0;
      const buyers24h = pool.attributes.transactions.h24.buyers || 0;
      
      // Filter by age
      if (poolCreated < cutoffTime) return false;
      
      // Filter by volume
      const minVolume = options.min_volume || 0;
      if (volume24h < minVolume) return false;
      
      // Filter by liquidity
      const minLiquidity = options.min_liquidity || 0;
      if (reserveUsd < minLiquidity) return false;
      
      // Filter by buyer activity
      const minBuyers = options.min_buyers || 0;
      if (buyers24h < minBuyers) return false;
      
      return true;
    });
    
    // Enrich data with calculated metrics
    const enrichedPools = filteredPools.map((pool: PoolData) => {
      const attributes = pool.attributes;
      const ageHours = (now.getTime() - new Date(attributes.pool_created_at).getTime()) / (1000 * 60 * 60);
      
      return {
        id: pool.id,
        address: attributes.address,
        name: attributes.name,
        network: options.network,
        dex: pool.relationships.dex.data.id,
        
        // Token info
        base_token_id: pool.relationships.base_token.data.id,
        quote_token_id: pool.relationships.quote_token.data.id,
        base_token_contract: pool.relationships.base_token.data.id.split('_')[1],
        
        // Timing
        pool_created_at: attributes.pool_created_at,
        age_hours: Math.round(ageHours * 10) / 10,
        
        // Pricing
        base_token_price_usd: parseFloat(attributes.base_token_price_usd),
        fdv_usd: parseFloat(attributes.fdv_usd),
        market_cap_usd: attributes.market_cap_usd ? parseFloat(attributes.market_cap_usd) : null,
        
        // Volume metrics
        volume_usd: {
          h1: parseFloat(attributes.volume_usd.h1) || 0,
          h6: parseFloat(attributes.volume_usd.h6) || 0,
          h24: parseFloat(attributes.volume_usd.h24) || 0
        },
        
        // Activity metrics
        transactions: {
          h1: attributes.transactions.h1,
          h6: attributes.transactions.h6,
          h24: attributes.transactions.h24
        },
        
        // Liquidity
        reserve_in_usd: parseFloat(attributes.reserve_in_usd),
        
        // Price performance
        price_change_percentage: attributes.price_change_percentage,
        
        // Quality indicators
        quality_score: calculateQualityScore(attributes, ageHours),
        
        // DEX info
        dex_info: pool.relationships.dex.data
      };
    });
    
    // Sort by quality score
    enrichedPools.sort((a, b) => b.quality_score - a.quality_score);
    
    return NextResponse.json({
      success: true,
      data: enrichedPools,
      filters: options,
      found: filteredPools.length,
      total_fetched: data.data.length,
      timestamp: new Date().toISOString(),
      networks_available: [
        'solana', 'ethereum', 'base', 'polygon_pos', 'avalanche', 
        'bsc', 'arbitrum_nova', 'cronos', 'fantom'
      ]
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

interface PoolAttributes {
  volume_usd: { h1: string; h6: string; h24: string };
  transactions: { 
    h1: { buys: number; sells: number; buyers: number; sellers: number };
    h6: { buys: number; sells: number; buyers: number; sellers: number };
    h24: { buys: number; sells: number; buyers: number; sellers: number };
  };
  reserve_in_usd: string;
  price_change_percentage: {
    m5: string;
    m15: string;
    m30: string;
    h1: string;
    h6: string;
    h24: string;
  };
}

function calculateQualityScore(attributes: PoolAttributes, ageHours: number): number {
  let score = 0;
  
  // Volume score (0-30 points)
  const volume24h = parseFloat(attributes.volume_usd.h24) || 0;
  if (volume24h > 100000) score += 30;
  else if (volume24h > 50000) score += 25;
  else if (volume24h > 20000) score += 20;
  else if (volume24h > 10000) score += 15;
  else if (volume24h > 5000) score += 10;
  else if (volume24h > 1000) score += 5;
  
  // Buyer activity score (0-25 points)
  const buyers24h = attributes.transactions.h24.buyers || 0;
  if (buyers24h > 100) score += 25;
  else if (buyers24h > 50) score += 20;
  else if (buyers24h > 25) score += 15;
  else if (buyers24h > 10) score += 10;
  else if (buyers24h > 5) score += 5;
  
  // Liquidity score (0-20 points)
  const reserveUsd = parseFloat(attributes.reserve_in_usd) || 0;
  if (reserveUsd > 100000) score += 20;
  else if (reserveUsd > 50000) score += 15;
  else if (reserveUsd > 25000) score += 10;
  else if (reserveUsd > 10000) score += 5;
  
  // Price performance score (0-15 points)
  const priceChange24h = parseFloat(attributes.price_change_percentage.h24) || 0;
  if (priceChange24h > 100) score += 15;
  else if (priceChange24h > 50) score += 10;
  else if (priceChange24h > 25) score += 7;
  else if (priceChange24h > 10) score += 5;
  else if (priceChange24h > 0) score += 2;
  
  // Age bonus (0-10 points) - newer is better for discovery
  if (ageHours < 1) score += 10;
  else if (ageHours < 6) score += 8;
  else if (ageHours < 12) score += 6;
  else if (ageHours < 24) score += 4;
  
  return Math.round(score);
}