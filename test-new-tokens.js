const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Testing main page...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'main-page.png' });
    
    // Check if the "Discover New Tokens" button exists
    const newTokensButton = await page.locator('a:has-text("Discover New Tokens")').first();
    if (await newTokensButton.isVisible()) {
      console.log('✅ Found "Discover New Tokens" button on main page');
      
      // Click it and navigate
      await newTokensButton.click();
      await page.waitForLoadState('networkidle');
      
      console.log('Current URL:', page.url());
      await page.screenshot({ path: 'new-tokens-page.png' });
      
      // Check if we're on the new tokens page
      const pageTitle = await page.locator('h1:has-text("New Token Discovery")').first();
      if (await pageTitle.isVisible()) {
        console.log('✅ Successfully navigated to New Token Discovery page');
      } else {
        console.log('❌ New Token Discovery page did not load properly');
      }
    } else {
      console.log('❌ "Discover New Tokens" button not found on main page');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();