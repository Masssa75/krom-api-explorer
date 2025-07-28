const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to new tokens page...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app/new-tokens', { waitUntil: 'networkidle' });
    
    // Wait for tokens to load
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Check if Analyze X buttons are visible
    const analyzeButtons = await page.locator('button:has-text("Analyze X")').count();
    console.log(`Found ${analyzeButtons} Analyze X buttons`);
    
    if (analyzeButtons > 0) {
      console.log('✅ X Analysis buttons are now visible on the new tokens page!');
      
      // Take a screenshot
      await page.screenshot({ path: 'new-tokens-with-x-button.png' });
      console.log('Screenshot saved as new-tokens-with-x-button.png');
      
      // Try clicking the first button
      await page.locator('button:has-text("Analyze X")').first().click();
      console.log('Clicked first Analyze X button, waiting for analysis...');
      
      // Wait for analysis to appear
      await page.waitForSelector('span:has-text("Analyzing X...")', { timeout: 5000 }).catch(() => {});
      
      // Wait a bit more for the result
      await page.waitForTimeout(15000);
      
      // Check if any X scores appeared
      const xScores = await page.locator('span:has-text("X:")').count();
      if (xScores > 0) {
        console.log('✅ X Analysis completed successfully!');
        await page.screenshot({ path: 'new-tokens-x-analysis-complete.png' });
      }
    } else {
      console.log('❌ No Analyze X buttons found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();