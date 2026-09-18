import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, escapeRegExp, getVitalsSnapshot, signup } from './_helpers.js'

test.describe('/dashboard — Patient/provider home', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Greets the signed-in user by name and shows Solace shell nav', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    // h1 only — h2 inside PatientVitalsHero shows the same greeting at editorial scale.
    await expect(
      page.getByRole('heading', { level: 1, name: /good (morning|afternoon|evening), Test User/i }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/care without the commute/i)).toBeVisible()
    // Shell nav links — scope to the primary navigation landmark to avoid
    // colliding with KPI tile labels in the hero (Patients, Messages, …).
    const nav = page.getByRole('navigation', { name: /primary navigation/i })
    for (const label of [
      'Dashboard',
      'Appointments',
      'Patients',
      'Records',
      'Prescriptions',
      'Messages',
      'Notifications',
      'Settings',
    ]) {
      await expect(nav.getByRole('link', { name: new RegExp(`^${label}$`, 'i') })).toBeVisible()
    }
  })

  test('Hero KPI tiles render with real data after seed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    // The hero panel renders four labels (Patients / Today / Messages / Rx open).
    // Scope to the heading-level-2 ancestor to avoid the nav link "Messages".
    const main = page.getByRole('main')
    await expect(main.getByText('Patients', { exact: true }).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(main.getByText('Today', { exact: true }).first()).toBeVisible()
    await expect(main.getByText('Messages', { exact: true }).first()).toBeVisible()
    await expect(main.getByText('Rx open', { exact: true })).toBeVisible()
  })

  test('"Up next today" + "Flagged patients" + Priority sections render after seed', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /up next today/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('heading', { name: /flagged patients/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /priority/i })).toBeVisible()
  })

  test('"View all" link routes to /appointments', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /view all/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/appointments$/)
  })

  test('"All patients →" routes to /patients', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /all patients/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/patients$/)
  })

  test('Last-vitals snapshot renders the values /api/reports/vitals-snapshot returns', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // The chips must show what the API measured — read them from the same
    // endpoint the hero reads rather than hardcoding the starter lab's values.
    const chips = await getVitalsSnapshot(page, accessToken)
    await page.goto(APP_BASE + '/dashboard')
    // Hero renders each chip as `<value><span>unit</span>` so the paragraph
    // text is concatenated (e.g. "92mg/dL"). Match value+unit, not bare value.
    for (const chip of chips) {
      await expect(page.getByText(new RegExp(escapeRegExp(chip.label), 'i')).first()).toBeVisible({
        timeout: 15000,
      })
      await expect(
        page
          .getByText(new RegExp(`${escapeRegExp(chip.value)}\\s*${escapeRegExp(chip.unit)}`, 'i'))
          .first(),
      ).toBeVisible()
    }
  })

  test('User menu opens; Sign out logs out and lands on /login', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('button', { name: /open user menu/i }).click()
    const signOut = page
      .getByRole('menuitem', { name: /sign out|log out/i })
      .or(page.getByRole('button', { name: /sign out|log out/i }))
    await expect(signOut.first()).toBeVisible()
    await signOut.first().click()
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 10000 })
  })

  test('On load fires the patient-portal aggregator GETs that the hero needs', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(
        page.getByRole('heading', {
          level: 1,
          name: /good (morning|afternoon|evening), Test User/i,
        }),
      ).toBeVisible({ timeout: 15000 })
    })
    const required = [
      /\/api\/appointments(\?|$)/,
      /\/api\/reports\/vitals(\?|$|-snapshot)/,
      /\/api\/profile\/me(\?|$)/,
    ]
    for (const rx of required) {
      const hit = reqs.find((r) => r.method === 'GET' && rx.test(r.url))
      expect(hit, `dashboard must call ${rx}`).toBeTruthy()
      expect(hit!.status).toBeLessThan(500)
    }
  })
})
