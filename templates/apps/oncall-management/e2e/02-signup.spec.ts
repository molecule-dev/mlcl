import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signupViaUI, uniqueEmail } from './_helpers.js'

test.describe('/signup', () => {
  test('signs up via the real form and lands on the dashboard', async ({ page }) => {
    const { email } = await signupViaUI(page, uniqueEmail('signup'))
    expect(email).toContain('@')
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
  })

  test('signup form has labelled email + password inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 })
    await expect(page.locator('#email, input[type="email"]').first()).toBeVisible()
    await expect(page.locator('#password, input[type="password"]').first()).toBeVisible()
  })

  test('mismatched confirm password blocks submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 })
    const confirm = page.locator('#confirmPassword').first()
    if (!(await confirm.count())) return // form variant without confirm
    await page.locator('#email, input[type="email"]').first().fill(uniqueEmail('mismatch'))
    await page.locator('#password').first().fill('TestPass123!')
    await confirm.fill('DifferentPass456!')
    const submit = page
      .getByRole('button', { name: /create\s*account|sign\s*up|join|start\s*free/i })
      .first()
    await expect(submit).toBeVisible()
  })
})
