const { chromium } = require('playwright');

async function testXAnalysis() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to app...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app');
    
    console.log('Fetching trending tokens...');
    await page.click('button:has-text("Fetch Solana Trending Tokens")');
    await page.waitForSelector('table', { timeout: 30000 });
    
    console.log('Looking for PENGU token...');
    const penguRow = await page.locator('tr:has-text("PENGU")').first();
    
    if (await penguRow.count() > 0) {
      console.log('Found PENGU token, clicking Analyze X...');
      await penguRow.locator('button:has-text("Analyze X")').click();
      
      // Wait for analysis to complete or show error
      await page.waitForTimeout(30000); // Wait 30 seconds
      
      const result = await penguRow.locator('td').last().textContent();
      console.log('Analysis result:', result);
      
      // Check for error messages in console
      const logs = [];
      page.on('console', msg => logs.push(msg.text()));
      
      console.log('Console logs:', logs);
    } else {
      console.log('PENGU token not found in trending list');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testXAnalysis();