import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('/settings page renders the Settings shell heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(
    page.getByRole('heading', { name: /settings|profile|account/i }).first(),
  ).toBeVisible()
})

test('Updating profile name persists through GET /api/profile/me (round-trip)', async ({
  page,
}) => {
  await signup(page)
  const before = await api<{ name: string | null; email: string }>(page, 'GET', '/profile/me')
  expect(before.email).toBeTruthy()
  const newName = `Renamed ${Date.now()}`
  const updated = await api<{ name: string }>(page, 'PATCH', '/profile/me', { name: newName })
  expect(updated.name).toBe(newName)
  const after = await api<{ name: string }>(page, 'GET', '/profile/me')
  expect(after.name).toBe(newName)
})

test('GET /api/profile/me returns the signup email for the signed-in session', async ({ page }) => {
  const { email } = await signup(page)
  const me = await api<{ email: string }>(page, 'GET', '/profile/me')
  expect(me.email).toBe(email)
})

test('Theme toggle flips data-mol-mode on <html>, re-skins the page, and survives reload', async ({
  page,
}) => {
  // The ThemeToggle button is rendered on the auth pages (Login/Signup/
  // ForgotPassword/ResetPassword). The css-variables theme provider sets
  // `data-mol-mode="light|dark"` on <html>, AND the per-app theme.css
  // exposes light/dark variants of `--color-background` keyed off that
  // attribute. Both must move for the toggle to be user-visible.
  await page.goto(APP_BASE + '/login')
  const readState = () =>
    page.evaluate(() => ({
      mode: document.documentElement.getAttribute('data-mol-mode'),
      bg: getComputedStyle(document.body).backgroundColor,
    }))
  const before = await readState()
  expect(before.mode, 'theme provider has applied a mode').toMatch(/light|dark/)
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await page.waitForTimeout(300)
  const after = await readState()
  expect(after.mode).not.toBe(before.mode)
  expect(after.mode).toMatch(/light|dark/)
  // The body background MUST visibly change. Asserting only on the data
  // attribute would let a no-op CSS slip through (the page would flip the
  // attribute but render identically — see ai-image-generator's stub).
  expect(after.bg, 'background color must change with mode').not.toBe(before.bg)
  await page.reload()
  await page.waitForLoadState('networkidle').catch(() => {})
  const persisted = await readState()
  expect(persisted.mode, 'theme persists across reload').toBe(after.mode)
  expect(persisted.bg, 'theme bg persists across reload').toBe(after.bg)
})

test('Settings theme dropdown re-skins the page (data-mol-mode + bg) and persists across reload', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-test="settings-section-preferences"]').click()
  await page.waitForTimeout(250)
  // Pick the opposite of the current mode so the test is deterministic
  // regardless of OS preference / leftover localStorage from sibling specs.
  const initialMode = await page.evaluate(() =>
    document.documentElement.getAttribute('data-mol-mode'),
  )
  const target = initialMode === 'dark' ? 'light' : 'dark'
  await page.locator('[data-test="settings-theme"]').selectOption(target)
  await page.waitForTimeout(250)
  const afterSelect = await page.evaluate(() => ({
    mode: document.documentElement.getAttribute('data-mol-mode'),
    bg: getComputedStyle(document.body).backgroundColor,
  }))
  expect(afterSelect.mode, 'data-mol-mode follows the dropdown').toBe(target)
  await page.locator('[data-test="settings-save"]').click()
  await page.waitForTimeout(800)
  await page.reload()
  await page.waitForLoadState('networkidle').catch(() => {})
  const reloaded = await page.evaluate(() => ({
    mode: document.documentElement.getAttribute('data-mol-mode'),
    bg: getComputedStyle(document.body).backgroundColor,
  }))
  // Backend persisted theme via PATCH /api/profile/me; on next mount the
  // Settings useEffect calls setMolTheme() with the saved value.
  expect(reloaded.mode, 'theme persists across reload via /api/profile/me').toBe(target)
  expect(reloaded.bg, 'reskin persists across reload').toBe(afterSelect.bg)
})

test('observation invariant: /settings fires GET /api/profile/me on page load', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  expect(reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'GET')).toBeTruthy()
})
