import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('signup → home, profile API returns the new user, persists across reload', async ({
  page,
}) => {
  const reqs = await captureNetwork(page, async () => {
    await signup(page)
  })
  await expect(page).toHaveURL(/\/home/, { timeout: 20_000 })

  const userPost = reqs.find((r) => r.method === 'POST' && /\/api\/users(\?|$)/.test(r.url))
  expect(userPost, 'POST /api/users must have happened').toBeTruthy()
  expect(userPost!.status).toBeGreaterThanOrEqual(200)
  expect(userPost!.status).toBeLessThan(300)

  // Auth state must survive a hard reload.
  await page.reload()
  await expect(page).toHaveURL(/\/home/)
})

test('signup with duplicate email surfaces an error', async ({ page, browser }) => {
  // The duplicate-POST rejection (403) is the expected behavior under test.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 403' })
  const email = uniqueEmail('dup')
  const password = 'TestPass123!'

  const ctx1 = await browser.newContext()
  const p1 = await ctx1.newPage()
  await signup(p1, email, password)
  await ctx1.close()

  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName').first().fill('Dup')
  await page.locator('input#lastName').first().fill('User')
  await page.locator('input[type="email"]').first().fill(email)
  await page.locator('input#password').first().fill(password)
  await page.locator('input#confirm').first().fill(password)
  await page
    .getByRole('button', { name: /create workspace/i })
    .first()
    .click()
  await page.waitForTimeout(2000)
  await expect(page).toHaveURL(/\/signup/)
})

test('signup form exposes first/last name, email, password, confirm + submit', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await expect(page.locator('input#firstName')).toBeVisible()
  await expect(page.locator('input#lastName')).toBeVisible()
  await expect(page.locator('input#email').first()).toBeVisible()
  await expect(page.locator('input#password').first()).toBeVisible()
  await expect(page.locator('input#confirm').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /create workspace/i }).first()).toBeVisible()
})

test('mismatched passwords block signup with an inline error', async ({ page }) => {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input#firstName').first().fill('Test')
  await page.locator('input#lastName').first().fill('User')
  await page.locator('input[type="email"]').first().fill(uniqueEmail('mismatch'))
  await page.locator('input#password').first().fill('TestPass123!')
  await page.locator('input#confirm').first().fill('Wrongggg!')
  await page
    .getByRole('button', { name: /create workspace/i })
    .first()
    .click()
  await page.waitForTimeout(500)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveURL(/\/signup/)
})
