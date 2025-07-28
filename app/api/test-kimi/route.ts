import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
  try {
    const { test_message = 'Hello world' } = await request.json();
    
    console.log('Testing Kimi K2 API with exact same implementation as working app...');
    console.log('API Key exists:', !!process.env.OPEN_ROUTER_API_KEY);
    console.log('API Key length:', process.env.OPEN_ROUTER_API_KEY?.length);
    
    // Use EXACT same implementation as working app
    const model = 'moonshotai/kimi-k2';
    const maxTokens = 1000;
    
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPEN_ROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: test_message
          }
        ],
        temperature: 0,
        max_tokens: maxTokens
      })
    });
    
    console.log('Response status:', openRouterResponse.status);
    console.log('Response headers:', Object.fromEntries(openRouterResponse.headers.entries()));
    
    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('API Error:', errorText);
      return NextResponse.json({
        success: false,
        error: `API failed: ${openRouterResponse.status} - ${errorText}`
      });
    }
    
    const result = await openRouterResponse.json();
    console.log('Success! Response:', result);
    
    return NextResponse.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}