/**
 * Dashboard — sidebar workspace label, channels list, recommended
 * channels and activity counts must come from the live API for the
 * authenticated user, not from hardcoded mockups.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiSignupAndPrime, seedChannel, uniqueEmail } from './_helpers.js'

test.describe('dashboard', () => {
  test('greets the signed-in user (no Acme Corp / Alex Rivera placeholders)', async ({ page }) => {
    const { name } = await apiSignupAndPrime(
      page,
      uniqueEmail('dash-greet'),
      'TestPass123!',
      'Casey Tester',
    )
    await page.goto(APP_BASE + '/')
    // One-shot innerText() read the page mid-load — measured "Loading...", since
    // the greeting only appears once the profile request resolves. Waiting for the
    // name via an auto-retrying assertion is both the wait and the assertion; the
    // leak checks then run against the settled DOM.
    const bodyLocator = page.locator('body')
    await expect(bodyLocator).toContainText(name.split(' ')[0])
    const body = await bodyLocator.innerText()
    expect(body, 'no hardcoded company name should leak into the UI').not.toContain('Acme Corp')
    expect(body, 'no hardcoded user name should leak into the UI').not.toContain('Alex Rivera')
  })

  test('sidebar org label uses the authenticated user', async ({ page }) => {
    const { name } = await apiSignupAndPrime(
      page,
      uniqueEmail('dash-org'),
      'TestPass123!',
      'Sidebar Sam',
    )
    await page.goto(APP_BASE + '/')
    const orgLabel = await page.locator('[data-mol-id="side-nav-org"]').innerText()
    expect(orgLabel.toLowerCase()).toContain(name.split(' ')[0].toLowerCase())
  })

  test('sidebar lists real channels from /api/channels', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('dash-channels'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-real-channel' })
    await page.goto(APP_BASE + '/')
    await expect(page.locator(`[data-mol-id="side-nav-channel-${ch.id}"]`)).toBeVisible()
  })

  test('recommended channels link to real /channels/:id pages, not /signup', async ({ page }) => {
    const { accessToken } = await apiSignupAndPrime(page, uniqueEmail('dash-recommend'))
    const ch = await seedChannel(page, accessToken, { name: 'qa-recommend' })
    await page.goto(APP_BASE + '/')
    const link = page.locator(`a[href="/channels/${ch.id}"]`).first()
    await expect(link).toBeVisible()
  })

  test('activity counts default to 0 for a brand-new user (no fake "12 mentions")', async ({
    page,
  }) => {
    await apiSignupAndPrime(page, uniqueEmail('dash-activity'))
    await page.goto(APP_BASE + '/')
    const main = await page.locator('main').innerText()
    // The card header should appear with zero counts since no messages exist
    expect(main).toContain('Mentions')
    expect(main).toMatch(/\b0\b/)
  })

  test('Create Channel quick action opens modal, creates a channel, and navigates to it', async ({
    page,
  }) => {
    await apiSignupAndPrime(page, uniqueEmail('dash-create'))
    await page.goto(APP_BASE + '/')
    // Click the Create Channel quick-action card. There may be multiple cards
    // sharing the QuickActionCard component, so target by its visible label.
    await page
      .getByRole('button', { name: /Create Channel/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="create-channel-dialog"]')).toBeVisible()
    const channelName = `from-modal-${Date.now()}`
    await page.locator('[data-mol-id="create-channel-name"]').fill(channelName)
    await page.locator('[data-mol-id="create-channel-submit"]').click()
    await page.waitForURL(/\/channels\/[a-f0-9-]+/)
    await expect(page.locator('[data-mol-id="channel-header"]')).toContainText(channelName)
  })

  test('FAB opens the Create Channel modal (not a dead /compose redirect)', async ({ page }) => {
    await apiSignupAndPrime(page, uniqueEmail('dash-fab'))
    await page.goto(APP_BASE + '/')
    // FloatingActionButton has data-mol-id="floating-action-button" or similar;
    // fall back to role search by aria-label.
    const fab = page.getByRole('button', { name: /compose|create|new/i }).last()
    await fab.click()
    await expect(page.locator('[data-mol-id="create-channel-dialog"]')).toBeVisible()
  })

  test('/channels/new redirects to dashboard with auto-opened Create Channel modal', async ({
    page,
  }) => {
    await apiSignupAndPrime(page, uniqueEmail('dash-channels-new'))
    await page.goto(APP_BASE + '/channels/new')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="create-channel-dialog"]')).toBeVisible()
    expect(new URL(page.url()).pathname).toBe('/')
  })
})
