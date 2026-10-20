import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3088;
const BASE_URL = `http://localhost:${PORT}`;
const WEBSITE_DIR = path.resolve(__dirname, '../output/website');

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error(`Server failed to start at ${url} within ${timeoutMs}ms`);
}

async function runLiveBrowserTests() {
  console.log('================================================================');
  console.log('🌐 REAL BROWSER (PLAYWRIGHT / EDGE) END-TO-END VERIFICATION');
  console.log(`📁 Target: ${WEBSITE_DIR}`);
  console.log(`🔗 URL: ${BASE_URL}`);
  console.log('================================================================\n');

  console.log('🚀 Spawning Next.js production server (next start)...');
  const serverProcess = spawn('npx.cmd', ['next', 'start', '-p', String(PORT)], {
    cwd: WEBSITE_DIR,
    shell: true,
    stdio: 'pipe',
  });

  serverProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`  [server] ${msg}`);
  });

  serverProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.error(`  [server error] ${msg}`);
  });

  try {
    console.log('⏳ Waiting for server healthcheck on port ' + PORT + '...');
    await waitForServer(BASE_URL);
    console.log('✅ Server online and responding with HTTP 200.\n');

    console.log('🎭 Launching Playwright browser (Microsoft Edge)...');
    const browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // 1. Navigation & Performance
    console.log('[TEST 1] Measuring initial page load and HTTP response...');
    const startTime = Date.now();
    const response = await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const loadDuration = Date.now() - startTime;
    assert.strictEqual(response.status(), 200, 'Page must return HTTP 200');
    console.log(`  ✅ HTTP 200 OK received in ${loadDuration}ms.`);

    // 2. SEO & OpenGraph Metadata
    console.log('[TEST 2] Verifying SEO metadata, title, and OpenGraph headers...');
    const pageTitle = await page.title();
    assert(pageTitle.includes('Sri Thinesh'), `Page title must mention Sri Thinesh (got "${pageTitle}")`);
    const metaDesc = await page.$eval('meta[name="description"]', (el) => el.getAttribute('content'));
    assert(metaDesc && metaDesc.length > 20, 'Meta description must be present and descriptive');
    const ogTitle = await page.$eval('meta[property="og:title"]', (el) => el.getAttribute('content'));
    assert(ogTitle && ogTitle.includes('Sri Thinesh'), 'OG title must be present');
    console.log(`  ✅ Title: "${pageTitle}"`);
    console.log(`  ✅ Description: "${metaDesc.substring(0, 75)}..."`);

    // 3. Heading Hierarchy & Semantics
    console.log('[TEST 3] Verifying accessible heading hierarchy (single <h1>, landmarks)...');
    const h1Count = await page.$$eval('h1', (els) => els.length);
    assert.strictEqual(h1Count, 1, `Must have exactly 1 <h1> heading, found ${h1Count}`);
    const h1Text = await page.$eval('h1', (el) => el.textContent.trim());
    console.log(`  ✅ Single <h1> verified: "${h1Text.replace(/\s+/g, ' ')}"`);

    const headerExists = await page.$('header');
    const mainExists = await page.$('main#main-content');
    const footerExists = await page.$('footer#contact');
    assert(headerExists && mainExists && footerExists, 'Semantic landmarks <header>, <main>, <footer> must exist');
    console.log('  ✅ Semantic landmark elements (<header>, <main>, <footer>) verified.');

    // 4. Desktop Navigation & Anchor Links
    console.log('[TEST 4] Verifying navigation anchors and DOM target integrity...');
    const navAnchors = await page.$$eval('header nav a', (els) => els.map((a) => a.getAttribute('href')));
    console.log(`  📍 Navigation links detected: ${navAnchors.join(', ')}`);
    for (const href of navAnchors) {
      if (href.startsWith('#')) {
        const targetId = href.slice(1);
        const targetEl = await page.$(`#${targetId}`);
        assert(targetEl, `Anchor target #${targetId} must exist in the DOM`);
      }
    }
    console.log('  ✅ All internal navigation targets exist in the DOM.');

    // 5. Personality Attributes & Mindset Bento
    console.log('[TEST 5] Verifying personality attributes and core mindset bento cards...');
    const traits = await page.$$eval('section#hero span.rounded-full', (els) => els.map((e) => e.textContent.trim()));
    assert(traits.length >= 6, `Hero must feature personality trait pills, found ${traits.length}`);
    console.log(`  ✅ Personality traits rendered: ${traits.slice(0, 6).join(' | ')}`);

    const bentoCardTitles = await page.$$eval('section#about h3', (els) => els.map((e) => e.textContent.trim()));
    assert(bentoCardTitles.length >= 4, 'Must have at least 4 mindset bento cards');
    console.log(`  ✅ Mindset bento cards verified: ${bentoCardTitles.join(', ')}`);

    // 6. Areas of Exploration
    console.log('[TEST 6] Verifying 5 areas of exploration (AI, Web, UX, Electronics, Entrepreneurship)...');
    const domains = await page.$$eval('div#domains h3', (els) => els.map((e) => e.textContent.trim()));
    assert(domains.includes('Artificial Intelligence'), 'Must include Artificial Intelligence');
    assert(domains.includes('Modern Web Development'), 'Must include Modern Web Development');
    assert(domains.includes('UI/UX Design'), 'Must include UI/UX Design');
    assert(domains.includes('Electronics Engineering'), 'Must include Electronics Engineering');
    assert(domains.includes('Entrepreneurship'), 'Must include Entrepreneurship');
    console.log(`  ✅ All 5 exploration domains verified: ${domains.join(', ')}`);

    // 7. Projects Showcase & Modal Interaction
    console.log('[TEST 7] Verifying projects showcase and interactive inspection modal...');
    const projectTitles = await page.$$eval('section#projects h3', (els) => els.map((e) => e.textContent.trim()));
    assert(projectTitles.includes('Personal Portfolio (v2.0)'), 'Must include Personal Portfolio');
    assert(projectTitles.includes('NEED IT'), 'Must include NEED IT');
    assert(projectTitles.includes('E-Cell Website'), 'Must include E-Cell Website');
    assert(projectTitles.includes('555 Timer & SPICE Simulation'), 'Must include 555 Timer simulation');
    console.log(`  ✅ Authentic projects verified (${projectTitles.length} cards total).`);

    // Click on NEED IT to open detail modal
    const needItCard = page.locator('section#projects h3:has-text("NEED IT")');
    await needItCard.click();
    await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
    const modalTitle = await page.$eval('div[role="dialog"] h3', (e) => e.textContent.trim());
    assert.strictEqual(modalTitle, 'NEED IT', 'Modal must show NEED IT details');
    console.log(`  ✅ Modal opened successfully: "${modalTitle}"`);

    // Close modal via Escape key
    await page.keyboard.press('Escape');
    await page.waitForSelector('div[role="dialog"]', { state: 'detached', timeout: 3000 });
    console.log('  ✅ Modal closed via Escape key (accessibility keyboard compliant).');

    // 8. Contact Form Validation & Transmission
    console.log('[TEST 8] Verifying contact form validation and transmission...');
    // Attempt submit with empty values
    const submitBtn = page.locator('footer#contact button[type="submit"]');
    await submitBtn.click();
    const errorMsg = await page.locator('footer#contact p.text-red-400').textContent();
    assert(errorMsg && errorMsg.length > 5, 'Form must display validation error for empty fields');
    console.log(`  ✅ Validation error caught: "${errorMsg.trim()}"`);

    // Fill valid transmission data
    await page.fill('input#contact-name', 'Verification Lead');
    await page.fill('input#contact-email', 'auditor@example.com');
    await page.fill('textarea#contact-message', 'Automated Playwright acceptance test verifying end-to-end transmission flow.');
    await submitBtn.click();

    await page.waitForSelector('text=Transmission Logged', { timeout: 3000 });
    console.log('  ✅ Transmission form successfully submitted and displayed confirmation state.');

    // 9. Responsive Mobile Reflow & Hamburger Menu (375px)
    console.log('[TEST 9] Verifying mobile viewport (375px) reflow and hamburger drawer...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(300);

    const hamburgerBtn = page.locator('button[aria-label="Open Navigation Menu"]');
    assert(await hamburgerBtn.isVisible(), 'Hamburger menu must be visible on mobile (375px)');
    await hamburgerBtn.click();
    await page.waitForSelector('button[aria-label="Close Navigation Menu"]', { timeout: 2000 });
    console.log('  ✅ Mobile drawer opened via touch trigger.');

    // Verify zero horizontal scroll blowout
    const isHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert(!isHorizontalOverflow, 'Document must not have horizontal scroll blowout on 375px mobile');
    console.log('  ✅ Mobile layout zero-overflow verified (scrollWidth <= innerWidth).');

    // 10. Tablet Viewport Reflow (768px)
    console.log('[TEST 10] Verifying tablet viewport (768px) reflow...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);
    const tabletOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    assert(!tabletOverflow, 'Document must not have horizontal scroll blowout on 768px tablet');
    console.log('  ✅ Tablet layout zero-overflow verified.');

    // 11. Zero Placeholder Audit on Live Rendered Page
    console.log('[TEST 11] Scanning live rendered page text for banned placeholders...');
    const bodyText = await page.$eval('body', (el) => el.innerText);
    const bannedTokens = ['lorem ipsum', 'TODO', 'TBD', '[INPUT]', 'headline goes here', 'coming soon'];
    for (const token of bannedTokens) {
      assert(
        !bodyText.toLowerCase().includes(token.toLowerCase()),
        `Banned placeholder token "${token}" found in rendered page text!`
      );
    }
    console.log('  ✅ Zero-placeholder audit passed 100% on live DOM text.');

    // 12. Console and Runtime Errors
    console.log('[TEST 12] Auditing browser console and unhandled page exceptions...');
    assert.strictEqual(consoleErrors.length, 0, `Browser console errors detected: ${consoleErrors.join('; ')}`);
    assert.strictEqual(pageErrors.length, 0, `Page runtime errors detected: ${pageErrors.join('; ')}`);
    console.log('  ✅ Zero browser console errors and zero unhandled exceptions.');

    await browser.close();

    console.log('\n================================================================');
    console.log('🎉 ALL 12 PLAYWRIGHT LIVE BROWSER ACCEPTANCE TESTS PASSED (100%)');
    console.log('================================================================\n');
  } finally {
    console.log('🛑 Shutting down Next.js test server...');
    serverProcess.kill();
  }
}

runLiveBrowserTests().catch((err) => {
  console.error('\n❌ Playwright Live Browser Test Failed:', err);
  process.exit(1);
});
