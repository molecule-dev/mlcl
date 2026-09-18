import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authedGet,
  authedPost,
  captureNetwork,
  expectNoConsoleErrors,
  signup,
} from './_helpers.js'

async function seedPublishedJob(page: import('@playwright/test').Page, suffix: string) {
  const company = await authedPost(page, '/companies', {
    name: `JobDetail Co ${suffix}`,
    description: 'Seeded for jobs__id.spec.',
  })
  const companyId = (company?.data ?? company).id
  const title = `JobDetail ${suffix}`
  const job = await authedPost(page, '/jobs', {
    title,
    description: 'Seeded role for the detail test.',
    location: 'Remote',
    type: 'full_time',
    company_id: companyId,
  })
  const jobId = (job?.data ?? job).id
  await authedPost(page, `/jobs/${jobId}/publish`, {})
  return { jobId, title }
}

test.describe('job detail page (/jobs/:id)', () => {
  test('shows the job title heading', async ({ page }) => {
    await signup(page)
    const { jobId, title } = await seedPublishedJob(page, `${Date.now()}-a`)
    await page.goto(APP_BASE + `/jobs/${jobId}`)
    await expect(page.getByRole('heading', { name: new RegExp(title, 'i') })).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Apply button POSTs /api/applications and the next GET reflects the row', async ({
    page,
  }) => {
    await signup(page)
    const { jobId } = await seedPublishedJob(page, `${Date.now()}-b`)
    await page.goto(APP_BASE + `/jobs/${jobId}`)
    await page.waitForTimeout(800)
    const reqs = await captureNetwork(page, async () => {
      const apply = page.getByRole('button', { name: /apply/i }).first()
      await apply.click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find((r) => r.method === 'POST' && /\/api\/applications\b/.test(r.url))
    expect(call, 'POST /api/applications not observed').toBeTruthy()
    expect(call!.status).toBeGreaterThanOrEqual(200)
    expect(call!.status).toBeLessThan(300)
    const apps = (await authedGet(page, '/applications')) as
      { data?: Array<{ job_id: string }> } | Array<{ job_id: string }>
    const list = Array.isArray(apps) ? apps : (apps.data ?? [])
    expect(list.some((a) => a.job_id === jobId)).toBeTruthy()
  })

  test('Save-job button POSTs /api/saved-jobs and persists', async ({ page }) => {
    await signup(page)
    const { jobId } = await seedPublishedJob(page, `${Date.now()}-c`)
    await page.goto(APP_BASE + `/jobs/${jobId}`)
    await page.waitForTimeout(800)
    const reqs = await captureNetwork(page, async () => {
      const save = page.getByRole('button', { name: /save\s+job|^save$/i }).first()
      await save.click()
      await page.waitForTimeout(1500)
    })
    const call = reqs.find((r) => r.method === 'POST' && /\/api\/saved-jobs\b/.test(r.url))
    expect(call, 'POST /api/saved-jobs not observed').toBeTruthy()
    expect(call!.status).toBeGreaterThanOrEqual(200)
    expect(call!.status).toBeLessThan(300)
    const saved = (await authedGet(page, '/saved-jobs')) as
      { data?: Array<{ job_id: string }> } | Array<{ job_id: string }>
    const list = Array.isArray(saved) ? saved : (saved.data ?? [])
    expect(list.some((s) => s.job_id === jobId)).toBeTruthy()
  })

  test('mount fires GET /api/jobs/:id', async ({ page }) => {
    await signup(page)
    const { jobId } = await seedPublishedJob(page, `${Date.now()}-d`)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/jobs/${jobId}`)
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && new RegExp(`/api/jobs/${jobId}`).test(r.url)),
    ).toBeTruthy()
  })

  test('renders without console errors', async ({ page }) => {
    await signup(page)
    const { jobId } = await seedPublishedJob(page, `${Date.now()}-e`)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + `/jobs/${jobId}`)
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
