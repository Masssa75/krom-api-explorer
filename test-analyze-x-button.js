const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Testing Analyze X button...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app/new-tokens', { waitUntil: 'networkidle' });
    
    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'new-tokens-page-test.png', fullPage: true });
    console.log('Screenshot saved');
    
    // Check if table exists
    const tableExists = await page.locator('table').count();
    console.log(`Table exists: ${tableExists > 0}`);
    
    if (tableExists === 0) {
      // Check for error messages
      const errorMsg = await page.locator('.bg-red-100').textContent().catch(() => null);
      if (errorMsg) {
        console.log(`Error on page: ${errorMsg}`);
      }
      return;
    }
    
    // Wait for tokens to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {
      console.log('No tokens loaded within 10 seconds');
    });
    
    // Click the first Analyze X button
    const analyzeButton = await page.locator('button:has-text("Analyze X")').first();
    if (await analyzeButton.isVisible()) {
      console.log('Found Analyze X button, clicking...');
      await analyzeButton.click();
      
      // Wait for analysis to start
      await page.waitForSelector('text="Analyzing X..."', { timeout: 5000 });
      console.log('Analysis started!');
      
      // Wait for result (up to 30 seconds)
      await page.waitForSelector('span:has-text("X:")', { timeout: 30000 });
      
      const result = await page.locator('span:has-text("X:")').first().textContent();
      console.log(`✅ Analysis complete: ${result}`);
      
      // Take screenshot
      await page.screenshot({ path: 'x-analysis-result.png' });
      console.log('Screenshot saved as x-analysis-result.png');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();