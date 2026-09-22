import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('moderation', () => {
  // A non-moderator's queue fetch 403s by design (asserted directly by the
  // first test), and every /moderation visit as a plain user logs that failed
  // fetch to the browser console. Expected everywhere in this suite — allow it.
  test.beforeEach(() => {
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
  })

  test('non-moderator gets 403 from /api/moderation/queue', async ({ page }) => {
    await signup(page)
    const res = await page.request.get(`${API_BASE}/moderation/queue`)
    expect(res.status()).toBe(403)
  })

  test('Moderation page is reachable for any authed user (UI hides actions for non-mods)', async ({
    page,
  }) => {
    await signup(page)
    const res = await page.goto(APP_BASE + '/moderation')
    expect(res?.status()).toBeLessThan(500)
  })

  test('Moderation queue heading renders without raw {{key}} placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/moderation')
    const heading = page.getByRole('heading').first()
    await expect(heading).toBeVisible({ timeout: 15_000 })
    const text = await heading.innerText()
    expect(text).not.toMatch(/\{\{/)
  })

  test('Moderation page calls GET /api/moderation/queue (captureNetwork invariant)', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/moderation')
      await page.waitForTimeout(1500)
    })
    const q = reqs.find((r) => /\/api\/moderation\/queue$/.test(r.url) && r.method === 'GET')
    expect(q, 'GET /api/moderation/queue must fire on page load').toBeTruthy()
    expect([200, 403]).toContain(q!.status)
  })

  test('Filter chip "All" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/moderation')
    const chip = page.getByRole('button', { name: /^All\b/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "Flags" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/moderation')
    const chip = page.getByRole('button', { name: /Flag/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "Pending" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/moderation')
    const chip = page.getByRole('button', { name: /Pending/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "Reports" / "Reported" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/moderation')
    const chip = page.getByRole('button', { name: /Report/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Filter chip "Appeals" is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/moderation')
    const chip = page.getByRole('button', { name: /Appeal/i }).first()
    await expect(chip).toBeVisible({ timeout: 15_000 })
    await chip.click()
  })

  test('Empty-queue state ("Queue clear. Brew a tea.") renders for non-mods with no items', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/moderation')
    await expect(page.getByText(/Queue clear|caught up|no.+items/i)).toBeVisible({
      timeout: 15_000,
    })
  })

  test('Non-mod POST to /api/moderation/:id/:action is rejected (403)', async ({ page }) => {
    await signup(page)
    const res = await page.request.post(
      `${API_BASE}/moderation/00000000-0000-0000-0000-000000000000/approve`,
      {
        data: {},
      },
    )
    // Non-mod can't act — must 401/403/404 (not 200, not 5xx)
    expect([401, 403, 404]).toContain(res.status())
  })
})
