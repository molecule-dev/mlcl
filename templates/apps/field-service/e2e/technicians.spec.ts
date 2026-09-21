import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoTechnicians(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/technicians')
  await expect(page.getByRole('heading', { name: /^technicians$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('technicians', () => {
  test('GET /api/technicians returns 200 and crew cards render', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoTechnicians(page)
    })
    const req = reqs.find((r) => /\/api\/technicians(\?|$)/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/technicians').toBe(200)
    const cards = page.locator('section h2')
    await expect.poll(() => cards.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(1)
  })

  test('"Add technician" modal creates a crew member with a trade tag', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTechnicians(page)
    const name = `E2E Tech ${Date.now() % 100000}`
    await page.getByRole('button', { name: /\+ add technician/i }).click()
    await page.getByLabel(/^name$/i).fill(name)
    // Role locator for the select — a wrapping <label>'s textContent includes
    // every <option> text (Hvac/Plumbing/…), so getByLabel(/^trade$/) can
    // never exact-match it.
    await page.getByRole('combobox', { name: /^trade$/i }).selectOption('hvac')
    await page.getByLabel(/^phone$/i).fill('(555) 222-3333')
    await page.getByLabel(/skills \/ certs/i).fill('E2E Cert')
    await page.getByRole('button', { name: /^add technician$/i }).click()
    await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible({ timeout: 10000 })
  })

  test('open-job badge renders on crew cards', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoTechnicians(page)
    await expect(page.getByText(/open jobs/i).first()).toBeVisible()
  })
})
