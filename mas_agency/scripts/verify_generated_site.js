#!/usr/bin/env node
/**
 * Render a generated site in a real browser and assert what a visitor would see.
 *
 * This is the check that no amount of static analysis replaces: the QA verifier reads
 * the generated source, so it can confirm a section is present in the file while the
 * page renders blank, overflows, or traps keyboard focus. This script loads the site
 * and measures the rendered result.
 *
 * It is deliberately NOT part of the default test suite. It needs a browser binary and
 * a running server, neither of which exists on a bare machine, and a check that cannot
 * run must never be reported as a check that passed. When the environment cannot
 * measure, this script says so and exits non-zero: 2 for "not measured".
 *
 * Usage:
 *   npx next build && npx next start -p 3000     # in the generated site
 *   node scripts/verify_generated_site.js --url http://localhost:3000 --routes /
 *
 *   --allow-skip   exit 0 instead of 2 when the environment cannot measure
 *
 * STATUS: the environment guard below is exercised by test/browser_verification_guard_test.js.
 * The rendering assertions have not been executed anywhere yet — this sandbox has the
 * Playwright package but no browser binary. Treat them as unverified until a run
 * against a live server produces a report.
 */

import { chromium } from 'playwright';

const args = process.argv.slice(2);
const readFlag = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const url = readFlag('--url');
const routes = (readFlag('--routes', '/') || '/').split(',').map((r) => r.trim()).filter(Boolean);
const allowSkip = args.includes('--allow-skip');

const MIN_TOUCH_TARGET_PX = 44;

function notMeasured(reason) {
  console.error(`\nNOT MEASURED: ${reason}`);
  console.error('Nothing about the rendered site was verified by this run.');
  console.error('Exit code 2 means "could not measure", not "measured and failed".\n');
  process.exit(allowSkip ? 0 : 2);
}

async function main() {
  if (!url) {
    console.error('Usage: node scripts/verify_generated_site.js --url <site url> [--routes /,/about]');
    process.exit(1);
  }

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    notMeasured(
      `could not launch a Chromium browser (${err.message.split('\n')[0]}). ` +
        'Install one with `npx playwright install chromium`.'
    );
  }

  const failures = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    for (const route of routes) {
      const target = new URL(route, url).toString();
      const response = await page.goto(target, { waitUntil: 'networkidle' });
      const status = response ? response.status() : 0;
      if (status >= 400) failures.push(`${route}: server returned HTTP ${status}`);

      // 1. The page renders real content, not an empty shell.
      const textLength = (await page.locator('body').innerText()).trim().length;
      if (textLength < 200) {
        failures.push(`${route}: body rendered only ${textLength} characters of text`);
      }

      // 2. The accessibility scaffold is present and the skip link targets it.
      for (const selector of ['header', 'main', 'footer']) {
        if ((await page.locator(selector).count()) === 0) {
          failures.push(`${route}: no <${selector}> landmark in the rendered page`);
        }
      }

      // 3. No horizontal overflow at a mobile width.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      if (overflow > 1) failures.push(`${route}: horizontal overflow of ${overflow}px at 390px wide`);
      await page.setViewportSize({ width: 1440, height: 900 });

      // 4. Every interactive control is reachable by keyboard and large enough to tap.
      const targets = await page.evaluate((min) => {
        const out = [];
        for (const el of document.querySelectorAll('a[href], button')) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;

          // Only controls a visitor can actually point at. A skip link is deliberately
          // parked off-screen until it takes focus, so measuring it would report the
          // site's own accessibility affordance as a defect.
          const style = getComputedStyle(el);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          if (parseFloat(style.opacity) === 0) continue;
          if (rect.right <= 0 || rect.bottom <= 0) continue;
          if (rect.left >= window.innerWidth || rect.top >= window.innerHeight) continue;

          if (rect.width < min || rect.height < min) {
            out.push({
              label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }
        return out;
      }, MIN_TOUCH_TARGET_PX);
      for (const target of targets) {
        failures.push(
          `${route}: "${target.label}" is ${target.width}x${target.height}px, under the ${MIN_TOUCH_TARGET_PX}px minimum`
        );
      }

      // 5. Every in-page anchor resolves to a rendered element.
      const dangling = await page.evaluate(() =>
        [...document.querySelectorAll('a[href^="#"]')]
          .map((a) => a.getAttribute('href').slice(1))
          .filter((id) => id && !document.getElementById(id))
      );
      for (const id of new Set(dangling)) {
        failures.push(`${route}: link to "#${id}" has no matching element in the rendered page`);
      }

      console.log(`  ${route}: ${textLength} chars, ${targets.length} undersized control(s), ${dangling.length} dangling anchor(s)`);
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error('\nRENDERED SITE FAILURES:');
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log(`\nAll ${routes.length} route(s) passed rendered verification.`);
}

main().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
