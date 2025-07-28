const { chromium } = require('playwright');

async function testLabuBon() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console logs
  const logs = [];
  page.on('console', msg => {
    logs.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Capture network responses
  page.on('response', response => {
    if (response.url().includes('x-analyze-standalone')) {
      console.log('API Response:', response.status(), response.url());
    }
  });
  
  try {
    console.log('Navigating to app...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app');
    
    console.log('Fetching trending tokens...');
    await page.click('button:has-text("Fetch Solana Trending Tokens")');
    await page.waitForSelector('table', { timeout: 30000 });
    
    console.log('Looking for LabuBonK token (newer, might have fewer tweets)...');
    const labuRow = await page.locator('tr:has-text("LabuBonK")').first();
    
    if (await labuRow.count() > 0) {
      console.log('Found LabuBonK token, clicking Analyze X...');
      await labuRow.locator('button:has-text("Analyze X")').click();
      
      // Wait for analysis to complete or show error
      await page.waitForTimeout(35000); // Wait 35 seconds
      
      const result = await labuRow.locator('td').last().textContent();
      console.log('Analysis result:', result);
      
      console.log('Console logs from page:', logs);
    } else {
      console.log('LabuBonK token not found, trying any available token...');
      const firstRow = await page.locator('tr').nth(1);
      if (await firstRow.count() > 0) {
        console.log('Clicking first available token...');
        await firstRow.locator('button:has-text("Analyze X")').click();
        await page.waitForTimeout(35000);
        const result = await firstRow.locator('td').last().textContent();
        console.log('Analysis result:', result);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testLabuBon();