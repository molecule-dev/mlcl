import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  pickDirectConversation,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('inbox page', () => {
  test('conversations appear after signup', async ({ page }) => {
    await signup(page, uniqueEmail('inbox'))
    await page.waitForURL(/\/inbox/, { timeout: 20000 })
    // Drive whatever the inbox actually holds — naming a demo peer breaks
    // this the moment the roster is replaced.
    const convo = await pickDirectConversation(page)
    await expect(page.getByText(convo.name).first()).toBeVisible({ timeout: 15000 })
  })

  test('GET /api/conversations is hit on inbox load', async ({ page }) => {
    await signup(page, uniqueEmail('inbox-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/inbox')
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && /\/api\/conversations(\?|$)/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
  })

  test('inbox renders without fatal console errors', async ({ page }) => {
    await signup(page, uniqueEmail('inbox-clean'))
    const convo = await pickDirectConversation(page)
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/inbox')
      await expect(page.getByText(convo.name).first()).toBeVisible({ timeout: 15000 })
    })
  })

  test('clicking a conversation navigates to /conversations/:id', async ({ page }) => {
    await signup(page, uniqueEmail('inbox-click'))
    await page.waitForURL(/\/inbox/, { timeout: 20000 })
    const convo = await pickDirectConversation(page)
    await page.getByRole('link', { name: convo.name, exact: false }).first().click()
    await expect(page).toHaveURL(/\/conversations\/[0-9a-f-]{36}$/, { timeout: 15000 })
  })

  test('"New message" link goes to /conversations/new', async ({ page }) => {
    await signup(page, uniqueEmail('inbox-newmsg'))
    await page.waitForURL(/\/inbox/, { timeout: 20000 })
    await page.getByRole('link', { name: /new message/i }).click()
    await expect(page).toHaveURL(/\/conversations\/new$/)
  })
})
