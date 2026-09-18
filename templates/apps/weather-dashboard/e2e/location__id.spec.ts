// Per-page spec for /location/:id (LocationDetail).

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('LocationDetail renders the location name as the page heading', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'Reykjavik',
    address: 'Reykjavik, Iceland',
    is_default: true,
  })
  await page.goto(APP_BASE + `/location/${loc.id}`)
  await expect(page.getByRole('heading', { level: 1, name: /Reykjavik/i })).toBeVisible({
    timeout: 20_000,
  })
})

test('LocationDetail hero card shows real Open-Meteo conditions for the location', async ({
  page,
}) => {
  await signup(page)
  const loc = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'Reykjavik',
    address: 'Reykjavik, Iceland',
    is_default: true,
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/location/${loc.id}`)
    await page.waitForTimeout(2500)
  })
  const txt = await page.locator('main').innerText()
  expect(txt).toMatch(/\d{2,3}°/)
  // The hero card hits /api/forecasts/current/<id>.
  const fc = reqs.find((r) => /\/api\/forecasts\/current\//.test(r.url))
  expect(fc?.status).toBe(200)
})

test('LocationDetail back-arrow link returns to /locations', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'Reykjavik',
    address: 'Reykjavik, Iceland',
    is_default: true,
  })
  await page.goto(APP_BASE + `/location/${loc.id}`)
  // The back arrow is rendered as a link with the back arrow Material icon.
  const back = page.locator('main a[href="/locations"]').first()
  await expect(back).toBeVisible()
})

test('LocationDetail with an unknown id renders a not-found / fallback state', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/location/00000000-0000-0000-0000-000000000000')
  await page.waitForTimeout(2500)
  const txt = await page.locator('main').innerText()
  // Either a "not found" copy, or the page redirects/clears — but it
  // must NOT show a real location name, since we did not create one.
  expect(txt).not.toMatch(/Reykjavik|Boston|Cairo/i)
})
