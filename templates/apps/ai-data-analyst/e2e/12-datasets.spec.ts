import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /datasets — list view of seeded datasets. Each card links to
// /datasets/:id. "Upload dataset" link → /upload.

test.describe('/datasets', () => {
  test('renders one card per dataset the API returns', async ({ page }) => {
    await signup(page)
    // The expected card count is read from the very response the page
    // rendered, not from how many rows the demo seed happens to write.
    let datasets: unknown[] = []
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/datasets')
      const resp = await page.waitForResponse(
        (r) => /\/api\/datasets/.test(r.url()) && r.request().method() === 'GET',
        { timeout: 15_000 },
      )
      datasets = (await resp.json()) as unknown[]
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/datasets($|\?)/.test(r.url))
    expect(get).toBeDefined()
    expect(get!.status).toBe(200)
    expect(datasets.length, 'the account has datasets to list').toBeGreaterThan(0)
    const cards = page.locator('main li')
    await expect(cards).toHaveCount(datasets.length, { timeout: 5_000 })
  })

  test('"Upload dataset" link navigates to /upload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/datasets')
    await page.getByRole('link', { name: /upload dataset/i }).click()
    await expect(page).toHaveURL(/\/upload/)
  })

  test('clicking a dataset card navigates to /datasets/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/datasets')
    await page.waitForResponse((r) => /\/api\/datasets/.test(r.url()))
    const firstLink = page.locator('a[href^="/datasets/"]').first()
    await firstLink.click()
    await expect(page).toHaveURL(/\/datasets\/[a-f0-9-]{8,}/)
  })
})
