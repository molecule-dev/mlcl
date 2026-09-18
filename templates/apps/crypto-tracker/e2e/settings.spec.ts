import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { signup, setInputValue } from './_helpers'

test('settings preferences round-trip: change quote currency + refresh, save, reload, persisted', async ({
  page,
}) => {
  await signup(page)
  await page.goto('/settings')
  await page.getByTestId('settings-nav-preferences').click()

  // Change values via React onChange
  await setInputValue(page, '[data-testid="settings-quote-currency"]', 'EUR')
  await setInputValue(page, '[data-testid="settings-refresh"]', '60')

  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 8_000 })

  // Backend invariant: GET reflects new values
  const after = await page.evaluate(async () => {
    const r = await fetch('/api/preferences')
    return r.json()
  })
  expect(after.quote_currency).toBe('EUR')
  expect(after.refresh_seconds).toBe(60)

  // Reload — still reflects (server-backed, not local state)
  await page.reload()
  await page.getByTestId('settings-nav-preferences').click()
  await expect(page.locator('[data-testid="settings-quote-currency"]')).toHaveValue('EUR')
  await expect(page.locator('[data-testid="settings-refresh"]')).toHaveValue('60')
})

test('settings notification toggles persist across reload', async ({ page }) => {
  await signup(page)
  await page.goto('/settings')
  await page.getByTestId('settings-nav-preferences').click()

  // Default: email=true, push=false. Flip both.
  const email = page.getByTestId('settings-notify-email')
  const push = page.getByTestId('settings-notify-push')
  const before = { email: await email.isChecked(), push: await push.isChecked() }
  expect(before.email).toBe(true)
  expect(before.push).toBe(false)

  await email.click()
  await push.click()

  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 8_000 })

  await page.reload()
  await page.getByTestId('settings-nav-preferences').click()
  await expect(page.getByTestId('settings-notify-email')).not.toBeChecked()
  await expect(page.getByTestId('settings-notify-push')).toBeChecked()
})
