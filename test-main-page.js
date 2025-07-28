const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Page error:', error.message));
  
  try {
    console.log('Testing main page first...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app/', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(2000);
    
    // Check if main page loads
    const title = await page.textContent('h1');
    console.log(`Main page title: ${title}`);
    
    // Try to navigate to new tokens
    console.log('\nNavigating to new tokens page...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app/new-tokens', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(3000);
    
    // Check page state
    const pageTitle = await page.textContent('h1').catch(() => 'No title found');
    console.log(`New tokens page title: ${pageTitle}`);
    
    // Check for any error elements
    const errorText = await page.textContent('body').catch(() => 'Could not read body');
    if (errorText.includes('Application error')) {
      console.log('Found application error on page');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    
  } catch (error) {
    console.error('Test error:', error);
  }
  
  // Keep browser open for manual inspection
  console.log('\nKeeping browser open for 30 seconds...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})();