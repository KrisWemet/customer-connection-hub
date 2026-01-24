import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8082';
const SCREENSHOT_DIR = './test-screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const results = {
  passed: [],
  failed: [],
  consoleErrors: []
};

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testFixes() {
  console.log('🔄 Re-testing navigation after fixes...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Capture console errors
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' && !text.includes('Download the React DevTools')) {
      results.consoleErrors.push(text);
      console.log(`   🔴 Console Error: ${text.substring(0, 100)}`);
    }
  });

  page.on('pageerror', error => {
    results.consoleErrors.push(`Page Error: ${error.message}`);
    console.log(`   🔴 Page Error: ${error.message}`);
  });

  try {
    // Load and refresh to get latest code
    console.log('📍 Loading application (fresh)...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('   Refreshing to get latest code...');
    await page.reload({ waitUntil: 'networkidle2', timeout: 10000 });
    await wait(2000);
    console.log('   ✅ Application loaded\n');

    // TEST 1: Settings Link in Sidebar
    console.log('📍 TEST 1: Settings Link in Sidebar');
    const settingsFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const settingsLink = links.find(link => {
        const text = link.textContent.toLowerCase().trim();
        return text === 'settings' || text === 'admin settings' || text.includes('settings');
      });
      return settingsLink ? settingsLink.textContent.trim() : null;
    });

    if (settingsFound) {
      console.log(`   ✅ Found "${settingsFound}" link in sidebar`);

      // Click Settings
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const settingsLink = links.find(link => {
          const text = link.textContent.toLowerCase().trim();
          return text === 'settings' || text === 'admin settings' || text.includes('settings');
        });
        if (settingsLink) settingsLink.click();
      });

      await wait(2000);
      const settingsUrl = page.url();

      if (settingsUrl.includes('/admin/settings') || settingsUrl.includes('/settings')) {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fix-1-settings-page.png') });
        results.passed.push('✅ Settings link navigates to settings page');
        console.log(`   ✅ Navigated to: ${settingsUrl}`);
        console.log('   📸 Screenshot: fix-1-settings-page.png');
      } else {
        results.failed.push(`❌ Settings link exists but navigates to wrong URL: ${settingsUrl}`);
        console.log(`   ❌ Wrong URL: ${settingsUrl}`);
      }
    } else {
      results.failed.push('❌ Settings link not found in sidebar');
      console.log('   ❌ Settings link not found in sidebar');
    }
    console.log('');

    // TEST 2: Inquiry Card Navigation
    console.log('📍 TEST 2: Inquiry Card Detail Navigation');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 10000 });
    await wait(1000);

    // Navigate to Inquiries
    const inquiriesClicked = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const inquiriesLink = links.find(link =>
        link.textContent.toLowerCase().includes('inquir') ||
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
      const inquiriesUrl = page.url();
      console.log(`   Current URL: ${inquiriesUrl}`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fix-2a-inquiries-page.png') });

      // Click Harper + Luca card
      const cardClicked = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[class*="card"], button, a, div[role="button"], div[class*="cursor"]'));
        const harperCard = cards.find(card =>
          card.textContent.includes('Harper') && card.textContent.includes('Luca')
        );

        if (harperCard) {
          console.log('Found Harper + Luca card, clicking...');
          harperCard.click();
          return true;
        }
        return false;
      });

      if (cardClicked) {
        console.log('   Clicked Harper + Luca card, waiting for navigation...');
        await wait(2500);

        const detailUrl = page.url();
        console.log(`   New URL: ${detailUrl}`);

        if (detailUrl !== inquiriesUrl && (detailUrl.includes('/leads/') || detailUrl.includes('/inquir'))) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fix-2b-inquiry-detail.png') });
          results.passed.push(`✅ Inquiry card navigates to detail view: ${detailUrl}`);
          console.log('   ✅ URL changed - navigation successful!');
          console.log('   📸 Screenshot: fix-2b-inquiry-detail.png');
        } else if (detailUrl === inquiriesUrl) {
          // Check if modal or drawer opened
          const hasModal = await page.evaluate(() => {
            return document.querySelector('[role="dialog"], [class*="modal"], [class*="drawer"], [class*="sheet"]') !== null;
          });

          if (hasModal) {
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'fix-2b-inquiry-detail.png') });
            results.passed.push('✅ Inquiry card opens detail view (modal/drawer)');
            console.log('   ✅ Detail view opened as modal/drawer');
            console.log('   📸 Screenshot: fix-2b-inquiry-detail.png');
          } else {
            results.failed.push('❌ Inquiry card clicked but no navigation or modal appeared');
            console.log('   ❌ No navigation or modal detected');
          }
        } else {
          results.failed.push(`❌ Inquiry card navigated to unexpected URL: ${detailUrl}`);
          console.log(`   ❌ Unexpected URL: ${detailUrl}`);
        }
      } else {
        results.failed.push('❌ Harper + Luca card not found');
        console.log('   ❌ Harper + Luca card not found');
      }
    } else {
      results.failed.push('❌ Could not navigate to Inquiries page');
      console.log('   ❌ Could not navigate to Inquiries page');
    }
    console.log('');

    // TEST 3: Previously Hanging Pages
    console.log('📍 TEST 3: Previously Hanging Pages');
    const testPages = ['Contracts', 'Reports', 'Templates', 'Client Portal'];

    for (const pageName of testPages) {
      try {
        console.log(`   Testing ${pageName}...`);
        await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 8000 });
        await wait(1000);

        const clicked = await page.evaluate((name) => {
          const links = Array.from(document.querySelectorAll('a, button'));
          const link = links.find(l =>
            l.textContent.toLowerCase().trim().includes(name.toLowerCase().trim())
          );
          if (link) {
            link.click();
            return true;
          }
          return false;
        }, pageName);

        if (clicked) {
          // Wait with timeout to see if it hangs
          await Promise.race([
            wait(5000),
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {})
          ]);

          const currentUrl = page.url();
          const hasError = await page.evaluate(() => {
            const bodyText = document.body.textContent.toLowerCase();
            return bodyText.includes('404') ||
                   bodyText.includes('not found') ||
                   bodyText.includes('error');
          });

          if (hasError) {
            results.failed.push(`❌ ${pageName} → Shows error or 404`);
            console.log(`   ❌ ${pageName} shows error/404`);
          } else {
            await page.screenshot({
              path: path.join(SCREENSHOT_DIR, `fix-3-${pageName.toLowerCase().replace(/\s+/g, '-')}.png`)
            });
            results.passed.push(`✅ ${pageName} loads successfully`);
            console.log(`   ✅ ${pageName} loads (${currentUrl})`);
          }
        } else {
          results.failed.push(`❌ ${pageName} link not found`);
          console.log(`   ❌ ${pageName} link not found`);
        }

        await wait(500);
      } catch (error) {
        if (error.message.includes('timeout')) {
          results.failed.push(`❌ ${pageName} → Still hangs (timeout)`);
          console.log(`   ❌ ${pageName} still hangs`);
        } else {
          results.failed.push(`❌ ${pageName} → Error: ${error.message}`);
          console.log(`   ❌ ${pageName} error: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Critical error:', error);
    results.failed.push(`❌ Critical error: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Print final results
  console.log('\n' + '='.repeat(70));
  console.log('📊 FIX VERIFICATION RESULTS');
  console.log('='.repeat(70) + '\n');

  if (results.passed.length > 0) {
    console.log(`✅ PASSED (${results.passed.length} tests):`);
    results.passed.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log(`❌ FAILED (${results.failed.length} tests):`);
    results.failed.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.consoleErrors.length > 0) {
    console.log(`🔴 CONSOLE ERRORS (${results.consoleErrors.length} total):`);
    const uniqueErrors = [...new Set(results.consoleErrors)];
    uniqueErrors.slice(0, 10).forEach(error => {
      console.log(`   ${error.substring(0, 150)}${error.length > 150 ? '...' : ''}`);
    });
    if (uniqueErrors.length > 10) {
      console.log(`   ... and ${uniqueErrors.length - 10} more errors`);
    }
    console.log('');
  } else {
    console.log('✅ NO CONSOLE ERRORS\n');
  }

  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(70));

  // Summary
  const total = results.passed.length + results.failed.length;
  console.log(`\n📈 Summary: ${results.passed.length}/${total} tests passed`);

  if (results.failed.length === 0 && results.consoleErrors.length === 0) {
    console.log('🎉 All fixes verified successfully!\n');
  } else {
    console.log('⚠️  Some issues remain\n');
  }

  // Save JSON results
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'fix-verification-results.json'),
    JSON.stringify(results, null, 2)
  );
}

testFixes().catch(console.error);
