import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, signup } from './_helpers'

test.describe('/journal/new', () => {
  test('renders composer heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    await expect(page.getByRole('heading', { level: 1, name: /Today.s reflection/i })).toBeVisible()
  })

  test('"Back to journal" link points to /journal', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const link = page.getByRole('link', { name: /Back to journal/i })
    expect(await link.getAttribute('href')).toBe('/journal')
  })

  test('mood Radiant button is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const r = page.getByRole('button', { name: /^Radiant$/ })
    await expect(r).toBeVisible()
    await r.click()
  })

  test('mood Good is the default selection', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const good = page.getByRole('button', { name: /^Good$/ })
    await expect(good).toBeVisible()
  })

  test('mood Struggling button is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const s = page.getByRole('button', { name: /^Struggling$/ })
    await expect(s).toBeVisible()
    await s.click()
  })

  test('title field accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const t = page.getByPlaceholder(/Give this reflection a name/i)
    await t.fill('My first reflection')
    await expect(t).toHaveValue('My first reflection')
  })

  test('body textarea accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const b = page.getByPlaceholder(/Write whatever feels honest/i)
    await b.fill('A few words about today.')
    await expect(b).toHaveValue('A few words about today.')
  })

  test('tag field accepts a tag and Enter', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const t = page.getByPlaceholder(/Add a tag and press enter/i)
    await t.fill('gratitude')
    await t.press('Enter')
    // tag chip should now appear
    await expect(
      page.getByRole('button', { name: /entryComposer\.removeTag|remove/i }).first(),
    ).toBeVisible()
  })

  test('Save reflection POSTs to /api/journal/entries and persists', async ({ page }) => {
    const creds = await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    await page.getByRole('button', { name: /^Good$/ }).click()
    const title = `E2E entry ${Date.now()}`
    const body = `End-to-end body content ${Date.now()}`
    await page.getByPlaceholder(/Give this reflection a name/i).fill(title)
    await page.getByPlaceholder(/Write whatever feels honest/i).fill(body)
    const saveBtn = page.getByRole('button', { name: /Save reflection/i })
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 })
    // Arm waitForResponse BEFORE click so the POST response is captured
    // even if the network round-trip completes before the listener would
    // otherwise be registered.
    const postResp = page.waitForResponse(
      (r) => r.url().includes('/api/journal/entries') && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await saveBtn.click()
    const resp = await postResp
    expect(resp.status()).toBeLessThan(300)
    // Read-after-write: GET /api/journal/entries from outside the page should include this entry
    const tokenRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    })
    const { accessToken } = (await tokenRes.json()) as { accessToken: string }
    const listRes = await fetch(API_BASE + '/journal/entries', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const list = (await listRes.json()) as Array<{ title: string }>
    expect(
      list.some((e) => e.title === title),
      'created entry exists in /api/journal/entries',
    ).toBe(true)
  })

  test('"See all prompts" link points to /prompts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal/new')
    const link = page.getByRole('link', { name: /See all prompts/i })
    expect(await link.getAttribute('href')).toBe('/prompts')
  })
})
