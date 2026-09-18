// Direct contract tests for the /api/forecasts/* handler. Each test
// drives a real network request and asserts on the response payload.
//
// `forecasts` is the only handler not exercised by another spec by
// path-string match; this file covers the gate-3 requirement.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, apiRaw, signup } from './_helpers.js'

test('GET /api/forecasts/current/:locationId returns a real Open-Meteo observation', async ({
  page,
}) => {
  await signup(page)
  const loc = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'Boston',
    address: 'Boston, MA, USA',
    is_default: true,
  })
  const current = await api<Record<string, unknown>>(
    page,
    'GET',
    `/api/forecasts/current/${loc.id}`,
  )
  expect(current).toBeTruthy()
  // Open-Meteo always returns a numeric temperature in °F (we unit-convert
  // before persistence). The returned row has `temperature` as a real
  // number-string.
  expect(Number(current.temperature)).toBeGreaterThan(-100)
  expect(Number(current.temperature)).toBeLessThan(150)
  expect(typeof current.condition).toBe('string')
})

test('GET /api/forecasts/hourly/:locationId returns 24 rows', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'NYC',
    address: 'New York, NY, USA',
    is_default: true,
  })
  const hourly = await api<Array<Record<string, unknown>>>(
    page,
    'GET',
    `/api/forecasts/hourly/${loc.id}`,
  )
  expect(Array.isArray(hourly)).toBe(true)
  expect(hourly.length).toBe(24)
  expect(typeof hourly[0]?.hour_at).toBe('string')
})

test('GET /api/forecasts/daily/:locationId returns 7 rows by default', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'NYC',
    address: 'New York, NY, USA',
    is_default: true,
  })
  const daily = await api<Array<Record<string, unknown>>>(
    page,
    'GET',
    `/api/forecasts/daily/${loc.id}`,
  )
  expect(Array.isArray(daily)).toBe(true)
  expect(daily.length).toBe(7)
})

test('POST /api/forecasts/refresh/:locationId re-pulls forecasts and clears the stale flag', async ({
  page,
}) => {
  await signup(page)
  const loc = await api<{ id: string; forecast_stale?: boolean }>(page, 'POST', '/locations', {
    name: 'Chicago',
    address: 'Chicago, IL, USA',
    is_default: true,
  })
  // Mark stale, then refresh.
  await api(page, 'POST', `/api/forecasts/stale/${loc.id}`)
  const before = await api<{ forecast_stale: boolean }>(page, 'GET', `/api/locations/${loc.id}`)
  expect(before.forecast_stale).toBe(true)
  const refreshed = await api<{
    current: { temperature: string }
    hourly_count: number
    daily_count: number
  }>(page, 'POST', `/api/forecasts/refresh/${loc.id}`, {})
  expect(refreshed.hourly_count).toBeGreaterThanOrEqual(1)
  expect(refreshed.daily_count).toBeGreaterThanOrEqual(1)
  // After refresh the stale flag must be cleared.
  const after = await api<{ forecast_stale: boolean }>(page, 'GET', `/api/locations/${loc.id}`)
  expect(after.forecast_stale).toBe(false)
})

test('GET /api/forecasts/current rejects unauthenticated callers with 401', async ({ page }) => {
  // Land on the app origin first so localStorage is readable, then clear
  // any stashed token to simulate an unauthenticated client.
  await page.goto(APP_BASE + '/login')
  await page.evaluate(() => window.localStorage.clear())
  const resp = await apiRaw(
    page,
    'GET',
    '/api/forecasts/current/00000000-0000-0000-0000-000000000000',
  )
  expect(resp.status()).toBeGreaterThanOrEqual(401)
  expect(resp.status()).toBeLessThan(500)
})

test('GET /api/forecasts/current rejects another user’s location with 404', async ({ page }) => {
  await signup(page)
  const loc = await api<{ id: string }>(page, 'POST', '/locations', {
    name: 'Owned',
    address: 'Atlanta, GA, USA',
  })
  // Sign out + sign up as a different user.
  await page.evaluate(() => window.localStorage.clear())
  await signup(page)
  const resp = await apiRaw(page, 'GET', `/api/forecasts/current/${loc.id}`)
  expect(resp.status()).toBe(404)
})
