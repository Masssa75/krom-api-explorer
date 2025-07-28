// Test the API directly to debug the issue
async function testKimiAPI() {
  const API_KEY = "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";
  
  console.log('Testing Kimi K2 API directly...');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2',
        messages: [
          {
            role: 'system',
            content: 'You are a test assistant.'
          },
          {
            role: 'user',
            content: 'Say hello world'
          }
        ],
        temperature: 0,
        max_tokens: 100
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('API test failed:', error);
  }
}

testKimiAPI();