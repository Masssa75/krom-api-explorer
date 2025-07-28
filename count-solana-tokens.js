async function countSolanaTokens24h() {
  console.log('Counting all Solana tokens launched in the last 24 hours...\n');
  
  let totalTokens = 0;
  let page = 1;
  let hasMore = true;
  const seenTokens = new Set();
  
  while (hasMore && page <= 100) { // Reasonable limit
    try {
      const url = `https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=${page}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        hasMore = false;
        break;
      }
      
      // Filter tokens created in last 24h
      const now = new Date();
      const cutoff = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      let pageCount = 0;
      
      let foundOldToken = false;
      
      for (const pool of data.data) {
        const createdAt = new Date(pool.attributes.pool_created_at);
        if (createdAt < cutoff) {
          foundOldToken = true;
          continue; // Skip this one but check others
        }
        
        // Track unique tokens (not pools)
        const tokenAddress = pool.relationships.base_token.data.id.split('_')[1];
        if (!seenTokens.has(tokenAddress)) {
          seenTokens.add(tokenAddress);
          pageCount++;
        }
      }
      
      // Only stop if ALL tokens on the page are older than 24h
      if (foundOldToken && pageCount === 0) {
        console.log('All tokens on this page are older than 24h, stopping...');
        hasMore = false;
      }
      
      totalTokens = seenTokens.size;
      
      console.log(`Page ${page}: ${pageCount} new tokens on this page, ${totalTokens} total unique tokens`);
      
      if (pageCount === 0 && hasMore) {
        console.log('No new tokens from last 24h on this page, but checking next page...');
      }
      
      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error on page ${page}:`, error.message);
      break;
    }
  }
  
  console.log('\n=== FINAL RESULTS ===');
  console.log(`Total unique tokens launched on Solana in last 24h: ${totalTokens}`);
  console.log(`Pages scanned: ${page - 1}`);
  console.log(`\nNote: This counts unique token contracts, not liquidity pools.`);
  console.log(`Many tokens may have multiple pools on different DEXes.`);
}

countSolanaTokens24h().catch(console.error);