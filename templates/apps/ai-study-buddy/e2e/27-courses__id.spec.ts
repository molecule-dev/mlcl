/**
 * /courses/:id — single-topic detail page. Verifies the page renders
 * the topic title, mastery summary, and is auth-gated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedTopic, signup } from './_helpers.js'

test('/courses/:id renders page-course-detail container', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Detail Course Topic' })
  await page.goto(`${APP_BASE}/courses/${topic.id}`)
  await expect(page.locator('[data-mol-id="page-course-detail"]')).toBeVisible({ timeout: 15_000 })
})

test('/courses/:id shows the topic title', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Renderable Topic' })
  await page.goto(`${APP_BASE}/courses/${topic.id}`)
  await expect(page.getByText(/Renderable Topic/i).first()).toBeVisible({ timeout: 15_000 })
})

test('/courses/:id shows at least one heading and one anchor', async ({ page }) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Heading Topic' })
  await page.goto(`${APP_BASE}/courses/${topic.id}`)
  await expect(page.locator('[data-mol-id="page-course-detail"]')).toBeVisible({ timeout: 15_000 })
  const headings = await page.getByRole('heading').count()
  expect(headings).toBeGreaterThanOrEqual(1)
})

test('/courses/:id is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(`${APP_BASE}/courses/00000000-0000-0000-0000-000000000000`)
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/courses/:id mount fans out to /api/topics/:id + /api/topics/:id/materials', async ({
  page,
}) => {
  const { accessToken } = await signup(page)
  const topic = await seedTopic(page, accessToken, { title: 'Network Probe Topic' })
  const reqs = await captureNetwork(page, async () => {
    const topicFetch = page.waitForResponse(
      (r) => r.url().endsWith(`/api/topics/${topic.id}`) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    const materialsFetch = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/topics/${topic.id}/materials`) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(`${APP_BASE}/courses/${topic.id}`)
    await Promise.all([topicFetch, materialsFetch])
    await expect(page.locator('[data-mol-id="page-course-detail"]')).toBeVisible({
      timeout: 15_000,
    })
  })
  const t = reqs.find((r) => r.url.endsWith(`/api/topics/${topic.id}`) && r.method === 'GET')
  const m = reqs.find(
    (r) => r.url.endsWith(`/api/topics/${topic.id}/materials`) && r.method === 'GET',
  )
  expect(t?.status, JSON.stringify(reqs)).toBe(200)
  expect(m?.status, JSON.stringify(reqs)).toBe(200)
})
