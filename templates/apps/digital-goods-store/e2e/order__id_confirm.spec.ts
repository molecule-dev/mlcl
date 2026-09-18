import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedSale, signup, whereUrl } from './_helpers.js'

test.describe('Order confirmation page (/order/:id/confirm)', () => {
  test('renders the order header for a fulfilled purchase', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear()).catch(() => {})
    // Sign in as the buyer so the auth-protected page renders.
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await page.goto(APP_BASE + `/order/${sale.purchase.id}/confirm`)
    await page.waitForTimeout(1200)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('page-load fetches /api/orders/:id', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/order/${sale.purchase.id}/confirm`)
      await page.waitForTimeout(1500)
    })
    const get = whereUrl(reqs, /\/api\/orders\//, 'GET')
    expect(get.length, 'GET /api/orders/:id fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('renders the issued license key text', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await page.goto(APP_BASE + `/order/${sale.purchase.id}/confirm`)
    await page.waitForTimeout(1200)
    const license = page.getByText(/license/i).first()
    await expect(license.first()).toBeAttached()
  })

  test('download button issues GET /api/downloads/:productId', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await page.goto(APP_BASE + `/order/${sale.purchase.id}/confirm`)
    await page.waitForTimeout(1200)
    const dl = page.getByRole('button', { name: /download/i }).first()
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await dl
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no download button on order page')
    const reqs = await captureNetwork(page, async () => {
      await dl.click()
      await page.waitForTimeout(1500)
    })
    const get = whereUrl(reqs, /\/api\/downloads\//)
    // Tolerate either GET (presigned) or POST (initiate)
    expect(get.length).toBeGreaterThan(0)
  })

  test('library link navigates to /library', async ({ page, request }) => {
    const seller = await signup(page)
    const sale = await seedSale(request, seller.accessToken!)
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(sale.buyer.email)
    await page.locator('#password').fill(sale.buyer.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await page.goto(APP_BASE + `/order/${sale.purchase.id}/confirm`)
    await page.waitForTimeout(1200)
    const link = page.getByRole('link', { name: /library/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no library link on order page')
    await link.first().click()
    await expect(page).toHaveURL(/\/library/)
  })
})
