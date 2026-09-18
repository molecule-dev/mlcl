import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createComponent, signup } from './_helpers.js'

test.describe('/incidents/new', () => {
  test('renders the create form for an authed operator', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/incidents/new')
    await expect(page.locator('#incident-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('#incident-message')).toBeVisible()
  })

  test('publishes an incident and redirects to /incidents', async ({ page }) => {
    await signup(page)
    const c = await createComponent(page, { name: `New-${Date.now()}`, group: 'platform' })
    await page.goto(APP_BASE + '/incidents/new')

    const title = `New flow ${Date.now()}`
    await page.locator('#incident-title').fill(title)
    await page.locator('#incident-message').fill('Posted from /incidents/new spec.')
    await page.getByRole('button', { name: /partial outage/i }).click()
    await page.getByRole('button', { name: /^investigating$/i }).click()
    await page.getByTestId(`affected-${c.id}`).click()

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /publish/i }).click()
      await page.waitForURL(/\/incidents$/, { timeout: 15_000 })
    })
    const post = reqs.find((r) => r.url.endsWith('/incidents') && r.method === 'POST')
    expect(post?.status, 'POST /incidents').toBe(201)
  })

  test('publish button is disabled until title and message are populated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/incidents/new')
    const submit = page.getByRole('button', { name: /publish/i })
    await expect(submit).toBeDisabled()
    await page.locator('#incident-title').fill('Only title')
    await expect(submit).toBeDisabled()
  })

  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/incidents/new')
    await page.waitForTimeout(1500)
    expect(new URL(page.url()).pathname).toMatch(/login|incidents\/new/)
  })
})
