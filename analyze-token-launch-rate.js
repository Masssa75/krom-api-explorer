async function analyzeTokenLaunchRate() {
  console.log('Analyzing Solana token launch rate from available data...\n');
  
  const allPools = [];
  const tokenMap = new Map(); // Track unique tokens
  
  // Fetch all available pages
  for (let page = 1; page <= 15; page++) {
    try {
      const url = `https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=${page}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) break;
      
      data.data.forEach(pool => {
        allPools.push(pool);
        const tokenAddress = pool.relationships.base_token.data.id.split('_')[1];
        const createdAt = new Date(pool.attributes.pool_created_at);
        
        if (!tokenMap.has(tokenAddress) || createdAt < tokenMap.get(tokenAddress)) {
          tokenMap.set(tokenAddress, createdAt);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error on page ${page}:`, error.message);
      break;
    }
  }
  
  const now = new Date();
  const uniqueTokens = Array.from(tokenMap.entries()).map(([address, createdAt]) => ({
    address,
    createdAt,
    ageMinutes: (now - createdAt) / (1000 * 60)
  }));
  
  uniqueTokens.sort((a, b) => a.createdAt - b.createdAt);
  
  const oldestToken = uniqueTokens[0];
  const newestToken = uniqueTokens[uniqueTokens.length - 1];
  const timeSpanMinutes = oldestToken.ageMinutes;
  
  console.log(`=== RESULTS ===`);
  console.log(`Total pools found: ${allPools.length}`);
  console.log(`Unique tokens: ${uniqueTokens.length}`);
  console.log(`Time span covered: ${timeSpanMinutes.toFixed(1)} minutes`);
  console.log(`Oldest token: ${oldestToken.ageMinutes.toFixed(1)} minutes ago`);
  console.log(`Newest token: ${newestToken.ageMinutes.toFixed(1)} minutes ago`);
  
  // Calculate launch rate
  const tokensPerMinute = uniqueTokens.length / timeSpanMinutes;
  const tokensPerHour = tokensPerMinute * 60;
  const tokensPerDay = tokensPerHour * 24;
  
  console.log(`\n=== LAUNCH RATE ===`);
  console.log(`Tokens per minute: ${tokensPerMinute.toFixed(1)}`);
  console.log(`Tokens per hour: ${Math.round(tokensPerHour)}`);
  console.log(`Estimated tokens per 24h: ${Math.round(tokensPerDay).toLocaleString()}`);
  
  console.log(`\n⚠️  Note: GeckoTerminal's API only shows the most recent ~200 pools.`);
  console.log(`The actual 24h count would require historical data or a different API.`);
  console.log(`Based on the current launch rate, approximately ${Math.round(tokensPerDay).toLocaleString()} tokens`);
  console.log(`are launched on Solana per day, but this is an extrapolation from ${timeSpanMinutes.toFixed(0)} minutes of data.`);
}

analyzeTokenLaunchRate().catch(console.error);