import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const network = searchParams.get('network') || 'ethereum';
  
  try {
    const response = await fetch(`https://api.geckoterminal.com/api/v2/networks/${network}/trending_pools`);
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data,
      network,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}