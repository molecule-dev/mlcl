// Per-page spec for /radar.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Radar empty state directs the user to /locations when no default exists', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/radar')
  await expect(page.locator('main')).toContainText(/Set a default location/i, {
    timeout: 10_000,
  })
  await expect(page.getByRole('link', { name: /manage locations/i })).toHaveAttribute(
    'href',
    /\/locations/,
  )
})

test('Radar embeds the OpenStreetMap iframe centred on the default location coords', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Cairo',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/radar')
    await page.waitForTimeout(2000)
  })
  const def = reqs.find((r) => /\/api\/locations\/default/.test(r.url))
  expect(def?.status).toBe(200)
  const iframe = page.locator('iframe[title*="Radar"]')
  await expect(iframe).toBeVisible()
  const src = await iframe.getAttribute('src')
  // Iframe URL embeds the lat/lon as a marker so the radar centres on
  // the user's saved coords.
  expect(src).toMatch(/openstreetmap\.org\/export\/embed\.html/)
  expect(src).toMatch(/marker=\d+(?:\.\d+)?,\d*\.?\d+/)
})

test('Layer chips toggle aria-pressed without leaving the page', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Cairo',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  await page.goto(APP_BASE + '/radar')
  await page.waitForTimeout(1500)
  const tempChip = page.getByRole('button', { name: /^Temperature$/i })
  await expect(tempChip).toBeVisible()
  await tempChip.click()
  await expect(tempChip).toHaveAttribute('aria-pressed', 'true')
  // Stay on /radar; the chip is local UI state.
  await expect(page).toHaveURL(/\/radar/)
})

test('"Open larger map" link points at openstreetmap.org with marker coords', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Cairo',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  await page.goto(APP_BASE + '/radar')
  await page.waitForTimeout(1500)
  const link = page.getByRole('link', { name: /open larger map/i })
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  expect(href).toMatch(/openstreetmap\.org\/\?mlat=/)
})

test('Precipitation layer chip toggles aria-pressed', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Cairo',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  await page.goto(APP_BASE + '/radar')
  await page.waitForTimeout(1500)
  const chip = page.getByRole('button', { name: /^Precipitation$/i })
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/\/radar/)
})

test('Wind layer chip toggles aria-pressed', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Cairo',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  await page.goto(APP_BASE + '/radar')
  await page.waitForTimeout(1500)
  const chip = page.getByRole('button', { name: /^Wind$/i })
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/\/radar/)
})

test('Satellite layer chip toggles aria-pressed', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Cairo',
    address: 'Cairo, Egypt',
    is_default: true,
  })
  await page.goto(APP_BASE + '/radar')
  await page.waitForTimeout(1500)
  const chip = page.getByRole('button', { name: /^Satellite$/i })
  await expect(chip).toBeVisible()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect(page).toHaveURL(/\/radar/)
})
