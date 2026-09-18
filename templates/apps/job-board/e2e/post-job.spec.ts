import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('post-job page (/post-job)', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/post-job')
  })

  test('renders the title input', async ({ page }) => {
    await expect(page.getByLabel(/job title|^title$/i).first()).toBeVisible()
  })

  test('renders the description textarea', async ({ page }) => {
    const description = page.getByLabel(/description/i).first()
    if (await description.count().catch(() => 0)) {
      await expect(description).toBeVisible()
    } else {
      await expect(page.locator('textarea').first()).toBeVisible()
    }
  })

  test('renders the location input', async ({ page }) => {
    await expect(page.getByLabel(/location/i).first()).toBeVisible()
  })

  test('renders the type select', async ({ page }) => {
    const select = page.getByLabel(/type/i).first()
    if (await select.count().catch(() => 0)) {
      await expect(select).toBeVisible()
    } else {
      await expect(page.locator('select').first()).toBeVisible()
    }
  })

  test('submitting the form POSTs /api/jobs and the new job appears in /api/jobs', async ({
    page,
  }) => {
    const title = `PostJob spec ${Date.now()}`
    await page
      .getByLabel(/job title|^title$/i)
      .first()
      .fill(title)
    // A fresh user has no companies yet — fill the inline "Company name"
    // field so the form auto-creates one before posting the job.
    const companyName = page.getByLabel(/company.*name|your company/i).first()
    if (await companyName.count().catch(() => 0)) {
      await companyName.fill(`PostJob Co ${Date.now()}`)
    }
    const description = page.getByLabel(/description/i).first()
    if (await description.count().catch(() => 0)) {
      await description.fill('Seeded by post-job.spec.')
    } else {
      await page.locator('textarea').first().fill('Seeded by post-job.spec.')
    }
    const location = page.getByLabel(/location/i).first()
    if (await location.count().catch(() => 0)) await location.fill('Remote')

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /post|publish|create|submit/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find((r) => r.method === 'POST' && /\/api\/jobs\b/.test(r.url))
    expect(call, 'POST /api/jobs not observed').toBeTruthy()
    expect(call!.status).toBeGreaterThanOrEqual(200)
    expect(call!.status).toBeLessThan(300)
    const list = (await authedGet(page, '/jobs')) as
      { data?: Array<{ title: string }> } | Array<{ title: string }>
    const jobs = Array.isArray(list) ? list : (list.data ?? [])
    expect(jobs.some((j) => j.title === title)).toBeTruthy()
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/post-job')
      await expect(page.getByLabel(/job title|^title$/i).first()).toBeVisible()
    })
  })
})
