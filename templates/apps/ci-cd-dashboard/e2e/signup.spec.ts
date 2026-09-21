import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('/signup', () => {
  test('renders Name + Email + Password + Confirm + Submit', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await expect(page.getByLabel(/^Name$/i)).toBeVisible()
    await expect(page.getByLabel(/^Email$/i)).toBeVisible()
    await expect(page.getByLabel(/^Password$/i)).toBeVisible()
    await expect(page.getByLabel(/Confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible()
  })

  test('all four fields accept input', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/^Name$/i).fill('Riley T')
    await page.getByLabel(/^Email$/i).fill('riley@example.com')
    await page.getByLabel(/^Password$/i).fill('Secret123!')
    await page.getByLabel(/Confirm password/i).fill('Secret123!')
    await expect(page.getByLabel(/^Name$/i)).toHaveValue('Riley T')
    await expect(page.getByLabel(/^Email$/i)).toHaveValue('riley@example.com')
  })

  test('Create account submits and redirects to /pipelines', async ({ page }) => {
    const email = uniqueEmail('signup')
    const reqs = await captureNetwork(page, async () => {
      await signup(page, email, 'TestPass123!')
    })
    const post = whereUrl(reqs, /\/api\/users(?:\?|$)/, 'POST')
    expect(post.length, 'POST /api/users fired').toBeGreaterThan(0)
    expect(post[0].status, 'signup must succeed').toBe(201)
    await expect(page).toHaveURL(/\/pipelines/)
  })

  test('Sign in link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/signup')
    await page.getByRole('link', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('account is durable — login after signup works', async ({ page }) => {
    const user = await signup(page)
    // Log out via API or navigate to /login fresh
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/^Email$/i).fill(user.email)
    await page.getByLabel(/^Password$/i).fill(user.password)
    await page.getByRole('button', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/pipelines/, { timeout: 15000 })
  })

  test('signup with existing email fails (uniqueness invariant)', async ({ page, request }) => {
    // The uniqueness rejection arrives as a 403, which the browser logs as a
    // console error — expected here, so allow it for the console guard.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
    const user = await signup(page)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/signup')
    await page.getByLabel(/^Name$/i).fill('Dupe')
    await page.getByLabel(/^Email$/i).fill(user.email)
    await page.getByLabel(/^Password$/i).fill('TestPass123!')
    await page.getByLabel(/Confirm password/i).fill('TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Create account/i }).click()
      await page.waitForTimeout(2000)
    })
    const post = whereUrl(reqs, /\/api\/users/, 'POST')
    expect(post.length, 'duplicate-signup POST fired').toBeGreaterThan(0)
    // Either backend rejects with 409/422, or UI prevents progression
    const status = post[post.length - 1].status
    if (status >= 200 && status < 300) {
      throw new Error(`Backend allowed duplicate email signup (status ${status})`)
    }
  })
})
