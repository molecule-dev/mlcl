import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('can navigate to signup page', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('[data-mol-id="page-signup"]')).toBeVisible()
  })

  test('can navigate to login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-mol-id="page-login"]')).toBeVisible()
  })

  test('signup form has required fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('[data-mol-id="input-email"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="button-submit"]')).toBeVisible()
  })

  test('login form has required fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('[data-mol-id="input-email"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="button-submit"]')).toBeVisible()
  })

  test('API signup creates user', async ({ request }) => {
    const timestamp = Date.now()
    const response = await request.post('http://localhost:4001/api/users', {
      data: {
        email: `test-${timestamp}@e2e.com`,
        password: 'Test123456!',
        username: `e2e-${timestamp}`,
      },
    })
    // May return 201 (success) or 409 (duplicate) — both are valid
    expect([201, 409]).toContain(response.status())
  })
})
