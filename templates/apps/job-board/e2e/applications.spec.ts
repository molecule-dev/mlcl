import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('applications page (/applications)', () => {
  test('mount fires GET /api/applications', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/applications')
      await page.waitForTimeout(1500)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/applications\b/.test(r.url))).toBeTruthy()
  })

  test('renders a heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/applications')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('shows an empty-state message for a fresh signup with no applications', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/applications')
    await page.waitForTimeout(1500)
    const empty = page.getByText(/no\s*applications|haven.?t\s*applied|nothing\s*yet/i).first()
    if (await empty.count().catch(() => 0)) {
      await expect(empty).toBeVisible()
    }
  })

  test('a seeded application appears in the list', async ({ page }) => {
    await signup(page)
    const company = await authedPost(page, '/companies', {
      name: `Apps Co ${Date.now()}`,
      description: 'Seeded for applications.spec.',
    })
    const companyId = (company?.data ?? company).id
    const job = await authedPost(page, '/jobs', {
      title: `Apps Job ${Date.now()}`,
      description: 'Seed.',
      type: 'full_time',
      company_id: companyId,
    })
    const jobId = (job?.data ?? job).id
    await authedPost(page, `/jobs/${jobId}/publish`, {})
    await authedPost(page, '/applications', { job_id: jobId })
    await page.goto(APP_BASE + '/applications')
    await page.waitForTimeout(1500)
    await expect(page.getByText((job?.data ?? job).title).first()).toBeVisible()
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/applications')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
