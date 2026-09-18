import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('new job page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/jobs/new')
  })

  test('renders the Post-a-job form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /post a job|new job/i }).first()).toBeVisible()
    await expect(page.getByLabel(/job title/i)).toBeVisible()
  })

  test('Back-to-jobs link routes to /jobs', async ({ page }) => {
    const back = page.getByRole('link', { name: /back to jobs|all jobs|cancel/i }).first()
    await back.click()
    await expect(page).toHaveURL(/\/jobs$/)
  })

  test('Publish button persists the job and routes back to /jobs (or detail)', async ({ page }) => {
    const title = `Senior Engineer ${Date.now()}`
    await page.getByLabel(/job title/i).fill(title)
    await page.getByLabel(/role description/i).fill('Build the platform.')
    const requirements = page.getByLabel(/requirements/i).first()
    if (await requirements.count()) {
      await requirements.fill('5+ years\nNode.js\nDocker')
    }
    const requests = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /publish job|post job|create job|save/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    expect(
      requests.some(
        (r) => r.method === 'POST' && /\/jobs\b/.test(r.url) && r.status >= 200 && r.status < 300,
      ),
    ).toBeTruthy()
    await page.goto(APP_BASE + '/jobs')
    await page.waitForTimeout(800)
    await expect(page.getByText(title).first()).toBeVisible()
  })

  test('employment type select offers Full/Part/Contract options', async ({ page }) => {
    const select = page.getByLabel(/employment type/i)
    await expect(select).toBeVisible()
    const opts = select.locator('option')
    await expect(opts).toHaveCount(3)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/jobs/new')
      await expect(page.getByLabel(/job title/i)).toBeVisible()
    })
  })
})
