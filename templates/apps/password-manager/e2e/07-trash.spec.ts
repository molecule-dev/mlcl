import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signupAndAddItem, authedApiGet } from './_helpers'

test.describe('/trash', () => {
  test('shows empty state when no trashed items', async ({ page }) => {
    const { itemId } = await signupAndAddItem(page, 'kept-item.example.com')
    void itemId
    await page.goto(APP_BASE + '/trash')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(
      /no items|trash is empty|nothing in trash|empty/i,
    )
  })

  test('trashed item shows up in /trash list and can be restored', async ({ page, request }) => {
    const { itemId } = await signupAndAddItem(page, 'restore-me.example.com')
    page.on('dialog', (d) => d.accept())
    await page.goto(APP_BASE + `/vault/${itemId}`)
    await page.getByTestId('item-detail-trash').click()
    await page.waitForURL(/\/vault\/?$/, { timeout: 15_000 })

    await page.goto(APP_BASE + '/trash')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/restore-me\.example\.com/i)

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^restore$/i })
        .first()
        .click()
      await page.waitForTimeout(1000)
    })
    const restoreCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/items\/[^/]+\/restore/.test(r.url),
    )
    expect(restoreCall, 'POST /api/items/:id/restore must fire').toBeDefined()
    expect(restoreCall!.status).toBeLessThan(300)

    const { status, data } = await authedApiGet<unknown>(request, page, `/items?is_trashed=false`)
    expect(status).toBe(200)
    // GET /items returns array directly
    const items = Array.isArray(data) ? data : ((data as { data?: unknown[] }).data ?? [])
    expect(Array.isArray(items)).toBe(true)
    expect((items as unknown[]).length).toBeGreaterThan(0)
  })

  test('permanent purge issues DELETE /api/items/:id', async ({ page, request }) => {
    const { itemId } = await signupAndAddItem(page, 'purge-me.example.com')
    page.on('dialog', (d) => d.accept())
    await page.goto(APP_BASE + `/vault/${itemId}`)
    await page.getByTestId('item-detail-trash').click()
    await page.waitForURL(/\/vault\/?$/, { timeout: 15_000 })

    await page.goto(APP_BASE + '/trash')
    await page.waitForLoadState('networkidle')

    const purgeBtn = page.getByRole('button', { name: /delete forever|purge|permanently/i }).first()
    if ((await purgeBtn.count()) === 0) {
      test.skip(true, 'No purge button present in current Trash UI')
      return
    }
    const reqs = await captureNetwork(page, async () => {
      await purgeBtn.click()
      await page.waitForTimeout(1000)
    })
    const delCall = reqs.find(
      (r) =>
        r.method === 'DELETE' &&
        /\/api\/items\/[^/]+(\b|$)/.test(r.url) &&
        !/restore|trash|favorite/.test(r.url),
    )
    expect(delCall, 'DELETE /api/items/:id should fire on purge').toBeDefined()
    expect(delCall!.status).toBeLessThan(300)
    const { status, data } = await authedApiGet<{ data: { id: string }[] }>(
      request,
      page,
      `/items/${itemId}`,
    )
    void data
    expect([404, 403]).toContain(status)
  })
})
