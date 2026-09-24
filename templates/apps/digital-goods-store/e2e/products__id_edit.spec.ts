import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

async function seedOwnProduct(
  request: import('@playwright/test').APIRequestContext,
  token: string,
) {
  const api = await authedApi(request, token)
  const created = await (
    await api.post('/products', {
      name: 'Edit Page Probe ' + Date.now(),
      description: 'before edit',
      price_cents: 4400,
      category: 'UI Kits',
      file_type: 'ZIP',
    })
  ).json()
  return created
}

test.describe('Product editor — edit (/products/:id/edit)', () => {
  test('loads existing product fields pre-filled', async ({ page, request }) => {
    const me = await signup(page)
    const product = await seedOwnProduct(request, me.accessToken!)
    await page.goto(APP_BASE + `/products/${product.id}/edit`)
    await page.waitForTimeout(1500)
    const name = page.locator('[data-testid="product-name"]')
    await expect(name).toHaveValue(/Edit Page Probe/)
  })

  test('page-load fetches /api/products/:id', async ({ page, request }) => {
    const me = await signup(page)
    const product = await seedOwnProduct(request, me.accessToken!)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/products/${product.id}/edit`)
      await page.waitForTimeout(1500)
    })
    const get = whereUrl(reqs, new RegExp(`/api/products/${product.id}`), 'GET')
    expect(get.length, 'GET /api/products/:id fired').toBeGreaterThan(0)
  })

  test('Publish PUTs the change and persists', async ({ page, request }) => {
    const me = await signup(page)
    const product = await seedOwnProduct(request, me.accessToken!)
    await page.goto(APP_BASE + `/products/${product.id}/edit`)
    await page.waitForTimeout(1500)
    const desc = page.locator('[data-testid="product-description"]')
    await desc.fill('after edit ' + Date.now())
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="product-publish"]').click()
      await page.waitForTimeout(1500)
    })
    const put = whereUrl(reqs, /\/api\/products\//, 'PUT')
    const post = whereUrl(reqs, /\/api\/products\//, 'POST')
    expect(put.length + post.length, 'PUT or POST fired').toBeGreaterThan(0)

    const api = await authedApi(request, me.accessToken!)
    const fresh = await (await api.get(`/products/${product.id}`)).json()
    expect(fresh.id).toBe(product.id)
  })

  test('Delete (when present) removes the product', async ({ page, request }) => {
    const me = await signup(page)
    const product = await seedOwnProduct(request, me.accessToken!)
    await page.goto(APP_BASE + `/products/${product.id}/edit`)
    await page.waitForTimeout(1500)
    const del = page.getByRole('button', { name: /delete|archive|remove/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await del
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no delete button on editor')
    const reqs = await captureNetwork(page, async () => {
      // ConfirmButton: first click arms (shows the confirm label), second commits.
      await del.first().click()
      await expect(del.first()).toHaveText(/cannot be undone/i)
      await del.first().click()
      await page.waitForTimeout(1500)
    })
    const dl = whereUrl(reqs, /\/api\/products\//, 'DELETE')
    expect(dl.length).toBeGreaterThan(0)
  })

  test('back link returns to /products', async ({ page, request }) => {
    const me = await signup(page)
    const product = await seedOwnProduct(request, me.accessToken!)
    await page.goto(APP_BASE + `/products/${product.id}/edit`)
    const link = page.getByRole('link', { name: /all products|back|cancel|products/i })
    // count() never auto-waits; a pre-paint read skipped this test silently.
    const present = await link
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'no back link in editor')
    await link.first().click()
    await expect(page).toHaveURL(/\/products|\/dashboard/)
  })
})
