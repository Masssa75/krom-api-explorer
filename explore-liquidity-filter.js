async function exploreLiquidityFilter() {
  console.log('Exploring token counts with different liquidity filters...\n');
  
  const liquidityThresholds = [0, 1000, 5000, 10000, 25000, 50000, 100000];
  
  for (const minLiquidity of liquidityThresholds) {
    const seenTokens = new Set();
    let totalPools = 0;
    
    // Fetch up to 50 pages
    for (let page = 1; page <= 50; page++) {
      try {
        const url = `https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0) break;
        
        for (const pool of data.data) {
          const liquidity = parseFloat(pool.attributes.reserve_in_usd) || 0;
          if (liquidity >= minLiquidity) {
            const tokenAddress = pool.relationships.base_token.data.id.split('_')[1];
            seenTokens.add(tokenAddress);
            totalPools++;
          }
        }
        
        // Stop if we're getting to old data
        const lastPool = data.data[data.data.length - 1];
        const ageHours = (Date.now() - new Date(lastPool.attributes.pool_created_at)) / (1000 * 60 * 60);
        if (ageHours > 1) break; // Stop after 1 hour
        
      } catch (error) {
        break;
      }
    }
    
    console.log(`Min liquidity $${minLiquidity.toLocaleString()}: ${seenTokens.size} unique tokens, ${totalPools} pools`);
  }
  
  // Now let's see if we can get more historical data
  console.log('\n\nChecking how far back we can go...');
  
  let oldestAge = 0;
  let lastPageWithData = 1;
  
  for (let page = 1; page <= 100; page++) {
    try {
      const url = `https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=${page}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) break;
      
      const lastPool = data.data[data.data.length - 1];
      oldestAge = (Date.now() - new Date(lastPool.attributes.pool_created_at)) / (1000 * 60 * 60);
      lastPageWithData = page;
      
      if (page % 10 === 0) {
        console.log(`Page ${page}: Oldest pool is ${oldestAge.toFixed(1)} hours old`);
      }
      
    } catch (error) {
      break;
    }
  }
  
  console.log(`\nLast page with data: ${lastPageWithData}`);
  console.log(`Oldest accessible pool: ${oldestAge.toFixed(1)} hours ago`);
  console.log(`\n⚠️  GeckoTerminal API limitation: Only the most recent pools are accessible.`);
}

exploreLiquidityFilter().catch(console.error);