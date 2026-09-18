/**
 * /profile — Lustra creator card.
 *
 * Asserts the profile page actually renders the signed-in user's email
 * and live counts (frames + albums + plan badge), all sourced from real
 * API GETs (not hardcoded strings).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, createAlbum, createImage, signup } from './_helpers.js'

test.describe('profile', () => {
  test('shows the actual signup email + display name (not a stub string)', async ({ page }) => {
    const { email, name } = await signup(page)
    const calls = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.locator('[data-mol-id="profile-email"]')).toHaveText(email)
    })
    expect(
      calls.find((c) => c.method === 'GET' && /\/api\/billing\/status/.test(c.url))?.status,
    ).toBe(200)
    expect(calls.find((c) => c.method === 'GET' && /\/api\/images\/?$/.test(c.url))?.status).toBe(
      200,
    )
    expect(calls.find((c) => c.method === 'GET' && /\/api\/albums\/?$/.test(c.url))?.status).toBe(
      200,
    )
    await expect(page.locator('[data-mol-id="profile-display-name"]')).toContainText(name)
    await expect(page.locator('[data-mol-id="profile-plan-badge"]')).toHaveAttribute(
      'data-plan-key',
      'free',
    )
  })

  test('frame + album counts reflect the user\u2019s actual data after creates', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await createImage(page, accessToken, { name: 'Profile frame 1' })
    await createImage(page, accessToken, { name: 'Profile frame 2' })
    await createAlbum(page, accessToken, 'Profile album')
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-stat-frames"]')).toHaveText('2')
    await expect(page.locator('[data-mol-id="profile-stat-albums"]')).toHaveText('1')
  })

  test('handle is derived from the email local-part, not a hardcoded string', async ({ page }) => {
    const { email } = await signup(page)
    const expected = '@' + email.split('@')[0]
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="profile-handle"]')).toHaveText(expected)
  })
})
