import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

test.describe('medications page', () => {
  test('renders heading + add CTA', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.locator('[data-mol-id="cta-add-medication"]')).toBeVisible()
  })

  test('mount fires GET /api/medications', async ({ browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/medications')
      await p2.waitForTimeout(2000)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/medications\b/.test(r.url))).toBeTruthy()
    await fresh.close()
  })

  test('Add a medication → POST /api/medications and read-after-write', async ({ page }) => {
    await signup(page)
    await authedPost(page, '/pets', { name: `Med-${Date.now()}`, species: 'dog', breed: 'Mix' })
    await page.goto(APP_BASE + '/medications')
    await page.locator('[data-mol-id="cta-add-medication"]').click()
    await page.waitForTimeout(300)
    const name = `Drug-${Date.now()}`
    await page.locator('#med-name').fill(name)
    await page.locator('#med-dosage').fill('10mg')
    await page.locator('#med-frequency').fill('Daily')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="submit-add-medication"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/medications\b/.test(r.url))
    expect(post).toBeTruthy()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)

    const meds = (await authedGet(page, '/medications?active=true')) as Array<{ name: string }>
    expect(meds.some((m) => m.name === name)).toBeTruthy()
  })
})
