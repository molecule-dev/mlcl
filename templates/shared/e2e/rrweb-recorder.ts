import type { Page, TestInfo } from '@playwright/test'
import type { TestType } from '@playwright/test'

/**
 * rrweb DOM-replay recorder — captures DOM mutation events alongside the
 * Playwright video recording. The events are a few KB of JSON (vs MB of
 * video), and can be replayed deterministically through the rrweb player
 * in the replay viewer's "DOM replay" mode.
 *
 * Usage in a spec:
 *   import { test } from './rrweb-recorder'
 *   test('my test', async ({ page }) => { ... })
 *
 * The fixture wraps the base `test` and automatically:
 *   1. Injects the rrweb record function via `page.addInitScript()` on
 *      page creation (CDN — no npm dependency needed in the app).
 *   2. Collects events during the test in `window.__rrwebEvents`.
 *   3. In `afterEach`, extracts the events and saves them as
 *      `events.json` next to the test's video in the output dir.
 *
 * The replay viewer detects `events.json` in the chapter dir and shows
 * the "DOM replay" toggle next to the video.
 */

// Minimal inline rrweb record script — no npm dependency. The script
// is injected via `page.addInitScript()` so it runs before any app code
// and captures every DOM mutation from the first paint.
const RRWEB_RECORD_SCRIPT = `
  window.__rrwebEvents = [];
  (function() {
    var s = document.createElement('script');
    s.src = 'https://unpkg.com/rrweb@2.0.0-alpha.4/dist/rrweb-all.js';
    s.onload = function() {
      rrweb.record({
        emit: function(event) { window.__rrwebEvents.push(event); },
        checkoutEveryNth: 500,
      });
    };
    document.head.appendChild(s);
  })();
`

export function withRrweb<T extends { page: Page }>(test: TestType<{ page: Page }, any>) {
  return test.extend<{
    page: Page
  }>(
    {
      page: async ({ page }, use, testInfo) => {
        await page.addInitScript(RRWEB_RECORD_SCRIPT)
        await use(page)
        // After the test, extract the events and save them alongside
        // the video in the output dir (the replay reporter picks them up).
        try {
          const events = await page.evaluate(() => (window as any).__rrwebEvents ?? [])
          if (Array.isArray(events) && events.length > 0) {
            const fs = await import('node:fs')
            const path = await import('node:path')
            const outDir = path.join(testInfo.outputDir, '..', 'rrweb')
            fs.mkdirSync(outDir, { recursive: true })
            const fileName = `${testInfo.title.replace(/[^a-zA-Z0-9]/g, '-')}.json`
            fs.writeFileSync(path.join(outDir, fileName), JSON.stringify(events))
          }
        } catch {
          // rrweb events are a bonus — never fail the test for them
        }
      },
    },
    { scope: 'test' },
  )
}
