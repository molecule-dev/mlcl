import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoMaintenance(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/maintenance')
  await expect(page.getByRole('heading', { name: /^maintenance$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('maintenance', () => {
  test('list page loads, GET /api/maintenance returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoMaintenance(page)
    })
    const maintReq = reqs.find((r) => /\/api\/maintenance(\?|$)/.test(r.url) && r.method === 'GET')
    expect(maintReq?.status, 'GET /api/maintenance').toBe(200)
  })

  test('page heading "Maintenance" renders', async ({ page }) => {
    await signup(page)
    await gotoMaintenance(page)
    await expect(page.getByRole('heading', { name: /^maintenance$/i, level: 1 })).toBeVisible()
  })

  test('"N work orders" subheader text reflects maintenance count', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await expect(page.getByText(/\d+ work orders/i)).toBeVisible({ timeout: 10000 })
  })

  test('Filter navigation landmark is present', async ({ page }) => {
    await signup(page)
    await gotoMaintenance(page)
    await expect(page.getByRole('navigation', { name: /filter maintenance/i })).toBeVisible()
  })

  test('"Overdue" is the default active filter (aria-pressed=true)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await expect(page.getByRole('button', { name: /^overdue$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"Scheduled" filter switches view', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await page.getByRole('button', { name: /^scheduled$/i }).click()
    await expect(page.getByRole('button', { name: /^scheduled$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"In progress" filter switches view', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await page.getByRole('button', { name: /^in progress$/i }).click()
    await expect(page.getByRole('button', { name: /^in progress$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"Completed" filter switches view', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await page.getByRole('button', { name: /^completed$/i }).click()
    await expect(page.getByRole('button', { name: /^completed$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"All" filter shows the full list', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    const detailLinks = page.locator('a[href^="/maintenance/"]')
    await expect.poll(() => detailLinks.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('first work-order link navigates to /maintenance/<uuid>', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    await page.locator('a[href^="/maintenance/"]').first().click()
    await expect(page).toHaveURL(/\/maintenance\/[a-f0-9-]{36}$/)
  })

  test('work-order status chip renders one of {scheduled, in_progress, overdue, completed}', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    const body = (await page.locator('main').textContent()) ?? ''
    expect(body, 'has at least one status chip').toMatch(
      /scheduled|in[ _]progress|overdue|completed/i,
    )
  })

  test('detail page renders parts list with non-zero Total estimate', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    await page.locator('a[href^="/maintenance/"]').first().click()
    await expect(page).toHaveURL(/\/maintenance\/[a-f0-9-]{36}$/)
    await expect(page.getByRole('heading', { name: /^parts$/i })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /^activity$/i })).toBeVisible()
    const totalRow = page.getByText(/total estimate/i).locator('xpath=following-sibling::*[1]')
    const totalText = ((await totalRow.textContent()) ?? '').trim()
    expect(totalText, 'total estimate').not.toEqual('$0.00')
  })

  test('"+ Schedule service" creates a work order that survives page reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoMaintenance(page)

    const description = `E2E inspection ${Date.now() % 100000}`
    await page.getByRole('button', { name: /\+ schedule service/i }).click()
    const dialog = page.getByRole('dialog', { name: /schedule service/i })
    await expect(dialog).toBeVisible()
    const vehicleSelect = dialog.getByRole('combobox', { name: /^vehicle$/i })
    await expect
      .poll(async () => vehicleSelect.locator('option').count(), { timeout: 15000 })
      .toBeGreaterThanOrEqual(2)
    const optionValue = await vehicleSelect.locator('option').nth(1).getAttribute('value')
    expect(optionValue, 'first vehicle option value').toBeTruthy()
    await vehicleSelect.selectOption(optionValue!)
    await dialog.getByLabel(/^description$/i).fill(description)
    await dialog.getByLabel(/scheduled date/i).fill('2027-01-15')
    await dialog.getByRole('button', { name: /^schedule$/i }).click()

    await page.getByRole('button', { name: /^all$/i }).click()
    await expect(page.getByText(description)).toBeVisible({ timeout: 10000 })
    await page.reload()
    await page.getByRole('button', { name: /^all$/i }).click()
    await expect(page.getByText(description)).toBeVisible({ timeout: 10000 })
  })
})
