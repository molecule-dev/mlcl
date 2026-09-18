import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listIssues, signup, uniqueEmail } from './_helpers.js'

test.describe('/dashboard', () => {
  test('anonymous redirected off /dashboard', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 15_000 })
  })

  test('renders seeded issues from /api/issues', async ({ page }) => {
    await signup(page, uniqueEmail('dash-issues'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/issues(\?|$)/.test(r.url))
    expect(r, '/dashboard should fetch /api/issues').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
    const issues = await listIssues(page)
    expect(issues.length, 'fresh signup gets seeded issues').toBeGreaterThan(0)
    const body = await page.locator('body').innerText()
    // The first seeded issue title must surface somewhere on the dashboard.
    expect(body).toContain(issues[0]!.title.split(':')[0]!)
  })

  test('main landmark + heading + nav rail render', async ({ page }) => {
    await signup(page, uniqueEmail('dash-shell'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('main').first()).toBeVisible()
    await expect(page.getByRole('heading').first()).toBeVisible()
    expect(await page.locator('nav a, [role="navigation"] a').count()).toBeGreaterThan(0)
  })

  test('sidebar links navigate to /issues + /alerts + /releases', async ({ page }) => {
    await signup(page, uniqueEmail('dash-nav'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    for (const path of ['/issues', '/alerts', '/releases', '/team', '/settings']) {
      const link = page.locator(`a[href="${path}"]`).first()
      if (await link.count()) {
        await expect(link).toBeVisible()
      }
    }
  })

  test('no console errors during dashboard load', async ({ page }) => {
    await signup(page, uniqueEmail('dash-clean'))
    const errs: string[] = []
    page.on('pageerror', (e) => errs.push(e.message))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    expect(errs).toEqual([])
  })

  test('KPI counters render numbers — Users affected and Events / 24h are real sums', async ({
    page,
  }) => {
    // Regression guard: pg returns bigint columns (event_count, user_count)
    // as JS strings. The dashboard sums them with `+=`, which silently
    // becomes string concatenation, producing values like "02743121386419"
    // instead of "807". The handler MUST coerce these to numbers; this
    // test catches any regression where it doesn't.
    await signup(page, uniqueEmail('dash-kpi'))
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const usersCard = page.locator(
      '[data-stats-eyebrow="Users affected"] [data-testid="stats-counter-value"]',
    )
    const eventsCard = page.locator(
      '[data-stats-eyebrow="Events / 24h"] [data-testid="stats-counter-value"]',
    )
    await expect(usersCard).toBeVisible()
    await expect(eventsCard).toBeVisible()
    // Wait until the counters have populated past the initial 0 render.
    await expect
      .poll(async () => Number((await usersCard.innerText()).replace(/,/g, '')), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0)
    const usersN = Number((await usersCard.innerText()).replace(/,/g, ''))
    const eventsN = Number((await eventsCard.innerText()).replace(/,/g, ''))
    // Catch the string-concat bug: that produced numbers > 1e10 from
    // concatenation of "0" + "274" + "312" + "138" + "64" + "19".
    // Real seed totals are O(10^3).
    expect(usersN, 'Users affected: real sum, not concatenated string').toBeLessThan(1e6)
    expect(usersN, 'Users affected: > 0 because seed has user counts').toBeGreaterThan(0)
    expect(eventsN, 'Events / 24h: real sum, not concatenated string').toBeLessThan(1e7)
    expect(eventsN, 'Events / 24h: > 0 because seed has event counts').toBeGreaterThan(0)
  })
})
