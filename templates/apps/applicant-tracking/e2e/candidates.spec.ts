import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('candidates list page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/candidates')
  })

  test('renders the Candidates heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /candidates/i }).first()).toBeVisible()
  })

  test('GET /api/candidates returns 200 on load', async ({ page, browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const requests = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/candidates')
      await p2.waitForTimeout(1800)
    })
    expect(
      requests.some((r) => r.method === 'GET' && /\/candidates\b/.test(r.url) && r.status === 200),
    ).toBeTruthy()
    await fresh.close()
  })

  test('Search input filters the table client-side', async ({ page }) => {
    await page.locator('[data-mol-id="candidates-search"]').fill('zzz-no-match')
    await page.waitForTimeout(300)
    await expect(page.getByText(/no candidates match/i)).toBeVisible()
  })

  test('Add-candidate flow persists, the new row appears, and a backend GET reflects it', async ({
    page,
  }) => {
    await page.locator('[data-mol-id="candidates-add-toggle"]').click()
    await expect(page.locator('[data-mol-id="candidates-add-form"]')).toBeVisible()
    const email = `cand-${Date.now()}@example.com`
    await page.locator('[data-mol-id="candidates-add-first"]').fill('Quinn')
    await page.locator('[data-mol-id="candidates-add-last"]').fill('Tester')
    await page.locator('[data-mol-id="candidates-add-email"]').fill(email)
    await page.locator('[data-mol-id="candidates-add-source"]').fill('Referral')
    const requests = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="candidates-add-submit"]').click()
      await page.waitForTimeout(2000)
    })
    expect(
      requests.some(
        (r) =>
          r.method === 'POST' && /\/candidates\b/.test(r.url) && r.status >= 200 && r.status < 300,
      ),
    ).toBeTruthy()
    await expect(page.getByText('Quinn Tester').first()).toBeVisible()
    // Read-after-write invariant
    const list = await authedGet(page, '/candidates')
    expect(Array.isArray(list) ? list : (list.data ?? [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ first_name: 'Quinn', last_name: 'Tester', email }),
      ]),
    )
  })

  test('candidate row link navigates to /candidates/:id', async ({ page }) => {
    await page.locator('[data-mol-id="candidates-add-toggle"]').click()
    const email = `nav-${Date.now()}@example.com`
    await page.locator('[data-mol-id="candidates-add-first"]').fill('Nav')
    await page.locator('[data-mol-id="candidates-add-last"]').fill('Click')
    await page.locator('[data-mol-id="candidates-add-email"]').fill(email)
    await page.locator('[data-mol-id="candidates-add-submit"]').click()
    await page.waitForTimeout(2000)
    await page
      .getByRole('link', { name: /Nav Click/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/candidates\/[\w-]+$/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/candidates')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
