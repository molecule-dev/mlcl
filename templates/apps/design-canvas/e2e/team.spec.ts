/**
 * /team — Auth-only team management. Loads /api/team for members +
 * pending invites + stats, lets the user filter by role and POST
 * /api/team/invite to send a new invitation.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('team page', () => {
  test('loads team data — GET /api/team hit', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await expect(page.locator('[data-mol-id="team-stats"]')).toBeVisible({ timeout: 10000 })
    })
    const get = reqs.find(
      (r) => /\/api\/team(\?|$)/.test(r.url) && r.method === 'GET' && r.status < 400,
    )
    expect(get).toBeTruthy()
  })

  test('"Invite members" toggle reveals the inline form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-invite-toggle"]').click()
    await expect(page.locator('[data-mol-id="team-invite-form"]')).toBeVisible()
  })

  test('invite email input accepts text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-invite-toggle"]').click()
    await page.locator('[data-mol-id="team-invite-email"]').fill('teammate@studio.test')
    await expect(page.locator('[data-mol-id="team-invite-email"]')).toHaveValue(
      'teammate@studio.test',
    )
  })

  test('invite role select can be changed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-invite-toggle"]').click()
    await page.locator('[data-mol-id="team-invite-role"]').selectOption('viewer')
    await expect(page.locator('[data-mol-id="team-invite-role"]')).toHaveValue('viewer')
  })

  test('invite submit POSTs /api/team/invite and shows status', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-invite-toggle"]').click()
    await page
      .locator('[data-mol-id="team-invite-email"]')
      .fill(`invited-${Date.now()}@studio.test`)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="team-invite-submit"]').click()
      await expect(page.locator('[data-mol-id="team-invite-status"]')).toBeVisible({
        timeout: 10000,
      })
    })
    const post = reqs.find((r) => /\/api\/team\/invite/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
  })

  test('stats grid shows the four stat cards', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.locator('[data-mol-id="team-stat-members"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="team-stat-online"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="team-stat-pending"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="team-stat-seats"]')).toBeVisible()
  })

  test('"All" filter button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-filter-all"]').click()
    await expect(page.locator('[data-mol-id="team-filter-all"]')).toBeVisible()
  })

  test('"Editor" filter button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-filter-editor"]').click()
    await expect(page.locator('[data-mol-id="team-filter-editor"]')).toBeVisible()
  })

  test('"Viewer" filter button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.locator('[data-mol-id="team-filter-viewer"]').click()
    await expect(page.locator('[data-mol-id="team-filter-viewer"]')).toBeVisible()
  })

  test('members table renders (header + body or empty-state)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.locator('[data-mol-id="team-members-table"]')).toBeVisible()
  })

  test('pending invitations card is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.locator('[data-mol-id="team-pending-invites"]')).toBeVisible()
  })
})
