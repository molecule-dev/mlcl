import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /actions (Action items). Backed by
 * GET /api/action_items and PUT /api/action_items/:id for status flips.
 */

test.describe('actions page', () => {
  test('action items heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('actions-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/actions')
    await expect(page.getByRole('heading', { name: /action items/i }).first()).toBeVisible()
  })

  test('All filter pill is rendered and clickable', async ({ page }) => {
    await signup(page, uniqueEmail('actions-all'), 'TestPass123!')
    await page.goto(APP_BASE + '/actions')
    const pill = page.getByRole('button', { name: /^all$/i }).first()
    await expect(pill).toBeVisible()
    await pill.click()
  })

  test('Open filter pill is rendered and clickable', async ({ page }) => {
    await signup(page, uniqueEmail('actions-open'), 'TestPass123!')
    await page.goto(APP_BASE + '/actions')
    const pill = page.getByRole('button', { name: /^open$/i }).first()
    await expect(pill).toBeVisible()
    await pill.click()
  })

  test('Done filter pill is rendered and clickable', async ({ page }) => {
    await signup(page, uniqueEmail('actions-done'), 'TestPass123!')
    await page.goto(APP_BASE + '/actions')
    const pill = page.getByRole('button', { name: /^done$/i }).first()
    await expect(pill).toBeVisible()
    await pill.click()
  })

  test('In progress filter pill is rendered and clickable', async ({ page }) => {
    await signup(page, uniqueEmail('actions-ip'), 'TestPass123!')
    await page.goto(APP_BASE + '/actions')
    const pill = page.getByRole('button', { name: /in progress/i }).first()
    await expect(pill).toBeVisible()
    await pill.click()
  })

  test('empty state is shown to a fresh user', async ({ page }) => {
    await signup(page, uniqueEmail('actions-empty'), 'TestPass123!')
    await page.goto(APP_BASE + '/actions')
    await expect(page.getByText(/no action items/i).first()).toBeVisible()
  })

  test('GET /api/action_items fires on page load', async ({ page }) => {
    await signup(page, uniqueEmail('actions-get'), 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/actions')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find((r) => /\/api\/action_items(\?|$)/.test(r.url) && r.method === 'GET')
    expect(getCall, 'GET /api/action_items must fire').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-actions chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('actions-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/actions')
    await expect(page.locator('[data-mol-id="nav-actions"]').first()).toBeVisible()
  })
})
