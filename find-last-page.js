async function findLastPage() {
  console.log('Finding the last page with data...\n');
  
  // Binary search for the last page
  let low = 1;
  let high = 50;
  let lastPageWithData = 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=${mid}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        console.log(`Page ${mid}: Has ${data.data.length} pools`);
        lastPageWithData = mid;
        low = mid + 1;
      } else {
        console.log(`Page ${mid}: No data`);
        high = mid - 1;
      }
      
      await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
    } catch (error) {
      console.error(`Error on page ${mid}:`, error.message);
      break;
    }
  }
  
  console.log(`\nLast page with data: ${lastPageWithData}`);
  
  // Now check the age of pools on the last page
  const lastUrl = `https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=${lastPageWithData}`;
  const lastResponse = await fetch(lastUrl);
  const lastData = await lastResponse.json();
  
  if (lastData.data && lastData.data.length > 0) {
    const now = new Date();
    const oldestPool = lastData.data[lastData.data.length - 1];
    const oldestAge = (now - new Date(oldestPool.attributes.pool_created_at)) / (1000 * 60 * 60);
    
    console.log(`\nOldest pool on last page:`);
    console.log(`Name: ${oldestPool.attributes.name}`);
    console.log(`Age: ${oldestAge.toFixed(1)} hours`);
    console.log(`Created: ${oldestPool.attributes.pool_created_at}`);
  }
}

findLastPage().catch(console.error);