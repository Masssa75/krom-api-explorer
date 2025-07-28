async function testAPI() {
  console.log('Testing GeckoTerminal API directly...\n');
  
  try {
    // Test the API endpoint directly
    const url = 'https://majestic-centaur-0d5fcc.netlify.app/api/geckoterminal/new-pools?network=solana&hours=24&min_volume=0&min_liquidity=0&min_buyers=0&page=1';
    
    console.log('Fetching:', url);
    const response = await fetch(url);
    console.log('Status:', response.status);
    
    const data = await response.json();
    
    if (data.success) {
      console.log('\n✅ API is working!');
      console.log(`Found ${data.data.length} tokens`);
      console.log(`Total fetched: ${data.total_fetched}`);
      
      if (data.data.length > 0) {
        console.log('\nFirst token:');
        console.log(`- Name: ${data.data[0].name}`);
        console.log(`- Quality Score: ${data.data[0].quality_score}`);
        console.log(`- Age: ${data.data[0].age_hours}h`);
      }
    } else {
      console.log('❌ API returned error:', data.error);
    }
  } catch (error) {
    console.error('❌ Error calling API:', error);
  }
}

testAPI();