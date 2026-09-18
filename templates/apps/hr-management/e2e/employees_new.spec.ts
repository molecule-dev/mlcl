/**
 * /employees/new — add-employee form. Required fields enforce client-side
 * validation; valid submit POSTs to /api/employees and redirects to the
 * new employee's profile.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('employees/new page', () => {
  test('renders the eyebrow + first/last/work-email fields and "Save employee" CTA', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/employees/new')
    await expect(page.getByText(/^new employee$/i).first()).toBeVisible()
    await expect(page.locator('input[placeholder="First name"]')).toBeVisible()
    await expect(page.locator('input[placeholder="Last name"]')).toBeVisible()
    await expect(page.locator('input#work-email')).toBeVisible()
    await expect(page.getByRole('button', { name: /^save employee$/i })).toBeVisible()
  })

  test('submitting with empty required fields surfaces an inline alert and DOES NOT POST', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/employees/new')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /^save employee$/i }).click()
      await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
    })
    expect(
      reqs.find((r) => /\/api\/employees(?:$|\?)/.test(r.url) && r.method === 'POST'),
    ).toBeFalsy()
  })

  test('valid submit POSTs to /api/employees and redirects off /employees/new', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/employees/new')
    const last = `Hire${Date.now() % 100000}`
    await page.locator('input[placeholder="First name"]').fill('Newest')
    await page.locator('input[placeholder="Last name"]').fill(last)
    await page.locator('input#work-email').fill(uniqueEmail('emp'))
    const reqs = await captureNetwork(page, async () => {
      await Promise.all([
        page.waitForResponse(
          (r) => /\/api\/employees(?:$|\?|\b)/.test(r.url()) && r.request().method() === 'POST',
          { timeout: 10_000 },
        ),
        page.getByRole('button', { name: /^save employee$/i }).click(),
      ])
    })
    const post = reqs.find((r) => /\/api\/employees(?:$|\?)/.test(r.url) && r.method === 'POST')
    expect(post?.status, 'create employee status').toBe(201)
    await page.waitForURL(/\/employees(\/[0-9a-f-]{36})?$/, { timeout: 15_000 })
  })

  test('back-to-employees link returns to /employees', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/employees/new')
    await page
      .getByRole('link', { name: /back to employees|employees/i })
      .first()
      .click()
    await page.waitForURL('**/employees', { timeout: 5_000 })
  })
})
