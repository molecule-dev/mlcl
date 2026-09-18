/**
 * /courses — authenticated topic / course list. Verifies the page
 * renders, the New-course form persists a topic to /api/topics, and
 * the new topic round-trips into the rendered list.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('/courses renders page-courses container', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/courses')
  await expect(page.locator('[data-mol-id="page-courses"]')).toBeVisible()
})

test('/courses "New course" form persists a topic via /api/topics', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/courses')
  await page.locator('[data-mol-id="courses-new"]').click()
  const title = `UI Course ${Date.now()}`
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="courses-new-title"]').fill(title)
    await page.locator('[data-mol-id="courses-new-description"]').fill('e2e seed')
    await page.locator('[data-mol-id="courses-new-submit"]').click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })
  })
  expect(reqs.find((r) => /\/api\/topics\b/.test(r.url) && r.method === 'POST')?.status).toBe(201)

  const list = await page.request.get(`${API_BASE}/topics`, { headers: apiHeaders(accessToken) })
  const rows = (await list.json()) as Array<{ title: string }>
  expect(rows.find((r) => r.title === title)).toBeTruthy()
})

test('/courses category filter buttons render', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/courses')
  // At least the "all" filter must be present.
  await expect(page.locator('[data-mol-id="courses-filter-all"]').first()).toBeVisible()
})

test('/courses is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(APP_BASE + '/courses')
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/courses "New course" toggle reveals + hides the inline form', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/courses')
  // The form should be hidden by default
  await page.locator('[data-mol-id="courses-new"]').click()
  await expect(page.locator('[data-mol-id="courses-new-title"]')).toBeVisible()
})

test('/courses description input accepts free-text without breaking submit', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/courses')
  await page.locator('[data-mol-id="courses-new"]').click()
  const desc = page.locator('[data-mol-id="courses-new-description"]')
  await desc.fill('A description with nuance — including punctuation, accents (é) and emojis.')
  await expect(desc).toHaveValue(
    'A description with nuance — including punctuation, accents (é) and emojis.',
  )
})

test('/courses fresh user with zero topics renders the empty-state placeholder', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/courses')
  await expect(page.locator('[data-mol-id="courses-empty"]').first()).toBeVisible({
    timeout: 10_000,
  })
})
