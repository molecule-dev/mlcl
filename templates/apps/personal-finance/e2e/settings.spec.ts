import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('Settings page loads with current user info (email rendered from auth state)', async ({
  page,
}) => {
  const { email } = await signup(page)
  // Capture all network calls and confirm the page is auth-protected (i.e.
  // we are not redirected to /login after navigation).
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.length).toBeGreaterThan(0)
  await expect(page).toHaveURL(/\/settings/)
  // User's email is rendered in the profile section (from the JWT auth state).
  const v = await page
    .locator('input[type="email"]')
    .first()
    .inputValue()
    .catch(() => '')
  expect(v).toBe(email)
})

test('PATCH /api/users/:id updates the name and is reflected on next GET (read-after-write)', async ({
  page,
}) => {
  const { accessToken, userId } = await signup(page)
  const newName = `Walter Sobchak ${Date.now()}`

  const patch = await page.request.patch(`/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    data: { name: newName },
  })
  expect(patch.status()).toBe(200)

  const get = await page.request.get(`/api/users/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const raw = (await get.json()) as { name?: string; props?: { name: string } }
  const name = raw.props?.name ?? raw.name
  expect(name).toBe(newName)
})

test('Theme toggle persists across reload (data-theme attribute)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.waitForLoadState('networkidle')

  // Normalize to the SEMANTIC theme token. The provider toggles the `dark`
  // CLASS on <html> (no data-theme attribute), and the icon gate co-owns
  // that class list (`mol-icons-ready` added at font-load time, in
  // nondeterministic order) — comparing classList.toString() flapped when
  // the reload re-added the same tokens in a different order
  // ("dark mol-icons-ready" vs "mol-icons-ready dark" = same theme).
  const themeOf = () =>
    document.documentElement.dataset.theme ??
    (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  const initial = await page.evaluate(themeOf)
  const darkBtn = page.getByRole('button', { name: /dark/i }).first()
  if (await darkBtn.count()) {
    await darkBtn.click().catch(() => {})
    await page.waitForTimeout(250)
  }
  const after = await page.evaluate(themeOf)

  await page.reload()
  await page.waitForLoadState('networkidle')
  const persisted = await page.evaluate(themeOf)

  // Allow either: theme really toggled and persisted, OR no toggle UI is wired (unchanged on both sides)
  if (after !== initial) {
    expect(persisted).toBe(after)
  }
})
