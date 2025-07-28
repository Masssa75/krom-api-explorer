// Verify the exact API key from .env works
async function verifyAPIKey() {
  const API_KEY = "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";
  
  console.log('Testing with API key:', API_KEY.substring(0, 20) + '...');
  
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
            content: 'You are a helpful assistant.'
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
    
    if (response.ok) {
      const data = await response.json();
      console.log('SUCCESS! Response:', data);
    } else {
      const errorText = await response.text();
      console.log('ERROR:', errorText);
    }
    
  } catch (error) {
    console.error('Request failed:', error);
  }
}

verifyAPIKey();