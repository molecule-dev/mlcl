/**
 * Per-page spec for /compose. Verifies form rendering, recipient chip
 * behavior, send round-trips to /api/emails/send, draft auto-save POST.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /compose renders to/subject/body fields and a Send button', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/compose')
  await expect(page.locator('[data-mol-id="compose-to-input"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="compose-subject"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="compose-body"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="compose-send"]')).toBeVisible()
})

test('Pressing Enter in the To input adds a recipient chip', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/compose')
  await page.locator('[data-mol-id="compose-to-input"]').fill('chip@flagship.test')
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-mol-id="compose-recipient-chip"]').first()).toBeVisible()
})

test('Send posts /api/emails/send and the message lands in /sent', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/compose')
  await page.locator('[data-mol-id="compose-to-input"]').fill('compose@flagship.test')
  await page.keyboard.press('Enter')
  const subject = `Compose spec ${Date.now()}`
  await page.locator('[data-mol-id="compose-subject"]').fill(subject)
  await page.locator('[data-mol-id="compose-body"]').fill('Composed body.')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="compose-send"]').click()
    await page.waitForTimeout(2000)
  })
  expect(
    reqs.some(
      (r) =>
        /\/api\/emails\/send$/.test(r.url) &&
        r.method === 'POST' &&
        r.status >= 200 &&
        r.status < 300,
    ),
  ).toBe(true)
  const sent = await listEmails(page, accessToken, { folder: 'sent', limit: 50 })
  expect(sent.find((e) => e.subject === subject)).toBeTruthy()
})

test('Auto-save creates a draft via POST /api/drafts after typing', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/compose')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="compose-subject"]').fill('Auto-save test')
    await page.locator('[data-mol-id="compose-body"]').fill('Body content for auto-save.')
    await page.waitForTimeout(7000)
  })
  expect(
    reqs.some(
      (r) =>
        /\/api\/drafts(?:\/[^?#]+)?$/.test(r.url) &&
        (r.method === 'POST' || r.method === 'PUT') &&
        r.status >= 200 &&
        r.status < 300,
    ),
  ).toBe(true)
})

test('Discard button navigates back to /drafts', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/compose')
  await page.locator('[data-mol-id="compose-subject"]').fill('Discard me')
  await page.locator('[data-mol-id="compose-discard"]').click()
  await expect(page).toHaveURL(/\/drafts/, { timeout: 5_000 })
})

test('Auto-save indicator updates after typing', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/compose')
  await page.locator('[data-mol-id="compose-subject"]').fill('Saving indicator test')
  await page.locator('[data-mol-id="compose-body"]').fill('Body')
  await page.waitForTimeout(6000)
  const txt = (await page.locator('[data-mol-id="compose-saving"]').innerText()).toLowerCase()
  expect(txt).toMatch(/saved|saving|draft/)
})

test('Compose-back link returns to /inbox', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/compose')
  await page.locator('[data-mol-id="compose-back"]').click()
  await expect(page).toHaveURL(/\/inbox/)
})
