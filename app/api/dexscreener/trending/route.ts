import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/trending');
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}