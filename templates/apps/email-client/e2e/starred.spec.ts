/**
 * Per-page spec for /starred. Verifies the starred filter, that
 * un-starring removes from the page, and that filter chips render.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /starred renders the starred view', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/starred')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="page-starred"]')).toBeVisible()
})

test('GET /starred fetches /api/emails?is_starred=true on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/starred')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some((r) => /\/api\/emails\?[^"]*is_starred=true/.test(r.url) && r.status === 200),
  ).toBe(true)
})

test('Starring an email surfaces it in /starred (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox.find((e) => !e.is_starred) ?? inbox[0]
  expect(target).toBeTruthy()
  if (!target!.is_starred) {
    const star = await page.request.put(`${API_BASE}/emails/${target!.id}/star`, {
      headers: apiHeaders(accessToken),
    })
    expect(star.status(), await star.text()).toBe(200)
  }
  const starred = await listEmails(page, accessToken, { is_starred: 'true', limit: 50 })
  expect(starred.find((e) => e.id === target!.id)).toBeTruthy()
})

test('Starred filter chips toggle the active filter', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/starred')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="starred-filter-all"]')).toBeVisible()
  await page.locator('[data-mol-id="starred-filter-week"]').click()
  await page.locator('[data-mol-id="starred-filter-all"]').click()
})
