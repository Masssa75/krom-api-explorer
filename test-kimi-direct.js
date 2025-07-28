const { chromium } = require('playwright');

async function testKimiDirect() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('Testing Kimi K2 API directly...');
    
    // Call the test endpoint
    const response = await page.evaluate(async () => {
      const response = await fetch('/api/test-kimi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_message: 'Hello from test' })
      });
      
      return {
        status: response.status,
        data: await response.json()
      };
    });
    
    console.log('Test API Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// First navigate to the site
async function runTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://majestic-centaur-0d5fcc.netlify.app');
    
    const response = await page.evaluate(async () => {
      const response = await fetch('/api/test-kimi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_message: 'Hello from test' })
      });
      
      return {
        status: response.status,
        data: await response.json()
      };
    });
    
    console.log('Test API Response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

runTest();