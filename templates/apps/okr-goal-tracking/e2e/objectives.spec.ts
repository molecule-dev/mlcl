import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedObjective, signup } from './_helpers.js'

test.describe('Objectives /objectives', () => {
  test('empty state visible for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives')
    await expect(page.getByTestId('objectives-empty')).toBeVisible()
  })

  test('initial load fires GET /api/objectives + /api/key-results', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/objectives')
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    })
    const objs = reqs.find((r) => r.method === 'GET' && /\/api\/objectives(\?|$)/.test(r.url))
    const krs = reqs.find((r) => r.method === 'GET' && /\/api\/key-results(\?|$)/.test(r.url))
    expect(objs).toBeTruthy()
    expect(krs).toBeTruthy()
  })

  test('seeding an objective via API renders it in the list (read-after-write)', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'Objectives list smoke' })
    await page.goto(APP_BASE + '/objectives')
    await expect(page.locator('main')).toContainText('Objectives list smoke')
  })

  test('Filter by title input narrows the list to a single match', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'Alpha mountain trek' })
    await seedObjective(page, accessToken!, { title: 'Beta valley jaunt' })
    await page.goto(APP_BASE + '/objectives')
    await expect(page.locator('main')).toContainText('Alpha mountain trek')
    await expect(page.locator('main')).toContainText('Beta valley jaunt')
    await page.locator('input[placeholder*="Filter"]').first().fill('Alpha')
    await page.waitForTimeout(300)
    await expect(page.locator('main')).toContainText('Alpha mountain trek')
    await expect(page.locator('main')).not.toContainText('Beta valley jaunt')
  })

  test('On track filter only shows on_track objectives', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'OT-on', status: 'on_track' })
    await seedObjective(page, accessToken!, { title: 'OT-risk', status: 'at_risk' })
    await page.goto(APP_BASE + '/objectives')
    await page.getByRole('button', { name: /^on track$/i }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('main')).toContainText('OT-on')
    await expect(page.locator('main')).not.toContainText('OT-risk')
  })

  test('At risk filter only shows at_risk objectives', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'AR-on', status: 'on_track' })
    await seedObjective(page, accessToken!, { title: 'AR-risk', status: 'at_risk' })
    await page.goto(APP_BASE + '/objectives')
    await page.getByRole('button', { name: /^at risk$/i }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('main')).toContainText('AR-risk')
    await expect(page.locator('main')).not.toContainText('AR-on')
  })

  test('Behind filter only shows off_track objectives', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'BH-on', status: 'on_track' })
    await seedObjective(page, accessToken!, { title: 'BH-off', status: 'off_track' })
    await page.goto(APP_BASE + '/objectives')
    await page.getByRole('button', { name: /^behind$/i }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('main')).toContainText('BH-off')
    await expect(page.locator('main')).not.toContainText('BH-on')
  })

  test('Completed filter only shows completed objectives', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'CO-on', status: 'on_track' })
    await seedObjective(page, accessToken!, { title: 'CO-done', status: 'completed' })
    await page.goto(APP_BASE + '/objectives')
    await page.getByRole('button', { name: /^completed$/i }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('main')).toContainText('CO-done')
    await expect(page.locator('main')).not.toContainText('CO-on')
  })

  test('All filter resets to show every objective', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedObjective(page, accessToken!, { title: 'All-A', status: 'on_track' })
    await seedObjective(page, accessToken!, { title: 'All-B', status: 'at_risk' })
    await page.goto(APP_BASE + '/objectives')
    await page.getByRole('button', { name: /^at risk$/i }).click()
    await page.getByRole('button', { name: /^all$/i }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('main')).toContainText('All-A')
    await expect(page.locator('main')).toContainText('All-B')
  })

  test('New objective CTA routes to /objectives/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/objectives')
    await page
      .getByRole('link', { name: /new objective/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/objectives\/new$/)
  })
})
