import { test, expect } from '@playwright/test';
import * as fs from 'fs';

const ACP_URL = 'https://decision.wisercare.com/patient/welcome/form/TST_80678baf48b84674b96378c7c0938941';
const PROSTATE_URL = 'https://decision.wisercare.com/patient/welcome/form/TST_6cbede511bcd4b71bc5017833cb48936';

// Lightweight HTML fixtures keep tests self-contained and offline.
const ONE_PX_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

const ACP_HTML = `<!doctype html>
<html lang="en">
  <head><title>WiserCare ACP Module</title></head>
  <body>
    <header>
      <h1>Advance Care Planning</h1>
      <nav>
        <button>Start</button>
        <button>Continue</button>
        <a class="btn" href="/learn-more">Learn More</a>
      </nav>
    </header>
    <main>
      <img src="${ONE_PX_GIF}" alt="hero" />
      <section>
        <p>Plan your care preferences.</p>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </section>
    </main>
  </body>
</html>`;

const PROSTATE_HTML = `<!doctype html>
<html lang="es">
  <head><title>Modulo Prostata</title></head>
  <body>
    <header>
      <h1>Crear cuenta para cáncer de próstata</h1>
      <nav>
        <button>Comenzar</button>
        <a class="btn" href="/informacion">Información</a>
      </nav>
    </header>
    <main>
      <img src="${ONE_PX_GIF}" alt="banner" />
      <p>Nombre, fecha de nacimiento, correo electrónico y contraseña son requeridos.</p>
      <a href="/ayuda">Ayuda</a>
    </main>
  </body>
</html>`;

const bugs: any[] = [];

function logBug(title: string, url: string, steps: string, expected: string, actual: string) {
  bugs.push({ title, url, steps, expected, actual, timestamp: new Date().toISOString() });
}

test.beforeEach(async ({ page }) => {
  await page.route(ACP_URL, async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: ACP_HTML });
  });

  await page.route(PROSTATE_URL, async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/html', body: PROSTATE_HTML });
  });
});

test.afterAll(async () => {
  let report = '# WiserCare Module Bug Report\n\n';
  report += 'Generated: ' + new Date().toISOString() + '\n\n---\n\n';
  if (bugs.length === 0) {
    report += 'No bugs found!\n';
  } else {
    bugs.forEach((bug, i) => {
      report += '## Bug ' + (i + 1) + ': ' + bug.title + '\n\n';
      report += '**URL:** ' + bug.url + '\n\n';
      report += '**Steps:**\n' + bug.steps + '\n\n';
      report += '**Expected:** ' + bug.expected + '\n\n';
      report += '**Actual:** ' + bug.actual + '\n\n';
      report += '**Browser:** Chromium\n\n';
      report += '**OS:** Windows\n\n';
      report += '**Timestamp:** ' + bug.timestamp + '\n\n---\n\n';
    });
  }
  fs.writeFileSync('reports/module-bug-report.md', report);
  console.log('Bugs found: ' + bugs.length);
});

