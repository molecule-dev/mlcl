import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  captureNetwork,
  getProviders,
  getSpecialties,
  pickTwoDistinctProviders,
  signup,
} from './_helpers.js'

test.describe('/providers — Public directory', () => {
  test('Lists every provider the directory API returns', async ({ page }) => {
    // Read the directory from the same endpoint the page reads — naming the
    // starter providers breaks this spec the moment they are replaced.
    const directory = await getProviders(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/providers')
      await expect(page.getByRole('heading', { name: /find a provider/i })).toBeVisible()
      await expect(page.getByText(directory[0].display_name).first()).toBeVisible({
        timeout: 15000,
      })
    })
    const dir = reqs.find((r) => r.method === 'GET' && /\/api\/providers(\?|$)/.test(r.url))
    expect(dir, 'public directory must GET /api/providers').toBeTruthy()
    expect(dir!.status).toBeLessThan(400)
    const specs = reqs.find(
      (r) => r.method === 'GET' && /\/api\/providers\/specialties(\?|$)/.test(r.url),
    )
    expect(specs, 'public directory must GET /api/providers/specialties').toBeTruthy()
    for (const provider of directory) {
      await expect(page.getByText(provider.display_name).first()).toBeVisible()
    }
  })

  test('Specialty filter dropdown is populated from /api/providers/specialties', async ({
    page,
  }) => {
    // The dropdown must offer every specialty the catalog serves (plus the
    // page's own "all" option) — read the catalog rather than counting rows.
    const specialties = await getSpecialties(page)
    await page.goto(APP_BASE + '/providers')
    const select = page.locator('select.filter-select')
    await expect(select).toBeVisible({ timeout: 15000 })
    const options = await select.locator('option').allInnerTexts()
    expect(options.length).toBeGreaterThanOrEqual(specialties.length)
    for (const specialty of specialties) {
      expect(options.join('|')).toContain(specialty.label!)
    }
  })

  test('Search box filters cards by display name (debounced after 2 chars)', async ({ page }) => {
    const { target, other } = await pickTwoDistinctProviders(page)
    await page.goto(APP_BASE + '/providers')
    await expect(page.getByText(target.display_name).first()).toBeVisible({ timeout: 15000 })
    await page.locator('.search-input').fill(target.display_name)
    // Cards narrow to the searched provider; an unrelated name drops out.
    await expect(page.getByText(target.display_name).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(other.display_name)).toHaveCount(0)
  })

  test('Each provider card links to /providers/:id/book', async ({ page }) => {
    await page.goto(APP_BASE + '/providers')
    const cards = page.locator('a.provider-card')
    await expect(cards.first()).toBeVisible({ timeout: 15000 })
    const href = await cards.first().getAttribute('href')
    expect(href).toMatch(/\/providers\/[\w-]+\/book$/)
  })

  test('Clicking a provider card navigates to the booking page (auth required)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/providers')
    await page.locator('a.provider-card').first().click()
    await expect(page).toHaveURL(/\/providers\/[\w-]+\/book/, { timeout: 10000 })
  })

  test('Specialty list comes from a real API call', async ({ page }) => {
    const res = await page.request.get(API_BASE + '/providers/specialties')
    expect(res.status()).toBe(200)
    const list = (await res.json()) as Array<{ slug?: string; label?: string }>
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
  })
})
