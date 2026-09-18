import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getMyUserId, signup } from './_helpers.js'

test.describe('/profile (Profile)', () => {
  test('Profile page renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page).toHaveURL(/\/profile/)
    await expect(page.getByRole('heading', { name: /^profile$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Identity / Medical / Emergency / Security tabs switch panes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')

    await page.getByRole('button', { name: /^medical$/i }).click()
    await expect(page.getByRole('heading', { name: /medical information/i }).first()).toBeVisible({
      timeout: 5_000,
    })

    await page.getByRole('button', { name: /^emergency$/i }).click()
    await expect(page.getByRole('heading', { name: /emergency contact/i }).first()).toBeVisible({
      timeout: 5_000,
    })

    await page.getByRole('button', { name: /^security$/i }).click()
    await expect(page.getByRole('heading', { name: /^security$/i }).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('Identity name change PATCHes /api/users/:id and persists across reload', async ({
    page,
  }) => {
    await signup(page)
    const userId = await getMyUserId(page)
    await page.goto(APP_BASE + '/profile')
    const newName = `Patched Name ${Date.now()}`
    const nameInput = page.locator('input').first()
    await nameInput.fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^save changes$/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const patch = reqs.find(
      (r) => new RegExp(`/api/users/${userId}$`).test(r.url) && r.method === 'PATCH',
    )
    expect(patch, 'PATCH /api/users/:id issued').toBeTruthy()
    expect(patch!.status).toBeLessThan(400)

    await page.reload()
    await expect(page.locator('input').first()).toHaveValue(newName, { timeout: 15_000 })
  })

  test('Medical allergies field PATCH persists oauthData.profile.allergies', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.getByRole('button', { name: /^medical$/i }).click()
    const allergiesInput = page.locator('form input').first()
    await allergiesInput.fill('penicillin')
    await page
      .locator('form')
      .first()
      .getByRole('button', { name: /^save changes$/i })
      .click()
    await page.waitForTimeout(1500)
    await page.reload()
    await page.getByRole('button', { name: /^medical$/i }).click()
    await expect(page.locator('form input').first()).toHaveValue('penicillin', { timeout: 15_000 })
  })

  test('Emergency contact name field PATCH persists oauthData.profile.emergency.name', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.getByRole('button', { name: /^emergency$/i }).click()
    const nameInput = page.locator('form input').first()
    await nameInput.fill('Jane Doe')
    await page
      .locator('form')
      .first()
      .getByRole('button', { name: /^save changes$/i })
      .click()
    await page.waitForTimeout(1500)
    await page.reload()
    await page.getByRole('button', { name: /^emergency$/i }).click()
    await expect(page.locator('form input').first()).toHaveValue('Jane Doe', { timeout: 15_000 })
  })

  test('Change password button reveals the password change form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.getByRole('button', { name: /^security$/i }).click()
    await page
      .getByRole('button', { name: /change password/i })
      .first()
      .click()
    const pwInputs = page.locator('input[type="password"]')
    await expect(pwInputs).toHaveCount(3, { timeout: 5_000 })
  })
})
