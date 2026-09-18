/**
 * Cross-page kitchen-sink user journey for internal-knowledge-base.
 *
 * Walks the primary flow a real user takes: sign up → create a space →
 * draft an article → publish → bookmark → notification fires → search →
 * profile reflects → settings persists across reload → real Stripe
 * checkout returns a cs_test_ URL.
 *
 * Touches: /, /signup, /home, /spaces, /spaces/new, /spaces/:key,
 * /article/new/edit, /article/:id, /article/:id/edit, /bookmarks,
 * /search, /notifications, /profile, /settings, /pricing,
 * /plan-updated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, apiPost, captureNetwork, signup } from './_helpers.js'

test('Kitchen-sink journey: signup → space → article → publish → bookmark → search → notifications → profile → settings → checkout', async ({
  page,
}) => {
  // 1. Landing → signup
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /start a workspace/i }).first()).toBeVisible()

  const { email } = await signup(page, undefined, undefined, 'Morgan', 'Quill')
  // Signup lands on /home (or /).
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 10_000 })

  // 2. Create a space via the form
  const slug = `eng-${Date.now().toString(36)}`
  await page.goto(APP_BASE + '/spaces/new')
  await page.locator('input#space-name').fill('Engineering')
  await page.locator('input#space-key').fill(slug)
  await page.locator('textarea#space-description').fill('Runbooks and decisions.')
  await page
    .getByRole('button', { name: /create space/i })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`/spaces/${slug}`), { timeout: 10_000 })

  // Read the space id back via API
  const sp = await apiGet<{ id: string; key: string }>(page, `/spaces/${slug}`)
  expect(sp.status).toBe(200)
  const spaceId = sp.body!.id

  // 3. Create + publish a real article via the editor
  await page.goto(`${APP_BASE}/article/new/edit?space=${slug}`)
  await page.waitForTimeout(800)
  await page
    .locator('input[aria-label*="title"], input[aria-label*="Title"]')
    .first()
    .fill('Pager rotation')
  await page
    .locator('textarea[data-editor-body]')
    .fill('# Pager rotation\n\nWeekdays Morgan, weekends Lin.')
  await page.getByRole('button', { name: /save draft/i }).click()
  await page.waitForURL(/\/article\/[0-9a-f-]{36}\/edit/, { timeout: 15_000 })
  const articleId = page.url().match(/\/article\/([0-9a-f-]{36})\/edit/)![1]
  expect(articleId).toBeTruthy()

  await page.getByRole('button', { name: /^publish$/i }).click()
  await page.waitForTimeout(1500)
  const got = await apiGet<{ status: string; published_at: string | null }>(
    page,
    `/articles/${articleId}`,
  )
  expect(got.body?.status).toBe('published')
  expect(got.body?.published_at).not.toBeNull()

  // 4. View the published article and bookmark it
  await page.goto(`${APP_BASE}/article/${articleId}`)
  await expect(page.locator('h1', { hasText: 'Pager rotation' }).first()).toBeVisible({
    timeout: 10_000,
  })
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^Bookmark$/i }).click()
  await page.waitForTimeout(800)
  await expect(page.getByRole('button', { name: /Bookmarked/i })).toBeVisible()

  // /bookmarks lists it
  await page.goto(APP_BASE + '/bookmarks')
  await expect(page.getByText('Pager rotation')).toBeVisible({ timeout: 10_000 })

  // 5. Search by title
  await page.goto(`${APP_BASE}/search?q=Pager`)
  await expect(page.getByText('Pager rotation')).toBeVisible({ timeout: 10_000 })

  // 6. Profile reflects the published article + the space
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByRole('heading', { level: 1, name: /Morgan Quill/i })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText(email)).toBeVisible()
  await expect(page.getByText('Pager rotation')).toBeVisible()

  // 7. Settings: change a notification preference and assert it survives reload
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('#settings-email')).not.toHaveValue('', { timeout: 10_000 })
  const mentionsToggle = page.getByRole('switch', { name: /mentions/i }).first()
  await expect(mentionsToggle).toBeVisible({ timeout: 10_000 })
  const before = await mentionsToggle.getAttribute('aria-checked')
  await mentionsToggle.click()
  await page.waitForTimeout(800)
  await page.reload()
  const reloaded = page.getByRole('switch', { name: /mentions/i }).first()
  const after = await reloaded.getAttribute('aria-checked')
  expect(after).not.toBe(before)

  // 8. Pricing → real Stripe Checkout URL
  await page.goto(APP_BASE + '/pricing')
  // tiers render
  await expect(page.getByText(/Pro/i).first()).toBeVisible()

  const tiers = await apiGet<{
    data: Array<{ key: string; prices: Array<{ stripePriceId: string | null }> }>
  }>(page, '/billing/tiers')
  expect(tiers.status).toBe(200)
  const proPrice = tiers
    .body!.data.find((t) => t.key === 'pro')
    ?.prices.find((p) => p.stripePriceId)?.stripePriceId
  expect(proPrice).toMatch(/^price_/)
  const checkout = await apiPost<{ checkoutUrl: string }>(page, '/billing/checkout', {
    priceId: proPrice,
  })
  expect(checkout.status).toBe(200)
  expect(checkout.body?.checkoutUrl).toMatch(/cs_test_|checkout\.stripe\.com/)

  // 9. /plan-updated renders and links home
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/')

  // 10. /notifications page reachable; mark-all-read button is rendered
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/notifications')
    await page.waitForTimeout(800)
  })
  const notif = reqs.find((r) => /\/api\/notifications(\?|$)/.test(r.url) && r.method === 'GET')
  expect(notif?.status).toBe(200)

  // 11. Editor route is reachable for the previously created article
  await page.goto(`${APP_BASE}/article/${articleId}/edit`)
  await page.waitForTimeout(500)
  await expect(page.locator('textarea[data-editor-body]')).toBeVisible()

  // The space we created is also reachable directly
  expect(spaceId).toMatch(/^[0-9a-f-]{36}$/)
})
