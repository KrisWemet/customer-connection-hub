import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:8082';
const SCREENSHOT_DIR = './test-screenshots';

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
  console.log('🚀 Starting quick navigation tests...\n');

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
    }
  });

  page.on('pageerror', error => {
    results.consoleErrors.push(`Page Error: ${error.message}`);
  });

  try {
    // Test 1: Load Dashboard
    console.log('📍 Test 1: Loading Dashboard...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
    await wait(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png') });
    results.working.push('✅ Dashboard loads');
    console.log('   ✅ Dashboard loads\n');

    // Get all navigation links
    const navLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      return links
        .map(link => ({
          text: link.textContent.trim(),
          href: link.getAttribute('href'),
          tag: link.tagName
        }))
        .filter(link => link.text.length > 0 && link.text.length < 50);
    });

    console.log('📋 Found navigation items:', navLinks.filter(l => l.href).map(l => l.text).join(', '));
    console.log('');

    // Test 2: Navigate to Inquiries/Leads
    console.log('📍 Test 2: Navigating to Inquiries...');
    const inquiriesFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const inquiriesLink = links.find(link =>
        link.textContent.toLowerCase().includes('inquir') ||
        link.textContent.toLowerCase().includes('leads')
      );

      if (inquiriesLink) {
        inquiriesLink.click();
        return inquiriesLink.textContent.trim();
      }
      return null;
    });

    if (inquiriesFound) {
      await wait(1500);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-inquiries.png') });
      results.working.push(`✅ Navigate to ${inquiriesFound}`);
      console.log(`   ✅ Navigate to ${inquiriesFound}\n`);

      // Test 3: Try to open detail
      console.log('📍 Test 3: Looking for Harper + Luca card...');
      const cardFound = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[class*="card"], button, a, div[role="button"]'));
        const harperCard = cards.find(card =>
          card.textContent.includes('Harper') ||
          card.textContent.includes('Luca')
        );

        if (harperCard) {
          harperCard.click();
          return true;
        }
        return false;
      });

      if (cardFound) {
        await wait(1500);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-inquiry-detail.png') });
        results.working.push('✅ Open Harper + Luca detail view');
        console.log('   ✅ Open Harper + Luca detail view\n');
      } else {
        results.broken.push('❌ Harper + Luca card not found');
        console.log('   ❌ Harper + Luca card not found\n');
      }
    } else {
      results.broken.push('❌ Inquiries link not found');
      console.log('   ❌ Inquiries link not found\n');
    }

    // Test sidebar items quickly
    console.log('📍 Test 4: Quick sidebar navigation test...');
    const navItems = [
      'Dashboard', 'Bookings', 'Availability', 'Couples', 'Vendors',
      'Messages', 'Packages', 'Payments', 'Contracts', 'Reports',
      'Templates', 'Client Portal', 'Settings', 'Admin'
    ];

    for (const itemName of navItems) {
      try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await wait(500);

        const found = await page.evaluate((name) => {
          const links = Array.from(document.querySelectorAll('a, button'));
          return links.some(l => {
            const text = l.textContent.toLowerCase();
            return text.includes(name.toLowerCase());
          });
        }, itemName);

        if (found) {
          const clicked = await page.evaluate((name) => {
            const links = Array.from(document.querySelectorAll('a, button'));
            const link = links.find(l =>
              l.textContent.toLowerCase().includes(name.toLowerCase())
            );

            if (link) {
              link.click();
              return true;
            }
            return false;
          }, itemName);

          if (clicked) {
            await wait(1000);
            const url = page.url();
            const hasError = await page.evaluate(() => {
              return document.body.textContent.toLowerCase().includes('404') ||
                     document.body.textContent.toLowerCase().includes('not found');
            });

            if (hasError) {
              results.broken.push(`❌ ${itemName} → 404 or Not Found`);
              console.log(`   ❌ ${itemName} → 404 or Not Found`);
            } else {
              results.working.push(`✅ ${itemName} navigates`);
              console.log(`   ✅ ${itemName} navigates`);
              await page.screenshot({
                path: path.join(SCREENSHOT_DIR, `nav-${itemName.toLowerCase()}.png`)
              });
            }
          }
        } else {
          results.warnings.push(`⚠️  ${itemName} not found in sidebar`);
          console.log(`   ⚠️  ${itemName} not found in sidebar`);
        }
      } catch (error) {
        results.broken.push(`❌ ${itemName}: ${error.message}`);
        console.log(`   ❌ ${itemName}: ${error.message}`);
      }
    }

  } catch (error) {
    results.broken.push(`❌ Critical error: ${error.message}`);
    console.error('Error:', error);
  } finally {
    await browser.close();
  }

  // Print final results
  console.log('\n' + '='.repeat(70));
  console.log('📊 NAVIGATION TEST RESULTS');
  console.log('='.repeat(70) + '\n');

  if (results.working.length > 0) {
    console.log('✅ WORKING (' + results.working.length + ' items):');
    results.working.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.broken.length > 0) {
    console.log('❌ BROKEN (' + results.broken.length + ' items):');
    results.broken.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  WARNINGS (' + results.warnings.length + ' items):');
    results.warnings.forEach(item => console.log(`   ${item}`));
    console.log('');
  }

  if (results.consoleErrors.length > 0) {
    console.log('🔴 CONSOLE ERRORS (' + results.consoleErrors.length + ' total):');
    const uniqueErrors = [...new Set(results.consoleErrors)];
    uniqueErrors.slice(0, 10).forEach(error => {
      console.log(`   ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`);
    });
    if (uniqueErrors.length > 10) {
      console.log(`   ... and ${uniqueErrors.length - 10} more unique errors`);
    }
    console.log('');
  } else {
    console.log('✅ No console errors!\n');
  }

  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('='.repeat(70));

  // Save JSON results
  fs.writeFileSync(
    path.join(SCREENSHOT_DIR, 'test-results.json'),
    JSON.stringify(results, null, 2)
  );
}

testNavigation().catch(console.error);
