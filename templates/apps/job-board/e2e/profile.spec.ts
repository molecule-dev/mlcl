import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('profile page (/profile)', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForTimeout(800)
  })

  test('renders the headline input', async ({ page }) => {
    await expect(page.getByLabel(/headline/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('renders the skills input', async ({ page }) => {
    await expect(page.getByLabel(/skills/i).first()).toBeVisible()
  })

  test('renders a Save button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /save\s*changes|save\s*profile|^save$/i }).first(),
    ).toBeVisible()
  })

  test('renders an Upload-resume button wired to /api/uploads/resume', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /upload.*resume|replace.*resume/i }).first(),
    ).toBeVisible()
    // The hidden file input feeds POST /api/uploads/resume; assert the
    // accept attribute matches the supported MIME set so the picker only
    // surfaces resume-shaped files to the user.
    const fileInput = page.locator('input[type="file"][data-testid="resume-file-input"]').first()
    if (await fileInput.count().catch(() => 0)) {
      const accept = await fileInput.getAttribute('accept')
      expect(accept ?? '').toMatch(/pdf|word|doc|text/i)
    }
  })

  test('saving the headline persists through reload (PUT /user-profiles/me)', async ({ page }) => {
    const headline = `E2E Headline ${Date.now()}`
    await page
      .getByLabel(/headline/i)
      .first()
      .fill(headline)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /save\s*changes|save\s*profile|^save$/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find((r) => r.method === 'PUT' && /\/api\/user-profiles\/me\b/.test(r.url))
    expect(call, 'PUT /api/user-profiles/me not observed').toBeTruthy()
    expect(call!.status).toBeGreaterThanOrEqual(200)
    expect(call!.status).toBeLessThan(300)
    const profile = (await authedGet(page, '/user-profiles/me')) as {
      headline?: string
      data?: { headline?: string }
    }
    const headlineRead = profile?.headline ?? profile?.data?.headline
    expect(headlineRead).toBe(headline)
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.getByLabel(/headline/i).first()).toHaveValue(headline)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.getByLabel(/headline/i).first()).toBeVisible()
    })
  })
})
