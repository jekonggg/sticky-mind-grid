const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to login page...');
  await page.goto('http://localhost:8080/login');
  
  console.log('Filling login form...');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'password123');
  
  console.log('Submitting login...');
  await page.click('button[type="submit"]');
  
  // Wait for navigation or specific element on the dashboard
  console.log('Waiting for redirection to /boards...');
  try {
    await page.waitForURL('**/boards', { timeout: 15000 });
    console.log('Successfully redirected to /boards');
    
    // Take a screenshot for confirmation
    await page.screenshot({ path: 'login_success.png' });
    console.log('Screenshot saved as login_success.png');
    
    // Check if Boards heading is present
    const heading = await page.textContent('h1');
    console.log('Page Heading:', heading);
  } catch (err) {
    console.error('Redirection failed or took too long:', err.message);
    await page.screenshot({ path: 'login_failed.png' });
    console.log('Screenshot saved as login_failed.png');
    const body = await page.innerHTML('body');
    console.log('Page Body on Failure:', body.substring(0, 500));
  }
  
  await browser.close();
})();
