import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, any> = {};
  
  // Test various DexScreener endpoints
  const endpoints = [
    'latest/dex/tokens/trending',
    'latest/dex/pairs/new',
    'latest/dex/search?q=PEPE',
    'latest/dex/tokens/ethereum',
    'latest/dex/tokens/solana',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`https://api.dexscreener.com/${endpoint}`);
      const contentType = response.headers.get('content-type');
      
      results[endpoint] = {
        status: response.status,
        statusText: response.statusText,
        contentType,
        hasData: response.status === 200
      };
      
      if (response.status === 200 && contentType?.includes('application/json')) {
        const data = await response.json();
        results[endpoint].sampleData = JSON.stringify(data).slice(0, 200) + '...';
        results[endpoint].dataStructure = Object.keys(data);
      }
    } catch (error) {
      results[endpoint] = {
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  return NextResponse.json(results);
}