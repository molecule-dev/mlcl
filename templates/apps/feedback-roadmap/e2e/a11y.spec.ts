/**
 * Accessibility smoke — axe-core scan of the app's primary surfaces.
 *
 * GATE: zero violations of impact 'critical' or 'serious' on each scanned
 * page. This is deliberately NOT the full zero-violations bar: a full-ruleset
 * gate fails every page on advisory findings ('moderate'/'minor') at once and
 * ends up deleted instead of fixed — the serious/critical gate is the honest
 * start that actually holds. RATCHET INTENTION: once the fleet is clean at
 * this level, tighten the filter to include 'moderate', then drop the filter
 * entirely. Never loosen it, and never exclude rules to go green — fix the
 * page (labels, roles, contrast via the app's theme tokens) instead.
 *
 * Static a11y (missing alt, invalid ARIA, mouse-only handlers) is enforced at
 * lint time by eslint-plugin-jsx-a11y; this spec covers what only a rendered
 * page can prove (color contrast, computed accessible names, landmark
 * structure).
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

const GATED_IMPACTS = new Set(['critical', 'serious'])

async function waitForAppRender(page: Page): Promise<void> {
  // Generic readiness signal: the React app has mounted and painted text.
  await page.waitForFunction(() => (document.body?.innerText ?? '').trim().length > 0)
}

async function expectNoGatedViolations(page: Page, surface: string): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze()
  const gated = results.violations.filter((v) => GATED_IMPACTS.has(v.impact ?? ''))
  const report = gated
    .map(
      (v) =>
        `${v.id} [${v.impact}] ${v.help} — ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target?.join(' ')}`,
    )
    .join('\n')
  expect(gated, `axe: ${surface} has serious/critical violations:\n${report}`).toEqual([])
}

test.describe('accessibility (axe-core)', () => {
  test('landing page has no serious/critical violations', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await waitForAppRender(page)
    await expectNoGatedViolations(page, 'landing page (/)')
  })

  test('login page has no serious/critical violations', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await waitForAppRender(page)
    await expectNoGatedViolations(page, 'login page (/login)')
  })

  test('public boards page has no serious/critical violations', async ({ page }) => {
    await page.goto(APP_BASE + '/boards')
    await waitForAppRender(page)
    await expectNoGatedViolations(page, 'boards page (/boards)')
  })

  test('authenticated home has no serious/critical violations', async ({ page }) => {
    await signup(page)
    // signup() may be API-only — the httpOnly cookie is the credential, and the
    // helper leaves navigation to the caller. Without this the page is still
    // about:blank and the scan proves nothing (it times out waiting for text).
    await page.goto(APP_BASE + '/boards')
    await waitForAppRender(page)
    await expectNoGatedViolations(page, 'boards (post-signup)')
  })
})
