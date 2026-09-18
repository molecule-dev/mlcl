import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { signup } from './_helpers.js'

test('Compose page renders the form shell with To, Subject, Body, and Save', async ({ page }) => {
  await signup(page)
  await page.goto('/compose')
  await expect(page.locator('[data-mol-id="compose-page"]')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[data-mol-id="compose-to-input"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="compose-subject"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="compose-body"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="compose-save-draft"]')).toBeVisible()
})

test('Compose Cc/Bcc toggle reveals additional recipient inputs', async ({ page }) => {
  await signup(page)
  await page.goto('/compose')
  const toggle = page.locator('[data-mol-id="compose-toggle-cc-bcc"]')
  await expect(toggle).toBeVisible({ timeout: 10_000 })
  await toggle.click()
  // After toggling, Cc + Bcc inputs become visible. The implementation
  // uses additional inputs that are not present before the toggle.
  await expect(page.getByPlaceholder(/cc|bcc/i).first()).toBeVisible({ timeout: 5_000 })
})

test('Compose subject + body inputs accept user-typed text', async ({ page }) => {
  await signup(page)
  await page.goto('/compose')
  const subject = page.locator('[data-mol-id="compose-subject"]')
  const body = page.locator('[data-mol-id="compose-body"]')
  await subject.fill('Hello Compose subject')
  await body.fill('Compose body content typed by the user.')
  await expect(subject).toHaveValue('Hello Compose subject')
  await expect(body).toHaveValue('Compose body content typed by the user.')
})

test('Compose AI suggestion buttons (concise/friendly/summarize) are wired', async ({ page }) => {
  await signup(page)
  await page.goto('/compose')
  await expect(page.locator('[data-mol-id="compose-suggestion-concise"]')).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.locator('[data-mol-id="compose-suggestion-friendly"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="compose-suggestion-summarize"]')).toBeVisible()
})

test('Compose Send button is present alongside Save', async ({ page }) => {
  await signup(page)
  await page.goto('/compose')
  await expect(page.locator('[data-mol-id="compose-send"]')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-mol-id="compose-save-draft"]')).toBeVisible()
})
