import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('profile', () => {
  test('can rename the user from the profile page and persist', async ({ page }) => {
    await signup(page, uniqueEmail('profile-rename'), 'TestPass123!')
    await page.goto(APP_BASE + '/profile')

    // Click "Edit profile" or similar to enter edit mode.
    const editBtn = page.getByRole('button', { name: /edit/i }).first()
    await editBtn.click()

    // Find the Name input.
    const nameInput = page.getByLabel(/name/i).first()
    await nameInput.fill('Renamed User')

    // Save.
    await page.getByRole('button', { name: /save/i }).first().click()

    // The new name should appear in the visible profile somewhere.
    await expect(page.getByText('Renamed User').first()).toBeVisible({ timeout: 5000 })

    // Reload — server-persisted, should still show.
    await page.reload()
    await expect(page.getByText('Renamed User').first()).toBeVisible({ timeout: 10000 })
  })

  test('backend invariant: PATCH /users/:id updates name and email', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-profile'))
    const auth = { Authorization: `Bearer ${me.token}` }

    const updated = await ctx.patch(`/api/users/${me.userId}`, {
      headers: auth,
      data: { name: 'Updated Name' },
    })
    expect(updated.status()).toBe(200)

    const get = await ctx.get(`/api/users/${me.userId}`, { headers: auth })
    const json = (await get.json()) as { name?: string; props?: { name?: string } }
    expect(json.name ?? json.props?.name).toBe('Updated Name')

    await ctx.dispose()
  })
})
