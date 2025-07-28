const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to new tokens page...');
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app/new-tokens', { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of current page
    await page.screenshot({ path: 'new-tokens-page-current.png', fullPage: true });
    console.log('Screenshot saved as new-tokens-page-current.png');
    
    // Check if table exists
    const tableExists = await page.locator('table').count();
    console.log(`Table exists: ${tableExists > 0 ? 'Yes' : 'No'}`);
    
    // Check if any tokens are loaded
    const tokenRows = await page.locator('table tbody tr').count();
    console.log(`Number of token rows: ${tokenRows}`);
    
    // Check if error message is displayed (not quality scores)
    const errorMessage = await page.locator('.bg-red-100.border-red-400').count();
    if (errorMessage > 0) {
      const error = await page.locator('.bg-red-100.border-red-400').textContent();
      console.log(`Error displayed: ${error}`);
    }
    
    // Check if the sort across all pages checkbox is visible
    const sortCheckbox = await page.locator('input[type="checkbox"]').count();
    console.log(`Total checkboxes on page: ${sortCheckbox}`);
    
    const sortText = await page.locator('text="Sort across all pages"').count();
    console.log(`Found "Sort across all pages" text: ${sortText > 0 ? 'Yes' : 'No'}`);
    
    if (sortCheckbox > 0) {
      console.log('✅ Multi-page sorting UI is available!');
      
      // Click the checkbox to enable multi-page sorting
      await page.locator('label:has-text("Sort across all pages")').click();
      console.log('Enabled multi-page sorting');
      
      // Check if the page selector appeared
      const pageSelector = await page.locator('select:near(:text("Fetch up to"))').count();
      if (pageSelector > 0) {
        console.log('✅ Page selector is visible');
        
        // Select 100 pages option
        await page.selectOption('select:near(:text("Fetch up to"))', '100');
        console.log('Selected 100 pages (~2K tokens)');
        
        // Wait for fetching to start
        await page.waitForTimeout(2000);
        
        // Check if fetching indicator is visible
        const fetchingIndicator = await page.locator('text=/Fetching tokens/').count();
        if (fetchingIndicator > 0) {
          console.log('✅ Fetching in progress...');
          
          // Wait for fetching to complete (max 30 seconds)
          await page.waitForSelector('text=/Fetching tokens/', { state: 'hidden', timeout: 30000 }).catch(() => {});
          
          // Check results
          const totalTokens = await page.locator('h3').textContent();
          console.log(`Results: ${totalTokens}`);
          
          // Take screenshot
          await page.screenshot({ path: 'multi-page-sort-results.png', fullPage: true });
          console.log('Screenshot saved as multi-page-sort-results.png');
        }
      }
    } else {
      console.log('❌ Multi-page sorting checkbox not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  await browser.close();
})();