import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, addRandomProductToCart, captureNetwork, signup } from './_helpers.js'

test.describe('cross-page user journey', () => {
  test('shopper signup → catalog → product → cart → checkout creates real order, cart cleared', async ({
    page,
  }) => {
    await signup(page)

    await page.goto(APP_BASE + '/catalog')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Pick a real product link from the catalog and open it
    const productLink = page.locator('a[href^="/products/"]').first()
    await productLink.waitFor({ timeout: 10000 })
    const productHref = await productLink.getAttribute('href')
    expect(productHref, 'catalog produced a product link').toMatch(/\/products\/[^/]+/)
    await productLink.click()
    await page.waitForURL(/\/products\//, { timeout: 10000 })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Add to cart from the product detail page → invariant: GET /api/cart returns item_count >= 1
    await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /add to cart/i })
        .first()
        .click()
      await page.waitForTimeout(700)
    })
    const cartAfterAdd = (await page.request.get(API_BASE + '/cart').then((r) => r.json())) as {
      item_count: number
      groups: Array<{ items: Array<{ product_id: string; quantity: number }> }>
    }
    expect(cartAfterAdd.item_count, 'product not persisted into cart_items').toBeGreaterThanOrEqual(
      1,
    )
    expect(cartAfterAdd.groups.length, 'cart has no vendor groups').toBeGreaterThanOrEqual(1)

    // Cart page renders the same product
    await page.goto(APP_BASE + '/cart')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('img').first()).toBeVisible()

    // Checkout: fill shipping → payment → review → place order
    await page.goto(APP_BASE + '/checkout')
    await page.locator('input[name="firstName"]').fill('Walker')
    await page.locator('input[name="lastName"]').fill('Tester')
    await page.locator('input[name="street"]').fill('1 Main St')
    await page.locator('input[name="city"]').fill('Springfield')
    await page.locator('input[name="state"]').fill('MA')
    await page.locator('input[name="postal"]').fill('01103')
    await page.getByTestId('checkout-advance').click()
    await expect(page.getByRole('heading', { name: /payment method/i })).toBeVisible()
    await page.getByTestId('checkout-advance').click()
    await expect(page.getByRole('heading', { name: /review your order/i })).toBeVisible()

    const placeOrderReqs = await captureNetwork(page, async () => {
      await page.getByTestId('checkout-advance').click()
      await page.waitForURL(/\/orders\//, { timeout: 15000 })
    })
    const orderPost = placeOrderReqs.find(
      (r) => /\/api\/orders$/.test(r.url) && r.method === 'POST',
    )
    expect(orderPost?.status, 'POST /api/orders failed').toBe(201)

    // Invariant: GET /api/orders shows the new order, GET /api/cart is now empty
    const ordersList = (await page.request.get(API_BASE + '/orders').then((r) => r.json())) as {
      data: Array<{ id: string; status: string; total_cents?: number }>
    }
    expect(ordersList.data.length, 'no orders visible after checkout').toBeGreaterThanOrEqual(1)
    const placedOrder = ordersList.data[0]
    expect(['paid', 'pending', 'processing']).toContain(placedOrder.status)

    const cartAfterCheckout = (await page.request
      .get(API_BASE + '/cart')
      .then((r) => r.json())) as {
      item_count: number
    }
    expect(cartAfterCheckout.item_count, 'cart not cleared after checkout').toBe(0)

    // Order detail page renders the placed order
    await page.goto(APP_BASE + `/orders/${placedOrder.id}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('cart quantity update + remove round-trip through API', async ({ page }) => {
    await signup(page)
    const { product, cart } = await addRandomProductToCart(page, 1)
    expect(cart.item_count).toBe(1)

    await page.goto(APP_BASE + '/cart')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const itemId = (cart.groups[0]!.items[0] as { id: string }).id

    // Increase quantity to 3 via API and verify GET reflects it
    const putResp = await page.request.put(API_BASE + `/cart/${itemId}`, {
      data: { quantity: 3 },
    })
    expect(putResp.status()).toBe(200)
    const cartAfterUpdate = (await page.request.get(API_BASE + '/cart').then((r) => r.json())) as {
      item_count: number
      groups: Array<{ items: Array<{ quantity: number; product_id: string }> }>
    }
    const updatedItem = cartAfterUpdate.groups[0]!.items.find((i) => i.product_id === product.id)
    expect(updatedItem?.quantity, 'quantity not persisted').toBe(3)

    // Delete item → GET shows empty cart
    const deleteResp = await page.request.delete(API_BASE + `/cart/${itemId}`)
    expect(deleteResp.status()).toBe(200)
    const cartAfterDelete = (await page.request.get(API_BASE + '/cart').then((r) => r.json())) as {
      item_count: number
    }
    expect(cartAfterDelete.item_count, 'cart not emptied after delete').toBe(0)
  })

  test('settings name change persists through PATCH and survives reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const newName = 'Persist-Through-Reload-' + Date.now()
    await page.getByTestId('settings-name').fill(newName)

    const saveReqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /save changes|save profile/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const patch = saveReqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH')
    expect(patch?.status, 'PATCH /api/profile/me failed').toBeLessThan(400)

    // Invariant: GET /api/profile/me reflects the new name
    const profile = (await page.request.get(API_BASE + '/profile/me').then((r) => r.json())) as {
      name?: string | null
    }
    expect(profile.name).toBe(newName)

    // Reload the page; the input should still show the new name
    await page.reload()
    await expect(page.getByTestId('settings-name')).toHaveValue(newName)
  })

  test('shipping address PATCH persists across reload via addresses array', async ({ page }) => {
    await signup(page)
    // Drive the addresses prefs directly; the Settings UI sends prefs.addresses.
    const label = 'home-' + Date.now()
    const addresses = [
      { id: 'a1', label, street: '100 Main', city: 'Austin', state: 'TX', postal: '78701' },
    ]
    const patchResp = await page.request.patch(API_BASE + '/profile/me', {
      data: { prefs: { addresses } },
    })
    expect(patchResp.status()).toBe(200)

    const profile = (await page.request.get(API_BASE + '/profile/me').then((r) => r.json())) as {
      prefs?: { addresses?: Array<{ label: string }> }
    }
    expect(profile.prefs?.addresses?.[0]?.label).toBe(label)

    // Reload the settings page and verify the address is rendered
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-tab-shipping').click()
    await expect(page.getByText(label)).toBeVisible()
  })

  test('theme toggle persists across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/')
    const readMode = () =>
      page.evaluate(
        () =>
          document.documentElement.getAttribute('data-mol-mode') ||
          document.documentElement.getAttribute('data-mol-theme') ||
          document.documentElement.dataset.theme ||
          document.documentElement.getAttribute('data-theme') ||
          document.documentElement.classList.toString(),
      )
    const before = await readMode()
    const toggle = page.getByRole('button', { name: /theme/i }).first()
    await expect(toggle).toBeVisible()
    await toggle.click()
    await page.waitForTimeout(400)
    const after = await readMode()
    expect(after, 'theme did not change on toggle').not.toBe(before)
    await page.reload()
    await page.waitForTimeout(400)
    const reloaded = await readMode()
    expect(reloaded, 'theme not persisted across reload').toBe(after)
  })

  test('vendor can apply, get activated, list a product, and see it in their dashboard', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/vendor/apply')
    const shopName = 'Walker Workshop ' + Date.now()
    await page.getByTestId('vendor-onboarding-shopName').fill(shopName)
    await page.getByTestId('vendor-onboarding-tagline').fill('Hand-woven baskets')
    await page.getByTestId('vendor-onboarding-website').fill('https://walker.test')
    await page.getByTestId('vendor-onboarding-contact').fill('walker@test.local')
    await page.getByTestId('vendor-onboarding-advance').click()
    await page.getByRole('button', { name: 'Home & Living' }).click()
    await page.getByTestId('vendor-onboarding-advance').click()
    await page.getByTestId('vendor-onboarding-bankAccount').fill('GB29 NWBK 6016 1331 9268 19')
    await page.getByTestId('vendor-onboarding-taxId').fill('US-EIN-123')
    await page.getByTestId('vendor-onboarding-advance').click()
    const submitReqs = await captureNetwork(page, async () => {
      await page.getByTestId('vendor-onboarding-advance').click()
      await page.waitForTimeout(2000)
    })
    const applyPost = submitReqs.find(
      (r) => /\/api\/vendors\/apply/.test(r.url) && r.method === 'POST',
    )
    expect(applyPost?.status, 'vendor apply POST failed').toBeLessThan(400)

    // Invariant: GET /api/vendors/me reflects the new vendor
    const me = (await page.request.get(API_BASE + '/vendors/me').then((r) => r.json())) as
      | { id?: string; name?: string; status?: string; slug?: string }
      | { vendor?: { id?: string; name?: string; status?: string } }
      | { data?: { id?: string; name?: string; status?: string } }
    const vendor =
      ('vendor' in me && me.vendor) ||
      ('data' in me && (me as { data?: { id?: string; name?: string; status?: string } }).data) ||
      (me as { id?: string; name?: string; status?: string })
    expect(vendor.name).toBe(shopName)
    expect(['active', 'approved', 'pending']).toContain(vendor.status)

    // Now create a product and verify it's stored
    const productResp = await page.request.post(API_BASE + '/products', {
      data: {
        name: 'Heritage Basket ' + Date.now(),
        description: 'Hand-woven from coastal grass.',
        price: 88,
        category: 'home-living',
        images: ['https://picsum.photos/seed/test/640/640'],
        status: 'active',
      },
    })
    expect([200, 201]).toContain(productResp.status())
    const productBody = (await productResp.json()) as { data?: { id: string }; id?: string }
    const productId = productBody.id || productBody.data?.id
    expect(productId, 'POST /api/products did not return id').toBeTruthy()

    // GET /api/vendors/me/products lists the product
    const myProducts = (await page.request
      .get(API_BASE + '/vendors/me/products')
      .then((r) => r.json())) as {
      data?: Array<{ id: string }>
    }
    const found = myProducts.data?.find((p) => p.id === productId)
    expect(found, 'newly created product not in vendor product list').toBeTruthy()

    // The vendor dashboard page renders
    await page.goto(APP_BASE + '/vendor/dashboard')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})
