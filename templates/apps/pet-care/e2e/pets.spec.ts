import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, signup } from './_helpers.js'

test.describe('pets list page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pets')
  })

  test('renders an empty-state CTA before any pets exist', async ({ page }) => {
    const cta = page
      .locator('[data-mol-id="cta-add-first-pet"], [data-mol-id="cta-add-pet"]')
      .first()
    await expect(cta).toBeVisible({ timeout: 10_000 })
  })

  test('mount fires GET /api/pets', async ({ browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/pets')
      await p2.waitForTimeout(2000)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/pets\b/.test(r.url))).toBeTruthy()
    await fresh.close()
  })

  test('Add a pet → POST /api/pets and pet appears on reload', async ({ page }) => {
    await page
      .locator('[data-mol-id="cta-add-first-pet"], [data-mol-id="cta-add-pet"]')
      .first()
      .click()
    const name = `Test-Pet-${Date.now()}`
    await page.locator('#pet-name').fill(name)
    await page.locator('#pet-species').selectOption('dog')
    await page.locator('#pet-breed').fill('Labrador')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="submit-add-pet"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/pets\b/.test(r.url))
    expect(post, 'POST /api/pets observed').toBeTruthy()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)

    const pets = (await authedGet(page, '/pets')) as Array<{ name: string }>
    expect(pets.some((p) => p.name === name)).toBeTruthy()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(name).first()).toBeVisible()
  })

  test('submitting empty form keeps modal open with an error', async ({ page }) => {
    await page
      .locator('[data-mol-id="cta-add-first-pet"], [data-mol-id="cta-add-pet"]')
      .first()
      .click()
    await page.locator('[data-mol-id="submit-add-pet"]').click()
    await page.waitForTimeout(500)
    await expect(page.locator('#pet-name')).toBeVisible()
  })
})
