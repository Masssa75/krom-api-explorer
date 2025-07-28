async function checkSolanaPools() {
  console.log('Fetching page 1 to check pool ages...\n');
  
  const url = 'https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=1';
  const response = await fetch(url);
  const data = await response.json();
  
  const now = new Date();
  const cutoff24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  const cutoff1h = new Date(now.getTime() - (1 * 60 * 60 * 1000));
  
  console.log(`Current time: ${now.toISOString()}`);
  console.log(`24h ago: ${cutoff24h.toISOString()}`);
  console.log(`\nPools on page 1:`);
  
  data.data.forEach((pool, i) => {
    const createdAt = new Date(pool.attributes.pool_created_at);
    const ageMs = now - createdAt;
    const ageHours = ageMs / (1000 * 60 * 60);
    const token = pool.relationships.base_token.data.id.split('_')[1];
    
    console.log(`${i+1}. ${pool.attributes.name} - Age: ${ageHours.toFixed(1)}h - Token: ${token.substring(0, 8)}...`);
  });
  
  // Check page 50
  console.log('\n\nChecking page 50...');
  const url50 = 'https://api.geckoterminal.com/api/v2/networks/solana/new_pools?page=50';
  const response50 = await fetch(url50);
  const data50 = await response50.json();
  
  if (data50.data && data50.data.length > 0) {
    console.log(`Page 50 has ${data50.data.length} pools`);
    const firstPool = data50.data[0];
    const lastPool = data50.data[data50.data.length - 1];
    
    const firstAge = (now - new Date(firstPool.attributes.pool_created_at)) / (1000 * 60 * 60);
    const lastAge = (now - new Date(lastPool.attributes.pool_created_at)) / (1000 * 60 * 60);
    
    console.log(`First pool age: ${firstAge.toFixed(1)}h`);
    console.log(`Last pool age: ${lastAge.toFixed(1)}h`);
  } else {
    console.log('Page 50 has no data');
  }
}

checkSolanaPools().catch(console.error);