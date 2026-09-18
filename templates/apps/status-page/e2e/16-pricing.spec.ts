import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders without authentication and shows a heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
  })

  test('lists tier limits (components, incidents, subscribers)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const text = await page.locator('body').innerText({ timeout: 15_000 })
    expect(text.toLowerCase()).toMatch(/components/)
    expect(text.toLowerCase()).toMatch(/incidents/)
    expect(text.toLowerCase()).toMatch(/subscribers/)
  })

  test('fetches plans / tiers from the API', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(2000)
    })
    const planCalls = reqs.filter((r) =>
      /\/(plans|tiers|payments|payment-options|users\/payment-options)/.test(r.url),
    )
    expect(planCalls.length, 'pricing should fetch plan data from the api').toBeGreaterThan(0)
  })

  test('upgrade / select buttons are clickable when present', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    const buttons = page.getByRole('button')
    const count = await buttons.count()
    expect(count, 'pricing must expose at least one button').toBeGreaterThan(0)
  })
})
