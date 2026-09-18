import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listAuditFiltered, signup, uniqueEmail } from './_helpers.js'

test.describe('/subscribers', () => {
  test('Invite form creates a subscriber and the row appears in the list with audit', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/subscribers')

    await page.getByTestId('invite-subscriber-btn').click()
    await expect(page.getByTestId('invite-subscriber-form')).toBeVisible()

    const dest = uniqueEmail('subs-ui')
    await page.getByTestId('invite-channel').selectOption('email')
    await page.getByTestId('invite-destination').fill(dest)
    await page.getByTestId('invite-notification-incidents').click()

    const respPromise = page.waitForResponse(
      (r) => r.url().endsWith('/subscribers') && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByTestId('invite-submit').click()
    const resp = await respPromise
    expect(resp.status(), `POST /subscribers: ${await resp.text().catch(() => '')}`).toBe(201)

    await expect(page.getByText(dest, { exact: false })).toBeVisible({ timeout: 5_000 })

    const audit = await listAuditFiltered(page, {
      scope: 'subscribers',
      action: 'subscriber.create',
    })
    expect(audit.length, 'subscriber.create audit row').toBeGreaterThan(0)
  })

  test('Invite is disabled until destination is provided', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/subscribers')
    await page.getByTestId('invite-subscriber-btn').click()
    await expect(page.getByTestId('invite-submit')).toBeDisabled()
  })

  test('issues GET /api/subscribers on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/subscribers')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => /\/api\/subscribers(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/subscribers').toBe(200)
  })
})
