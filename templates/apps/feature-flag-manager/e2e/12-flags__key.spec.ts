import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiFetch, captureNetwork, pickFlag, signup, waitForSeed } from './_helpers'

// /flags/:key — flag detail page. Loads /api/flags/:key (server resolves
// key→id) plus /api/audit-log scoped to flag_id. Supports inline toggle,
// rollout slider, description edit, rule add/remove, delete.
//
// The flag each spec drives comes from GET /api/flags rather than a key the
// starter seed happens to create, so the suite holds on a replaced workspace.

test.describe('/flags/:key', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/flags/any-flag-key')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders flag identity + GET /api/flags/:key + GET /api/audit-log fired', async ({
    page,
  }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/flags/' + flag.key)
      await page.waitForTimeout(2000)
    })
    const detail = reqs.find(
      (r) => r.method === 'GET' && new RegExp(`/api/flags/${flag.key}`).test(r.url),
    )
    expect(detail, 'GET /api/flags/:key should fire').toBeDefined()
    expect(detail!.status).toBe(200)
    const audit = reqs.find((r) => r.method === 'GET' && /\/api\/audit-log/.test(r.url))
    expect(audit, 'GET /api/audit-log should fire').toBeDefined()
    expect(audit!.status).toBe(200)
    await expect(page.locator('[data-mol-id="flag-detail-key"]')).toContainText(flag.key)
  })

  test('rollout slider + Save Changes PUT /api/flags/:id flips rollout_percentage in DB', async ({
    page,
  }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    await page.goto(APP_BASE + '/flags/' + flag.key)
    await page.waitForTimeout(1500)
    // Drag slider to 23 by setting value directly + dispatching input.
    await page.evaluate(() => {
      const el = document.querySelector(
        '[data-mol-id="flag-detail-rollout-slider"]',
      ) as HTMLInputElement | null
      if (!el) return
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(el, '23')
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="flag-detail-save"]').click()
      await page.waitForTimeout(2000)
    })
    const put = reqs.find(
      (r) =>
        r.method === 'PUT' && /\/api\/flags\/[0-9a-f-]+\b/.test(r.url) && !/toggle$/.test(r.url),
    )
    expect(put, 'PUT /api/flags/:id should fire on save').toBeDefined()
    expect(put!.status).toBe(200)
    // Read-after-write
    const fresh = await apiFetch(page, 'GET', `/flags/${flag.key}`)
    expect((fresh.json as { rollout_percentage: number }).rollout_percentage).toBe(23)
  })

  test('description textarea persists across reload', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    await page.goto(APP_BASE + '/flags/' + flag.key)
    await page.waitForTimeout(1500)
    const newDesc = `edited at ${Date.now()}`
    const ta = page.locator('[data-mol-id="flag-detail-description"]')
    await ta.fill(newDesc)
    await page.locator('[data-mol-id="flag-detail-save"]').click()
    await page.waitForTimeout(1500)
    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-mol-id="flag-detail-description"]')).toHaveValue(newDesc)
  })

  test('Add rule POSTs /api/flags/:id/rules and the rule renders', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    await page.goto(APP_BASE + '/flags/' + flag.key)
    await page.waitForTimeout(1500)
    await page.locator('[data-mol-id="flag-detail-toggle-add-rule"]').click()
    const reqs = await captureNetwork(page, async () => {
      // Click via direct DOM call — the audit panel sits adjacent in the
      // grid and Playwright's hit-test flags the overlap. The button is
      // enabled and visible; this fires the React onClick handler.
      await page.evaluate(() => {
        const btn = document.querySelector(
          '[data-mol-id="flag-detail-save-rule"]',
        ) as HTMLButtonElement | null
        btn?.click()
      })
      await page.waitForTimeout(2000)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/flags\/[0-9a-f-]+\/rules/.test(r.url),
    )
    expect(post, 'POST /rules should fire').toBeDefined()
    expect(post!.status).toBe(201)
    // Read-after-write. `country` is the add-rule form's own default
    // attribute (FlagDetail.tsx), not seeded content.
    const detail = await apiFetch(page, 'GET', `/flags/${flag.key}`)
    const rules = (detail.json as { rules: Array<{ attribute: string }> }).rules ?? []
    expect(rules.length).toBeGreaterThan(0)
    expect(rules[0].attribute).toBe('country')
  })

  test('Toggle button flips is_enabled in the DB', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    await page.goto(APP_BASE + '/flags/' + flag.key)
    await page.waitForTimeout(1500)
    // Read pre-toggle state
    const before = await apiFetch(page, 'GET', `/flags/${flag.key}`)
    const beforeEnabled = (before.json as { is_enabled: boolean }).is_enabled
    // Click the toggle
    await page.getByRole('button', { name: new RegExp(`toggle ${flag.key}`, 'i') }).click()
    await page.waitForTimeout(1500)
    const after = await apiFetch(page, 'GET', `/flags/${flag.key}`)
    expect((after.json as { is_enabled: boolean }).is_enabled).toBe(!beforeEnabled)
  })

  test('Delete flag DELETEs /api/flags/:id and redirects to /flags', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    await page.goto(APP_BASE + '/flags/' + flag.key)
    await page.waitForTimeout(1500)
    page.once('dialog', (d) => d.accept())
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="flag-detail-delete"]').click()
      await page.waitForTimeout(2000)
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/flags\/[0-9a-f-]+/.test(r.url))
    expect(del, 'DELETE /api/flags/:id should fire').toBeDefined()
    expect(del!.status).toBe(204)
    await expect(page).toHaveURL(/\/flags$/)
    // Read-after-write
    const list = await apiFetch(page, 'GET', '/flags')
    const arr = list.json as Array<{ key: string }>
    expect(arr.find((f) => f.key === flag.key)).toBeUndefined()
  })

  test('"Back to flags" breadcrumb link navigates to /flags', async ({ page }) => {
    await signup(page)
    await waitForSeed(page)
    const flag = await pickFlag(page)
    await page.goto(APP_BASE + '/flags/' + flag.key)
    await page.waitForTimeout(1500)
    await page
      .getByRole('link', { name: /^flags$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/flags$/)
  })
})
