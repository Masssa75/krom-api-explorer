import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get('network') || 'solana';
  const address = searchParams.get('address');
  
  if (!address) {
    return NextResponse.json({
      success: false,
      error: 'Token address is required'
    }, { status: 400 });
  }
  
  try {
    // Fetch token info from GeckoTerminal
    const url = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address}`;
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
        error: 'Token not found'
      }, { status: 404 });
    }
    
    const token = data.data;
    const attributes = token.attributes;
    
    return NextResponse.json({
      success: true,
      data: {
        id: token.id,
        address: attributes.address,
        name: attributes.name,
        symbol: attributes.symbol,
        network: network,
        decimals: attributes.decimals,
        total_supply: attributes.total_supply,
        coingecko_coin_id: attributes.coingecko_coin_id,
        image_url: attributes.image_url,
        websites: attributes.websites,
        description: attributes.description,
        gt_score: attributes.gt_score,
        metadata_updated_at: attributes.metadata_updated_at
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}