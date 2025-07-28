import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, any> = {};
  
  // Test various GeckoTerminal endpoints
  const endpoints = [
    'networks',
    'networks/trending',
    'networks/ethereum/trending_pools',
    'networks/solana/trending_pools',
    'networks/new_pools',
    'search/pools?query=PEPE',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`https://api.geckoterminal.com/api/v2/${endpoint}`);
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