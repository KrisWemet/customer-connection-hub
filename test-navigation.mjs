import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8082';
const SCREENSHOT_DIR = './test-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const results = {
  working: [],
  broken: [],
  consoleErrors: [],
  warnings: []
};

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testNavigation() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      results.consoleErrors.push(text);
    } else if (type === 'warning') {
      results.warnings.push(text);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    results.consoleErrors.push(`Page Error: ${error.message}`);
  });

  try {
    console.log('🚀 Starting navigation tests...\n');

    // Test 1: Load Dashboard
    console.log('📍 Test 1: Loading Dashboard...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(2000);

    const dashboardLoaded = await page.evaluate(() => {
      return document.body.innerText.length > 0;
    });

    if (dashboardLoaded) {
      results.working.push('✅ Dashboard loads');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png') });
    } else {
      results.broken.push('❌ Dashboard failed to load');
    }

    // Test 2: Navigate to Inquiries
    console.log('📍 Test 2: Navigating to Inquiries...');
    try {
      const inquiriesSelector = 'a[href*="inquiries"], a[href*="leads"], button:has-text("Inquiries"), [data-testid*="inquiries"]';
      await page.waitForSelector('nav, aside, [role="navigation"]', { timeout: 5000 });

      // Try to find and click Inquiries link
      const inquiriesClicked = await page.evaluate(() => {
        // Look for various possible selectors
        const links = Array.from(document.querySelectorAll('a, button'));
        const inquiriesLink = links.find(link =>
          link.textContent.toLowerCase().includes('inquiries') ||
          link.textContent.toLowerCase().includes('leads')
        );

        if (inquiriesLink) {
          inquiriesLink.click();
          return true;
        }
        return false;
      });

      if (inquiriesClicked) {
        await wait(2000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-inquiries.png') });
        results.working.push('✅ Navigate to Inquiries page');

        // Test 3: Click on detail card
        console.log('📍 Test 3: Opening inquiry detail...');
        const detailClicked = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('[class*="card"], button, a'));
          const harperCard = cards.find(card =>
            card.textContent.includes('Harper') ||
            card.textContent.includes('Luca') ||
            card.textContent.includes('Wedding')
          );

          if (harperCard) {
            harperCard.click();
            return true;
          }
          return false;
        });

        if (detailClicked) {
          await wait(2000);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-inquiry-detail.png') });
          results.working.push('✅ Open inquiry detail view');
        } else {
          results.broken.push('❌ Could not find "Harper + Luca Wedding" card');
        }
      } else {
        results.broken.push('❌ Could not find Inquiries link in sidebar');
      }
    } catch (error) {
      results.broken.push(`❌ Inquiries navigation failed: ${error.message}`);
    }

    // Test 4: Test all sidebar navigation items
    console.log('📍 Test 4: Testing all sidebar navigation items...');
    const navItems = [
      'Dashboard',
      'Bookings',
      'Availability',
      'Couples',
      'Vendors',
      'Messages',
      'Packages',
      'Payments',
      'Contracts',
      'Reports',
      'Templates',
      'Client Portal',
      'Settings',
      'Admin Settings'
    ];

    for (const itemName of navItems) {
      try {
        // Go back to home first
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 });
        await wait(1000);

        const clicked = await page.evaluate((name) => {
          const links = Array.from(document.querySelectorAll('a, button'));
          const link = links.find(l => {
            const text = l.textContent.toLowerCase().trim();
            const searchName = name.toLowerCase();
            return text === searchName || text.includes(searchName);
          });

          if (link) {
            link.click();
            return true;
          }
          return false;
        }, itemName);

        if (clicked) {
          await wait(2000);

          // Check if we navigated or got an error
          const currentUrl = page.url();
          const hasContent = await page.evaluate(() => document.body.innerText.length > 100);

          if (hasContent) {
            results.working.push(`✅ Navigate to ${itemName}`);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `nav-${itemName.toLowerCase().replace(/\s+/g, '-')}.png`) });
          } else {
            results.broken.push(`❌ ${itemName} page appears empty or broken`);
          }
        } else {
          results.warnings.push(`⚠️  ${itemName} link not found in sidebar`);
        }
      } catch (error) {
        results.broken.push(`❌ ${itemName} navigation error: ${error.message}`);
      }
    }

  } catch (error) {
    results.broken.push(`❌ Critical error: ${error.message}`);
    console.error('Error during testing:', error);
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 NAVIGATION TEST RESULTS');
  console.log('='.repeat(60) + '\n');

  if (results.working.length > 0) {
    console.log('✅ WORKING:');
    results.working.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.broken.length > 0) {
    console.log('❌ BROKEN:');
    results.broken.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    results.warnings.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.consoleErrors.length > 0) {
    console.log('🔴 CONSOLE ERRORS:');
    results.consoleErrors.slice(0, 10).forEach(error => console.log(`   ${error}`));
    if (results.consoleErrors.length > 10) {
      console.log(`   ... and ${results.consoleErrors.length - 10} more errors`);
    }
    console.log('');
  }

  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(60));

  // Save detailed results to file
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );
}

testNavigation().catch(console.error);
