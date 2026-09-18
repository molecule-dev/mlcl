import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

// /signup: name + email + password inputs, with a Create Account submit
// that fires POST /api/users and routes to /docs.

test.describe('/signup', () => {
  test('name input editable', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('textbox', { name: /name/i }).fill('Casey Curl')
    await expect(page.getByRole('textbox', { name: /name/i })).toHaveValue('Casey Curl')
  })

  test('email input editable', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('textbox', { name: /email/i }).fill('casey@example.com')
    await expect(page.getByRole('textbox', { name: /email/i })).toHaveValue('casey@example.com')
  })

  test('full signup flow — POST /api/users → 201 → routes away from /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('textbox', { name: /name/i }).fill('Casey Curl')
    await page.getByRole('textbox', { name: /email/i }).fill(uniqueEmail('signup'))
    await page.getByRole('textbox', { name: /^password$/i }).fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /create account|sign\s*up|get\s*started/i }).click()
      await expect(page).not.toHaveURL(/\/signup$/, { timeout: 15_000 })
    })
    const usersPost = reqs.find((r) => /\/api\/users(\?|$)/.test(r.url) && r.method === 'POST')
    expect(usersPost, 'POST /api/users should fire on signup').toBeTruthy()
    expect(usersPost!.status).toBeLessThan(400)
    await expect(page).toHaveURL(/\/docs/)
  })
})
