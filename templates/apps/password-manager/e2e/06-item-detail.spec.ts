import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signupAndAddItem, authedApiGet } from './_helpers'

test.describe('/vault/:id', () => {
  test('renders the item details after creation', async ({ page }) => {
    const { itemId } = await signupAndAddItem(page, 'detail-test.example.com', 'DetailPass-2026!')
    await page.goto(APP_BASE + `/vault/${itemId}`)
    await expect(page.getByTestId('item-detail-name')).toHaveText(/detail-test\.example\.com/i)
    await expect(page.getByTestId('item-detail-field-username')).toContainText(
      /alice@example\.com/i,
    )
  })

  test('reveal toggle reveals the real password', async ({ page }) => {
    const password = 'TopSecretPassword!2026'
    const { itemId } = await signupAndAddItem(page, 'reveal-test.example.com', password)
    await page.goto(APP_BASE + `/vault/${itemId}`)
    const value = page.getByTestId('item-detail-password-value')
    await expect(value).toHaveText(/•/)
    await page.getByTestId('item-detail-password-toggle').click()
    await expect(value).toHaveText(password)
  })

  test('Move to trash POSTs trash + removes from active vault list', async ({ page }) => {
    const { itemId } = await signupAndAddItem(page, 'trash-test.example.com')
    await page.goto(APP_BASE + `/vault/${itemId}`)
    page.on('dialog', (dlg) => dlg.accept())
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('item-detail-trash').click()
      await page.waitForURL(/\/vault\/?$/, { timeout: 15_000 })
    })
    const trashCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/items\/[^/]+\/trash/.test(r.url),
    )
    expect(trashCall, 'POST /api/items/:id/trash should fire').toBeDefined()
    expect(trashCall!.status).toBeLessThan(300)
    await page.waitForLoadState('networkidle')
    await expect(page.getByTestId(`vault-item-row-${itemId}`)).toHaveCount(0)
  })

  test('Favorite toggle POSTs and persists across reload (read-after-write via API)', async ({
    page,
    request,
  }) => {
    const { itemId } = await signupAndAddItem(page, 'fav-test.example.com')
    await page.goto(APP_BASE + `/vault/${itemId}`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('item-detail-favorite').click()
      await page.waitForTimeout(800)
    })
    const favCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/items\/[^/]+\/favorite/.test(r.url),
    )
    expect(favCall, 'POST /api/items/:id/favorite must fire').toBeDefined()
    expect(favCall!.status).toBeLessThan(300)
    const { status, data } = await authedApiGet<unknown>(request, page, `/items/${itemId}`)
    expect(status).toBe(200)
    // GET /items/:id returns the item directly (not wrapped in .data)
    const item =
      data && typeof data === 'object' && 'data' in (data as object)
        ? (data as { data: { favorite?: boolean } }).data
        : (data as { favorite?: boolean })
    expect(item.favorite, 'item.favorite must be true after toggle').toBeTruthy()
  })

  test('Back to vault link works from a not-found id', async ({ page }) => {
    const { itemId } = await signupAndAddItem(page)
    void itemId
    // The not-found id legitimately 404s — the console-guard would otherwise
    // fail the test on the expected "status of 404" resource error.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await page.goto(APP_BASE + '/vault/00000000-0000-0000-0000-000000000000')
    await expect(page.getByTestId('item-detail-error')).toBeVisible({ timeout: 10_000 })
    await page.getByRole('link', { name: /back to vault/i }).click()
    await expect(page).toHaveURL(/\/vault\/?$/)
  })
})