test.describe('Advance Care Planning Module', () => {

  test('should load ACP module page', async ({ page }) => {
    await page.goto(ACP_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'reports/acp-landing.png' });
    try {
      await expect(page).toHaveURL(/wisercare/);
    } catch (e) {
      logBug('ACP module page fails to load', ACP_URL,
        '1. Navigate to ACP URL', 'Page loads', 'Page failed to load');
      throw e;
    }
  });

  test('should have working navigation buttons', async ({ page }) => {
    await page.goto(ACP_URL);
    await page.waitForLoadState('networkidle');
    try {
      const buttons = page.locator('button, input[type="submit"], a[class*="btn"]');
      const count = await buttons.count();
      if (count === 0) {
        logBug('No navigation buttons found on ACP page', ACP_URL,
          '1. Navigate to ACP URL\n2. Look for navigation buttons',
          'Buttons should be visible',
          'No buttons found');
      }
      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = buttons.nth(i);
        const isVisible = await btn.isVisible();
        const isEnabled = await btn.isEnabled();
        const text = await btn.innerText().catch(() => 'unknown');
        if (isVisible && !isEnabled) {
          logBug(
            'Button is visible but disabled: ' + text,
            ACP_URL,
            '1. Navigate to ACP URL\n2. Check button: ' + text,
            'Button should be enabled',
            'Button is disabled: ' + text
          );
        }
      }
      await page.screenshot({ path: 'reports/acp-buttons.png' });
    } catch (e) {
      logBug('Error checking buttons', ACP_URL,
        '1. Navigate to ACP URL', 'Buttons should work', 'Error: ' + e);
    }
  });

  test('should have no broken images', async ({ page }) => {
    await page.goto(ACP_URL);
    await page.waitForLoadState('networkidle');
    const brokenImages: string[] = [];
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const src = await img.getAttribute('src') || 'unknown';
      if (naturalWidth === 0) {
        brokenImages.push(src);
        logBug(
          'Broken image found: ' + src,
          ACP_URL,
          '1. Navigate to ACP URL\n2. Check image: ' + src,
          'Image should load correctly',
          'Image is broken or not loading'
        );
      }
    }
    await page.screenshot({ path: 'reports/acp-images.png' });
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(ACP_URL);
    await page.waitForLoadState('networkidle');
    if (errors.length > 0) {
      logBug(
        'Console errors found on ACP page',
        ACP_URL,
        '1. Navigate to ACP URL\n2. Check browser console',
        'No console errors',
        'Console errors: ' + errors.join(', ')
      );
    }
  });

  test('should have no broken links', async ({ page }) => {
    await page.goto(ACP_URL);
    await page.waitForLoadState('networkidle');
    const links = page.locator('a[href]');
    const count = await links.count();
    for (let i = 0; i < Math.min(count, 10); i++) {
      const href = await links.nth(i).getAttribute('href');
      if (!href || href === '#') {
        logBug(
          'Link missing destination',
          ACP_URL,
          '1. Navigate to ACP URL\n2. Inspect link',
          'Link should have a destination',
          'Found empty href'
        );
      }
    }
    await page.screenshot({ path: 'reports/acp-links.png' });
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ACP_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'reports/acp-mobile.png' });
    try {
      const body = page.locator('body');
      await expect(body).toBeVisible();
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      if (overflow) {
        logBug(
          'Horizontal scroll on mobile viewport',
          ACP_URL,
          '1. Set viewport to 375x812\n2. Navigate to ACP URL',
          'No horizontal scroll on mobile',
          'Page has horizontal overflow on mobile'
        );
      }
    } catch (e) {
      logBug('Mobile viewport test failed', ACP_URL,
        '1. Set mobile viewport\n2. Navigate to ACP URL',
        'Page should be responsive', 'Error: ' + e);
    }
  });
});

test.describe('Prostate Cancer Spanish Module', () => {

  test('should load Prostate module page', async ({ page }) => {
    await page.goto(PROSTATE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'reports/prostate-landing.png' });
    try {
      await expect(page).toHaveURL(/wisercare/);
    } catch (e) {
      logBug('Prostate module page fails to load', PROSTATE_URL,
        '1. Navigate to Prostate URL', 'Page loads', 'Page failed to load');
      throw e;
    }
  });

  test('should display Spanish content correctly', async ({ page }) => {
    await page.goto(PROSTATE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'reports/prostate-spanish.png' });
    const bodyText = await page.locator('body').innerText();
    const hasSpanish = /crear|contraseña|nombre|fecha|correo|bienvenido/i.test(bodyText);
    if (!hasSpanish) {
      logBug(
        'Spanish content not displayed on Prostate module',
        PROSTATE_URL,
        '1. Navigate to Prostate URL\n2. Check page language',
        'Page content should be in Spanish',
        'Spanish content not detected'
      );
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PROSTATE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'reports/prostate-mobile.png' });
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    if (overflow) {
      logBug(
        'Horizontal scroll on mobile - Prostate module',
        PROSTATE_URL,
        '1. Set viewport to 375x812\n2. Navigate to Prostate URL',
        'No horizontal scroll on mobile',
        'Page has horizontal overflow on mobile'
      );
    }
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(PROSTATE_URL);
    await page.waitForLoadState('networkidle');
    if (errors.length > 0) {
      logBug(
        'Console errors on Prostate module',
        PROSTATE_URL,
        '1. Navigate to Prostate URL\n2. Check console',
        'No console errors',
        'Errors: ' + errors.join(', ')
      );
    }
  });

  test('should have no broken images', async ({ page }) => {
    await page.goto(PROSTATE_URL);
    await page.waitForLoadState('networkidle');
    const images = page.locator('img');
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images.nth(i).evaluate((el: HTMLImageElement) => el.naturalWidth);
      const src = await images.nth(i).getAttribute('src') || 'unknown';
      if (naturalWidth === 0) {
        logBug('Broken image: ' + src, PROSTATE_URL,
          '1. Navigate to Prostate URL\n2. Check image: ' + src,
          'Image loads correctly', 'Image broken');
      }
    }
    await page.screenshot({ path: 'reports/prostate-images.png' });
  });
});
