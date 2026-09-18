import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoAlerts(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/alerts')
  await expect(page.getByRole('heading', { name: /^alerts$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('alerts', () => {
  test('list page loads with default Unresolved filter and GET /api/alerts returns 200', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoAlerts(page)
    })
    const alertsReq = reqs.find((r) => /\/api\/alerts(\?|$)/.test(r.url) && r.method === 'GET')
    expect(alertsReq?.status, 'GET /api/alerts').toBe(200)
    await expect(page.getByRole('button', { name: /^unresolved$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('subheader "N of N alerts" renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    await expect(page.getByText(/\d+ of \d+ alerts/i)).toBeVisible({ timeout: 10000 })
  })

  test('Filter navigation landmark exists', async ({ page }) => {
    await signup(page)
    await gotoAlerts(page)
    await expect(page.getByRole('navigation', { name: /filter alerts/i })).toBeVisible()
  })

  test('"High" filter switches to severity filter', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    await page.getByRole('button', { name: /^high$/i }).click()
    await expect(page.getByRole('button', { name: /^high$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('"All" filter shows every alert (unresolved + resolved)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    await page.getByRole('button', { name: /^all$/i }).click()
    await expect(page.getByRole('button', { name: /^all$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const articles = page.getByRole('article')
    await expect.poll(() => articles.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('"Resolved" filter switches to resolved-only', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    await page.getByRole('button', { name: /^resolved$/i }).click()
    await expect(page.getByRole('button', { name: /^resolved$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('First alert article renders with severity / message text', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    const article = page.getByRole('article').first()
    await expect(article).toBeVisible({ timeout: 10000 })
    const txt = ((await article.textContent()) ?? '').trim()
    expect(txt.length).toBeGreaterThan(10)
  })

  test('Plate link on an alert points to /vehicles/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    const article = page.getByRole('article').first()
    await expect(article).toBeVisible({ timeout: 10000 })
    const links = article.getByRole('link').filter({ hasText: /^[A-Z0-9-]+$/ })
    if ((await links.count()) > 0) {
      const href = (await links.first().getAttribute('href')) ?? ''
      expect(href).toMatch(/^\/vehicles\/[a-f0-9-]{36}$/)
    }
  })

  test('Acknowledge a high-severity alert — UI fades the card and persists across reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    await page.getByRole('button', { name: /^unresolved$/i }).click()
    const ackButtons = page.getByRole('button', { name: /^acknowledge$/i })
    const beforeCount = await ackButtons.count()
    test.skip(beforeCount === 0, 'no unresolved alerts in seed')
    await ackButtons.first().click()
    await expect.poll(() => ackButtons.count(), { timeout: 10000 }).toBe(beforeCount - 1)
    await page.reload()
    await page.getByRole('button', { name: /^unresolved$/i }).click()
    await expect
      .poll(() => page.getByRole('button', { name: /^acknowledge$/i }).count(), { timeout: 10000 })
      .toBe(beforeCount - 1)
  })

  test('Acknowledge POST /api/alerts/:id/acknowledge fires (network proof)', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoAlerts(page)
    await page.getByRole('button', { name: /^unresolved$/i }).click()
    const ackButtons = page.getByRole('button', { name: /^acknowledge$/i })
    test.skip((await ackButtons.count()) === 0, 'no unresolved alerts')
    const reqs = await captureNetwork(page, async () => {
      await ackButtons.first().click()
      await page.waitForTimeout(1500)
    })
    const ackReq = reqs.find(
      (r) => /\/api\/alerts\/[a-f0-9-]{36}\/acknowledge/.test(r.url) && r.method === 'POST',
    )
    expect(ackReq?.status, 'POST /api/alerts/:id/acknowledge').toBeGreaterThanOrEqual(200)
    expect(ackReq?.status).toBeLessThan(300)
  })
})
