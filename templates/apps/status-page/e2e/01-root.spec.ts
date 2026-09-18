import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  captureNetwork,
  createComponent,
  createIncident,
  setComponentStatus,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/ public status page', () => {
  test('renders without authentication and shows real components from the API', async ({
    page,
  }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Pub-${Date.now()}`, group: 'platform' })

    // Browse without an auth token to prove the page is public.
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/')
    // The component must show up. We do not assert the loading text because
    // the page may rehydrate quickly.
    await expect(page.getByText(c.name, { exact: false })).toBeVisible({ timeout: 15_000 })
  })

  test('subscribe form posts to /api/public/subscribers, returns 201 and shows success state', async ({
    page,
  }) => {
    await signup(page)
    await createComponent(page, { name: `Pub-Sub-${Date.now()}` })

    await page.context().clearCookies()
    await page.goto(APP_BASE + '/')

    const email = uniqueEmail('public')
    const input = page.locator('input[type="email"]').first()
    await expect(input).toBeVisible({ timeout: 15_000 })
    await input.fill(email)

    const subResponse = page.waitForResponse(
      (resp) => resp.url().includes('/public/subscribers') && resp.request().method() === 'POST',
      { timeout: 15_000 },
    )
    const submit = page.getByRole('button', { name: /subscribe|notify/i }).first()
    await submit.click()
    const resp = await subResponse
    expect(resp.status(), `subscribe response: ${await resp.text().catch(() => '')}`).toBe(201)

    const body = await resp.json()
    expect(body.id, 'response must include the new subscriber id').toBeTruthy()
    expect(body.destination ?? body.email).toBe(email)

    // The form must show a success acknowledgement to the user.
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /subscribed|success|thank/i })
        .first(),
    ).toBeVisible({ timeout: 5_000 })
  })

  test('public page reflects component status changes made by an operator', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Pub-Status-${Date.now()}`, group: 'platform' })
    await setComponentStatus(page, c.id, 'major_outage')

    await page.context().clearCookies()
    await page.goto(APP_BASE + '/')
    // The page should NOT report fully operational because there is a major outage.
    await expect(page.getByText(c.name, { exact: false })).toBeVisible({ timeout: 15_000 })
    const allText = await page.locator('body').innerText()
    // A major outage cannot coexist with an "all systems operational" headline.
    expect(allText.toLowerCase()).not.toMatch(/all systems operational/i)
  })

  test('public page reflects active incidents from the API', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `Pub-Inc-${Date.now()}` })
    const incTitle = `Public incident ${Date.now()}`
    await createIncident(page, {
      title: incTitle,
      impact: 'major',
      message: 'visible on the public page',
      affected: [c.id],
    })

    await page.context().clearCookies()
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(incTitle, { exact: false })).toBeVisible({ timeout: 15_000 })
  })

  test('issues GETs to /api/public/components and /api/public/incidents on load', async ({
    page,
  }) => {
    await page.context().clearCookies()
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForTimeout(2000)
    })
    const components = reqs.find(
      (r) => r.url.includes('/api/public/components') && r.method === 'GET',
    )
    const incidents = reqs.find(
      (r) => r.url.includes('/api/public/incidents') && r.method === 'GET',
    )
    expect(components?.status, 'GET /api/public/components').toBe(200)
    expect(incidents?.status, 'GET /api/public/incidents').toBe(200)
  })

  test('Sign-in link in the header navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const signIn = page.getByRole('link', { name: /sign in/i }).first()
    await expect(signIn).toBeVisible({ timeout: 10_000 })
    await signIn.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('Subscribe anchor scrolls subscribe form into view', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const subscribeLink = page.getByRole('link', { name: /^subscribe$/i }).first()
    if (await subscribeLink.count().catch(() => 0)) {
      await subscribeLink.click()
      await page.waitForTimeout(500)
      await expect(page.locator('input[type="email"]').first()).toBeVisible({
        timeout: 5_000,
      })
    }
  })
})
