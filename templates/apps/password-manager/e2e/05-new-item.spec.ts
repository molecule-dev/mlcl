import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, uniqueEmail, STRONG_PASSWORD } from './_helpers'

test.describe('/vault/new', () => {
  test('renders required fields and category tiles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vault/new')
    await expect(page.getByTestId('new-item-name')).toBeVisible()
    await expect(page.getByTestId('new-item-username')).toBeVisible()
    await expect(page.getByTestId('new-item-password')).toBeVisible()
    await expect(page.getByTestId('new-item-cat-login')).toBeVisible()
    await expect(page.getByTestId('new-item-cat-card')).toBeVisible()
    await expect(page.getByTestId('new-item-cat-note')).toBeVisible()
    await expect(page.getByTestId('new-item-save')).toBeVisible()
  })

  test('submitting empty name does not POST', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vault/new')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByTestId('new-item-save')
        .click({ force: true })
        .catch(() => undefined)
      await page.waitForTimeout(500)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/items(\?|$)/.test(r.url))
    expect(post).toBeUndefined()
  })

  test('successful create POSTs /api/items with provided fields and 2xx', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vault/new')
    await page.getByTestId('new-item-name').fill('persistence-check.example.com')
    await page.getByTestId('new-item-username').fill('persist@example.com')
    await page.getByTestId('new-item-password').fill('PersistPass-2026!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('new-item-save').click()
      await page.waitForURL(
        (url) => /\/vault\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'),
        { timeout: 15_000 },
      )
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/items(\?|$)/.test(r.url))
    expect(post, 'POST /api/items must fire').toBeDefined()
    expect(post!.status).toBeGreaterThanOrEqual(200)
    expect(post!.status).toBeLessThan(300)
  })

  test('selecting card category persists into the create POST as type=card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vault/new')
    await page.getByTestId('new-item-cat-card').click()
    await page.getByTestId('new-item-name').fill('Visa Test')
    let postBody: Record<string, unknown> | null = null
    page.on('request', (req) => {
      if (req.method() === 'POST' && /\/api\/items(\?|$)/.test(req.url())) {
        try {
          postBody = JSON.parse(req.postData() ?? '{}')
        } catch {
          /* ignore */
        }
      }
    })
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('new-item-save').click()
      await page.waitForURL(
        (url) => /\/vault\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/new'),
        { timeout: 15_000 },
      )
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/items(\?|$)/.test(r.url))
    expect(post?.status).toBeLessThan(300)
    expect(postBody, 'POST body should have been captured').not.toBeNull()
    expect(
      (postBody as { type?: string } | null)?.type,
      'type=card must be sent on the create POST',
    ).toBe('card')
  })

  test('Cancel button returns to /vault', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vault/new')
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page).toHaveURL(/\/vault\/?$/, { timeout: 10_000 })
  })
})
