import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, APP_BASE, bookViaApi, signup } from './_helpers.js'

/**
 * Cross-page journey for ai-travel-agent:
 * sign up → the talk surface mounts → a booking (made the way the UI makes it)
 * shows on Trips → the trip page splits the bill → a payer settles a share on
 * the public pay page → Bills shows one paid, one pending → Settings stores
 * the phone the agent texts.
 */
test.describe('user journey — ai-travel-agent end-to-end', () => {
  test('sign up, book, split, pay, and check the books', async ({ page, browser }) => {
    test.setTimeout(180_000)
    await signup(page)
    await expect(page).toHaveURL(/\/talk/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: /where to\?/i })).toBeVisible({
      timeout: 15_000,
    })

    const booking = await bookViaApi(page, 2)
    await page.goto(APP_BASE + '/trips')
    const card = page.locator('[data-mol-id="trip-card"]').first()
    await expect(card).toBeVisible({ timeout: 15_000 })
    await expect(card).toContainText(booking.flight_number)
    await card.click()
    await expect(page.locator('[data-mol-id="trip-split"]')).toBeVisible({ timeout: 15_000 })

    await page.locator('[data-mol-id="split-name"]').nth(0).fill('Traveler One')
    await page.locator('[data-mol-id="split-add-person"]').click()
    await page.locator('[data-mol-id="split-name"]').nth(1).fill('Traveler Two')
    const splitPost = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/bookings\/[^/]+\/split/.test(r.url()),
      { timeout: 30_000 },
    )
    await page.locator('[data-mol-id="split-submit"]').click()
    expect((await splitPost).status()).toBe(201)
    await expect(page.locator('[data-mol-id="trip-splits"] li')).toHaveCount(2, { timeout: 15_000 })
    const link = await page.locator('[data-mol-id="split-pay-link"]').first().getAttribute('href')
    expect(link).toMatch(/\/pay\//)

    const payer = await browser.newContext()
    const payPage = await payer.newPage()
    await payPage.goto(APP_BASE + link!)
    await payPage.locator('[data-mol-id="pay-card-number"]').fill('4242424242424242')
    await payPage.locator('[data-mol-id="pay-submit"]').click()
    await expect(payPage.locator('[data-mol-id="pay-done"]')).toBeVisible({ timeout: 15_000 })
    await payer.close()

    await page.goto(APP_BASE + '/bills')
    await expect(page.locator('[data-mol-id="bill-paid"]')).toHaveCount(1, { timeout: 15_000 })
    await expect(page.locator('[data-mol-id="bill-pending"]')).toHaveCount(1)

    await page.goto(APP_BASE + '/settings')
    const phone = page.locator('[data-mol-id="settings-phone"]')
    await expect(phone).toBeVisible({ timeout: 15_000 })
    const put = page.waitForResponse(
      (r) => r.request().method() === 'PUT' && /\/api\/preferences/.test(r.url()),
      { timeout: 15_000 },
    )
    await phone.fill('+15550002222')
    await phone.blur()
    expect((await put).status()).toBeLessThan(300)
    const prefs = await apiGet<{ phone: string }>(page, '/preferences')
    expect(prefs.phone).toBe('+15550002222')
  })
})
