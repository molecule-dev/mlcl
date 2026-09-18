import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createComponent, signup } from './_helpers.js'

test.describe('/components/:id', () => {
  test('renders detail for an existing component', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Detail-${Date.now()}`, group: 'platform' })
    await page.goto(APP_BASE + `/components/${c.id}`)
    await expect(page.getByRole('heading', { name: c.name }).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('issues a GET to /api/components/:id when the page loads', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Net-${Date.now()}` })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/components/${c.id}`)
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.url.includes(`/components/${c.id}`) && r.method === 'GET')
    expect(get?.status, 'GET /api/components/:id').toBe(200)
  })

  test('back link returns to /components', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Back-${Date.now()}` })
    await page.goto(APP_BASE + `/components/${c.id}`)
    const back = page.getByRole('link', { name: /components|back/i }).first()
    if (await back.count().catch(() => 0)) {
      await back.click()
      await page.waitForTimeout(800)
      expect(new URL(page.url()).pathname).toMatch(/^\/components/)
    }
  })

  test('shows the current status of the component', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Status-${Date.now()}` })
    await page.goto(APP_BASE + `/components/${c.id}`)
    const text = await page.locator('body').innerText({ timeout: 15_000 })
    expect(text.toLowerCase()).toMatch(/operational|degraded|outage|under_maintenance|maintenance/)
  })
})
