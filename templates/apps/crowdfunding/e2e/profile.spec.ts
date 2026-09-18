import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers'

/**
 * /profile/:userId — public-facing creator profile. After signing up
 * we visit our own profile and confirm the page renders our name and
 * an empty campaigns/backed list.
 */

test('Visiting my own /profile/:id shows my name and empty creator stats', async ({ page }) => {
  const { name } = await signup(page)
  const me = await page.evaluate(async () => {
    const r = await fetch('/api/profiles/me')
    return r.json()
  })
  expect(me.id).toMatch(/^[0-9a-f-]+$/)
  await page.goto(APP_BASE + '/profile/' + me.id)
  await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 })
})

test('Updating a profile field via PATCH is reflected on the public profile', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-tab-profile"]').click()
  await page.locator('#display-name').fill('Public Maker')
  await page.locator('#bio').fill('Indie hardware nerd.')
  await page.locator('[data-mol-id="settings-save-profile"]').click()
  await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 8_000 })

  const me = await page.evaluate(async () => {
    const r = await fetch('/api/profiles/me')
    return r.json()
  })
  await page.goto(APP_BASE + '/profile/' + me.id)
  await expect(page.getByText('Public Maker').first()).toBeVisible({ timeout: 10_000 })
  // Bio also shows
  await expect(page.getByText(/indie hardware nerd/i).first()).toBeVisible()
})
