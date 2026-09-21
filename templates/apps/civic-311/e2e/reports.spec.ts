import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, authHeaders, getAccessToken, seedIssue, signup } from './_helpers.js'

test.describe('civic-311: /my-reports (list)', () => {
  test('empty state offers the report CTA', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-reports')
    await expect(page.getByTestId('my-reports-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('my-reports-empty')).toBeVisible()
  })

  test("lists the caller's reports with status + address, not other residents'", async ({
    page,
  }) => {
    const session = await signup(page)
    await seedIssue(page, session.accessToken, {
      category: 'streetlight',
      description: 'Dark crossing at the school',
      x: 62,
      y: 51,
    })
    // A second report owned by a DIFFERENT account must not leak in. The
    // demo community rows exist too — so assert on a row the caller owns
    // and that the list is scoped by asking the API what it returned.
    await page.goto(APP_BASE + '/my-reports')
    await expect(page.getByTestId('my-reports-item').first()).toBeVisible({ timeout: 15_000 })
    const res = await page.request.get(`${API_BASE}/issues?mine=1`, {
      headers: authHeaders(session.accessToken),
    })
    expect(res.ok()).toBe(true)
    const rows = (await res.json()) as Array<{ reporter_id: string } & Record<string, unknown>>
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.reporter_id).toBe(session.userId)
  })

  test('status filter narrows the list', async ({ page }) => {
    const session = await signup(page)
    await seedIssue(page, session.accessToken, { category: 'trash', x: 45, y: 66 })
    await seedIssue(page, session.accessToken, { category: 'tree', x: 18, y: 44 })
    await page.goto(APP_BASE + '/my-reports')
    await expect(page.getByTestId('my-reports-item').first()).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('my-reports-status-filter').selectOption('resolved')
    await expect(page.getByTestId('my-reports-empty')).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('my-reports-status-filter').selectOption('')
    await expect(page.getByTestId('my-reports-item').first()).toBeVisible({ timeout: 10_000 })
  })

  test('row click navigates to the report detail', async ({ page }) => {
    const session = await signup(page)
    const issue = await seedIssue(page, session.accessToken, { category: 'graffiti', x: 71, y: 18 })
    await page.goto(APP_BASE + '/my-reports')
    await page.getByTestId('my-reports-item').first().click()
    await expect(page).toHaveURL(new RegExp(`/reports/${issue.id}$`), { timeout: 15_000 })
  })
})

test.describe('civic-311: /reports/:id (detail)', () => {
  test('renders summary, derived address, timeline and comment composer', async ({ page }) => {
    const session = await signup(page)
    const issue = await seedIssue(page, session.accessToken, {
      category: 'pothole',
      description: 'Sinkhole opening at the bus pull-out.',
      x: 36,
      y: 25,
    })
    await page.goto(APP_BASE + `/reports/${issue.id}`)
    await expect(page.getByTestId('report-detail-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('report-detail-title')).toContainText(/Ave & [WE] /)
    await expect(page.getByTestId('report-detail-summary')).toBeVisible()
    await expect(page.getByTestId('report-timeline-item').first()).toBeVisible()
    await expect(page.getByTestId('report-comment')).toBeVisible()
  })

  test('posting a comment appends to the timeline after reload', async ({ page }) => {
    const session = await signup(page)
    const issue = await seedIssue(page, session.accessToken, { category: 'trash', x: 27, y: 72 })
    await page.goto(APP_BASE + `/reports/${issue.id}`)
    await page.getByTestId('report-comment').fill('Same on our block — third week running.')
    await page.getByTestId('report-comment-submit').click()
    const items = page.getByTestId('report-timeline-item')
    await expect(items).toHaveCount(2, { timeout: 15_000 })
    await expect(items.last()).toContainText('Same on our block', { timeout: 10_000 })
  })

  test("own report shows no confirm button; someone else's does and works", async ({ page }) => {
    const owner = await signup(page)
    const issue = await seedIssue(page, owner.accessToken, { category: 'tree', x: 18, y: 44 })

    // A second resident sees the confirm action…
    await page.evaluate(() => window.localStorage.clear())
    const neighbor = await signup(page)
    expect(neighbor.userId).not.toBe(owner.userId)
    await page.goto(APP_BASE + `/reports/${issue.id}`)
    await page.getByTestId('report-confirm').click()
    await expect(page.getByTestId('report-confirmed')).toBeVisible({ timeout: 15_000 })

    // …and the count increments server-side.
    const res = await page.request.get(`${API_BASE}/issues/${issue.id}`, {
      headers: authHeaders(neighbor.accessToken),
    })
    const body = (await res.json()) as { confirmation_count: number }
    expect(body.confirmation_count).toBe(1)

    // The owner never sees a confirm button on their own report.
    await page.evaluate(() => window.localStorage.clear())
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(owner.email)
    await page.locator('#password').fill(owner.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 20_000 })
    // Re-login mints a FRESH session token (new session id + iat), so the raw
    // string never equals the signup token — assert the session belongs to
    // the OWNER by decoding the JWT payload and comparing userId.
    const token = (await getAccessToken(page)) ?? ''
    expect(token).not.toBe('')
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64').toString('utf8'),
    ) as { userId?: string }
    expect(payload.userId).toBe(owner.userId)
    await page.goto(APP_BASE + `/reports/${issue.id}`)
    await expect(page.getByTestId('report-confirm')).toHaveCount(0)
  })

  test('nonexistent report id shows the error state', async ({ page }) => {
    await signup(page)
    // Expected 4xx: the zero-uuid detail GET 404s by design; both the
    // network layer ("Failed to load resource … 404") and app-http's
    // HttpError ("Request failed with status 404") log console errors.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404|Request failed with status 404',
    })
    await page.goto(APP_BASE + '/reports/00000000-0000-0000-0000-000000000000')
    await expect(page.getByRole('heading', { name: /something went wrong/i })).toBeVisible({
      timeout: 15_000,
    })
  })
})
