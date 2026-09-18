/**
 * /settings — preferences (slider goal, difficulty radios, study-mode
 * checkboxes) persist via localStorage. Verifies that toggling a value
 * + Save survives a reload (the contract: state actually persists).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('/settings renders 8 sub-section nav links + initial Preferences pane', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)
  await expect(page.locator('[data-mol-id="settings-section-preferences"]')).toBeVisible()
  for (const s of [
    'preferences',
    'reminders',
    'account',
    'profile',
    'notifications',
    'tutor',
    'privacy',
    'billing',
  ]) {
    await expect(page.locator(`[data-mol-id="settings-nav-${s}"]`)).toBeVisible()
  }
})

test('/settings sub-section nav routes to ?s= and renders the matching pane', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)
  await page.locator('[data-mol-id="settings-nav-reminders"]').click()
  await expect(page).toHaveURL(/\/settings\?s=reminders/)
  await expect(page.locator('[data-mol-id="settings-section-reminders"]')).toBeVisible()
})

test('/settings preferences edits persist across reload', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)

  // Drag goal slider — set value via the React-friendly native setter so
  // React's value-tracker actually fires its onChange handler.
  const goalInput = page.locator('input[type="range"]#goal').first()
  await goalInput.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '90')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })

  // Toggle "hard" difficulty radio
  await page.locator('input[type="radio"][value="hard"]').click()

  // Save
  await page.getByRole('button', { name: /^save changes$/i }).click()
  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 5_000 })

  // Reload → both values should persist (localStorage is the contract)
  await page.reload()
  await expect(page.locator('input[type="range"]#goal')).toHaveValue('90')
  await expect(page.locator('input[type="radio"][value="hard"]')).toBeChecked()
})

test('/settings calls /api/profile on mount to verify session', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/settings`)
    await expect(page.locator('[data-mol-id="settings-section-preferences"]')).toBeVisible()
  })
  expect(reqs.find((r) => /\/api\/profile/.test(r.url) && r.method === 'GET')?.status).toBe(200)
})

for (const sec of ['account', 'profile', 'notifications', 'tutor', 'privacy', 'billing'] as const) {
  test(`/settings ${sec} sub-section nav routes to ?s=${sec} and shows that pane`, async ({
    page,
  }) => {
    await signup(page)
    await page.goto(`${APP_BASE}/settings`)
    await page.locator(`[data-mol-id="settings-nav-${sec}"]`).click()
    await expect(page).toHaveURL(new RegExp(`/settings\\?s=${sec}`))
    await expect(page.locator(`[data-mol-id="settings-section-${sec}"]`)).toBeVisible()
  })
}

test('/settings study-mode checkbox toggle persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)
  // Default state has all 4 modes checked. Untick "reading".
  const checkboxes = page.locator('input[type="checkbox"]')
  const reading = checkboxes.nth(2)
  await expect(reading).toBeChecked()
  await reading.uncheck()
  await page.getByRole('button', { name: /^save changes$/i }).click()
  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 5_000 })
  await page.reload()
  await expect(page.locator('input[type="checkbox"]').nth(2)).not.toBeChecked()
})

test('/settings reminders pane: time input + streak freeze + weekend leniency toggles persist', async ({
  page,
}) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings?s=reminders`)
  const timeInput = page.locator('input[type="time"]')
  await timeInput.fill('07:30')
  // Toggle streak freeze switch (was on by default → flip to off)
  await page.getByRole('switch', { name: /streak freeze available/i }).click()
  await page.getByRole('switch', { name: /weekend leniency/i }).click()
  await page.getByRole('button', { name: /^save changes$/i }).click()
  await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 5_000 })
  await page.reload()
  await page.locator('[data-mol-id="settings-nav-reminders"]').click()
  await expect(page.locator('input[type="time"]')).toHaveValue('07:30')
  await expect(page.getByRole('switch', { name: /streak freeze available/i })).toHaveAttribute(
    'aria-checked',
    'false',
  )
  await expect(page.getByRole('switch', { name: /weekend leniency/i })).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

test('/settings cancel button reverts pending edits without saving', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)
  const goalInput = page.locator('input[type="range"]#goal').first()
  await goalInput.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '105')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await expect(goalInput).toHaveValue('105')
  await page.getByRole('button', { name: /^cancel$/i }).click()
  await expect(goalInput).toHaveValue('45')
})

test('/settings page-settings container renders for an authed user', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)
  await expect(page.locator('[data-mol-id="page-settings"]')).toBeVisible()
})

test('/settings difficulty radio "easy" can be selected', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)
  // default is medium — flip to easy
  await page.locator('input[type="radio"][value="easy"]').click()
  await expect(page.locator('input[type="radio"][value="easy"]')).toBeChecked()
})

test('/settings goal slider updates pending value to 60', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings`)
  const goalInput = page.locator('input[type="range"]#goal').first()
  await goalInput.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '60')
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await expect(goalInput).toHaveValue('60')
})

test('/settings reminders pane "streak freeze" switch toggles aria-checked', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/settings?s=reminders`)
  const switchEl = page.getByRole('switch', { name: /streak freeze available/i })
  const before = await switchEl.getAttribute('aria-checked')
  await switchEl.click()
  const after = await switchEl.getAttribute('aria-checked')
  expect(after).not.toBe(before)
})
