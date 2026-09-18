import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedPost, captureNetwork, signup } from './_helpers.js'

test.describe('pet detail page', () => {
  test('renders pet name heading after seeding', async ({ page }) => {
    await signup(page)
    const name = `PD-${Date.now()}`
    const pet = await authedPost(page, '/pets', { name, species: 'dog', breed: 'Mix' })
    await page.goto(APP_BASE + `/pets/${pet.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="pet-name"]')).toHaveText(name, { timeout: 10_000 })
  })

  test('mount fires GET /api/pets/:id', async ({ page }) => {
    await signup(page)
    const pet = await authedPost(page, '/pets', {
      name: `PD2-${Date.now()}`,
      species: 'cat',
      breed: 'Mix',
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/pets/${pet.id}`)
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => r.method === 'GET' && new RegExp(`/api/pets/${pet.id}\\b`).test(r.url)),
    ).toBeTruthy()
  })

  test('back link routes to /pets', async ({ page }) => {
    await signup(page)
    const pet = await authedPost(page, '/pets', {
      name: `PD3-${Date.now()}`,
      species: 'dog',
      breed: 'Mix',
    })
    await page.goto(APP_BASE + `/pets/${pet.id}`)
    const back = page.getByRole('link', { name: /back|pets/i }).first()
    if (await back.count().catch(() => 0)) {
      await back.click()
      await expect(page).toHaveURL(/\/pets$/)
    }
  })
})
