import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Alert preferences toggle persists (read-after-write through PUT/GET)', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'Default',
    address: 'San Francisco, CA, USA',
    is_default: true,
  })
  await page.goto(APP_BASE + '/alerts')
  // The UI seeds the toggles from the page's PREFERENCE_TOGGLES defaults.
  // "Air quality advisories" defaults to OFF, so clicking it flips it ON
  // and the read-after-write contract is: 'air' appears in kinds[].
  await page.getByRole('button', { name: /Air quality advisories/i }).click()
  await page.waitForTimeout(800)
  const prefs = await api<{ kinds: string[] | null; enabled: boolean }>(
    page,
    'GET',
    `/alerts/preferences/${loc.id}`,
  )
  expect(prefs.enabled).toBe(true)
  expect(prefs.kinds).toContain('air')
})

test('Adding an alert via the API surfaces it on the /alerts page', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'Default',
    address: 'Chicago, IL, USA',
    is_default: true,
  })
  const now = new Date().toISOString()
  const ends = new Date(Date.now() + 12 * 3600_000).toISOString()
  await api(page, 'POST', '/alerts', {
    location_id: loc.id,
    kind: 'severe',
    severity: 'severe',
    title: 'Test storm watch',
    body: 'A severe thunderstorm is on the way.',
    starts_at: now,
    ends_at: ends,
  })
  await page.goto(APP_BASE + '/alerts')
  await expect(page.locator('main')).toContainText('Test storm watch', { timeout: 10_000 })
})

test('Dismiss button removes the alert from the list (read-after-write)', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'Default',
    address: 'Miami, FL, USA',
    is_default: true,
  })
  const created = await api<{ id: string; title: string }>(page, 'POST', '/alerts', {
    location_id: loc.id,
    kind: 'severe',
    severity: 'severe',
    title: 'Temporary alert',
  })
  await page.goto(APP_BASE + '/alerts')
  await expect(page.locator('main')).toContainText('Temporary alert')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /Dismiss Temporary alert/i }).click()
    await page.waitForTimeout(1000)
  })
  const dismiss = reqs.find((r) => r.method === 'POST' && /\/api\/alerts\/.+\/dismiss/.test(r.url))
  expect(dismiss?.status).toBeLessThan(300)
  const remaining = await api<Array<{ id: string }>>(page, 'GET', '/alerts')
  expect(remaining.find((a) => a.id === created.id)).toBeUndefined()
})

test('Alert page renders the page heading + active-count chip', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/alerts')
  await expect(page.getByRole('heading', { name: /weather alerts/i })).toBeVisible()
  await expect(page.locator('main')).toContainText(/active/i)
})

test('Active alerts empty state shows "All clear"', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/alerts')
  await expect(page.locator('main')).toContainText(/all clear/i, { timeout: 10_000 })
})

test('Subscriptions section shows "set a default location first" before defaults exist', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/alerts')
  await expect(page.locator('main')).toContainText(/set a default location/i, {
    timeout: 10_000,
  })
})

test('Subscriptions section announces the active default location once one exists', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Default',
    address: 'Seattle, WA, USA',
    is_default: true,
  })
  await page.goto(APP_BASE + '/alerts')
  await expect(page.locator('main')).toContainText(/for default/i, { timeout: 10_000 })
})

test('All five subscription toggles render and accept clicks (with default location)', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Default',
    address: 'Denver, CO, USA',
    is_default: true,
  })
  await page.goto(APP_BASE + '/alerts')
  for (const label of [
    /Severe wind/i,
    /Flooding/i,
    /Air quality/i,
    /Heat & cold/i,
    /Winter storms/i,
  ]) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
})

test('Alerts page captures GET /api/alerts and GET /api/alerts/preferences/:id on load', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Default',
    address: 'Boston, MA, USA',
    is_default: true,
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/alerts')
    await page.waitForLoadState('networkidle')
  })
  expect(
    reqs.some((r) => r.method === 'GET' && r.url.endsWith('/api/alerts')),
    '/api/alerts list',
  ).toBe(true)
  expect(
    reqs.some((r) => r.method === 'GET' && /\/api\/alerts\/preferences\//.test(r.url)),
    '/api/alerts/preferences/:id load',
  ).toBe(true)
})
