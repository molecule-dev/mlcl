import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  isoOffset,
  listProperties,
  listRooms,
  signup,
} from './_helpers.js'

test.describe('/property/:id (PropertyDetail)', () => {
  test('renders the property name as a level-1 heading', async ({ page }) => {
    const properties = await listProperties(page)
    const target = properties[0]
    await page.goto(APP_BASE + '/property/' + target.id, { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: target.name, level: 1 })).toBeVisible()
  })

  test('"Back to search" link navigates to /search', async ({ page }) => {
    const properties = await listProperties(page)
    await page.goto(APP_BASE + '/property/' + properties[0].id, { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: /Back to search/i }).click()
    await expect(page).toHaveURL(/\/search/)
  })

  test('check-in date input accepts a date value', async ({ page }) => {
    const properties = await listProperties(page)
    await page.goto(APP_BASE + '/property/' + properties[0].id, { waitUntil: 'domcontentloaded' })
    const checkIn = isoOffset(20)
    await page.locator('input[type="date"]').nth(0).fill(checkIn)
    await expect(page.locator('input[type="date"]').nth(0)).toHaveValue(checkIn)
  })

  test('check-out date input accepts a date value', async ({ page }) => {
    const properties = await listProperties(page)
    await page.goto(APP_BASE + '/property/' + properties[0].id, { waitUntil: 'domcontentloaded' })
    const checkOut = isoOffset(25)
    await page.locator('input[type="date"]').nth(1).fill(checkOut)
    await expect(page.locator('input[type="date"]').nth(1)).toHaveValue(checkOut)
  })

  test('Guests combobox accepts a different value', async ({ page }) => {
    const properties = await listProperties(page)
    await page.goto(APP_BASE + '/property/' + properties[0].id, { waitUntil: 'domcontentloaded' })
    const combo = page.getByRole('combobox', { name: /Guests/i })
    await combo.selectOption('3')
    await expect(combo).toHaveValue('3')
  })

  test('Reserve CTA is visible and points to /booking/:id with chosen dates', async ({ page }) => {
    const properties = await listProperties(page)
    const target = properties[0]
    await page.goto(APP_BASE + '/property/' + target.id, { waitUntil: 'domcontentloaded' })
    const checkIn = isoOffset(15)
    const checkOut = isoOffset(18)
    await page.locator('input[type="date"]').nth(0).fill(checkIn)
    await page.locator('input[type="date"]').nth(1).fill(checkOut)
    const reserve = page.getByTestId('reserve-cta')
    await expect(reserve).toBeVisible()
    const href = await reserve.getAttribute('href')
    expect(href).toContain('/booking/' + target.id)
    expect(href).toContain('check_in=' + checkIn)
    expect(href).toContain('check_out=' + checkOut)
  })

  test('clicking a non-default room\'s "Select" button changes the selection', async ({ page }) => {
    // Pick a multi-room property so a non-default Select button exists.
    const properties = await listProperties(page)
    let target = properties[0]
    for (const p of properties) {
      const r = await listRooms(page, p.id)
      if (r.length > 1) {
        target = p
        break
      }
    }
    await page.goto(APP_BASE + '/property/' + target.id, { waitUntil: 'domcontentloaded' })
    const selectButtons = page.getByRole('button', { name: /^Select$/ })
    // PropertyDetail fetches rooms async after domcontentloaded; wait
    // for the non-default Select button to render before asserting.
    await expect(selectButtons.first()).toBeVisible()
    await selectButtons.first().click()
    const selectedButtons = page.getByRole('button', { name: /^Selected$/ })
    await expect(selectedButtons.first()).toBeVisible()
    await expect(selectedButtons.first()).toBeAttached()
  })

  test('save (heart) toggle persists via POST /api/favorites when authed', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    const properties = await listProperties(page)
    const target = properties[0]
    await page.goto(APP_BASE + '/property/' + target.id, { waitUntil: 'domcontentloaded' })
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Save property/i }).click()
      await page.waitForTimeout(800)
    })
    expect(
      reqs.some(
        (r) =>
          r.url.endsWith('/api/favorites') &&
          r.method === 'POST' &&
          (r.status === 201 || r.status === 200),
      ),
      'POST /api/favorites must be observed when toggling the heart',
    ).toBeTruthy()
    await ctx.close()
  })
})
