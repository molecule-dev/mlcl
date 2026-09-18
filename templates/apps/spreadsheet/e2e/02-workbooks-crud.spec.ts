import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('workbooks crud', () => {
  test('shows empty-state then creates a workbook via UI and persists', async ({ page }) => {
    await signup(page, uniqueEmail('wb-create'), 'TestPass123!')
    await page.goto(APP_BASE + '/workbooks')

    await expect(page.getByText(/no workbooks yet|create your first/i)).toBeVisible({
      timeout: 10000,
    })

    await page
      .getByRole('button', { name: /new workbook/i })
      .first()
      .click()

    // Should land on the editor with the default title visible.
    await expect(page).toHaveURL(/\/workbooks\/[0-9a-f-]{36}/, { timeout: 15000 })
    await expect(page.getByText(/untitled workbook/i)).toBeVisible({ timeout: 10000 })

    // Rename to something stable for the rest of the test.
    await page
      .getByRole('button', { name: /untitled workbook/i })
      .first()
      .click()
    const titleInput = page.getByLabel(/workbook title/i)
    await titleInput.fill('Test Workbook')
    await titleInput.press('Enter')
    await expect(page.getByText('Test Workbook')).toBeVisible({ timeout: 5000 })

    // Reload preserves
    await page.reload()
    await expect(page.getByText('Test Workbook')).toBeVisible({ timeout: 10000 })

    // Go back to list — the workbook is there
    await page.goto(APP_BASE + '/workbooks')
    await expect(page.getByText('Test Workbook')).toBeVisible({ timeout: 10000 })
  })

  test('backend invariant: POST /spreadsheets persists and is owner-scoped', async ({}) => {
    const ctx = await apiContext()
    const a = await apiSignup(ctx, uniqueEmail('inv-a'))
    const b = await apiSignup(ctx, uniqueEmail('inv-b'))

    const created = await ctx.post('/api/spreadsheets', {
      headers: { Authorization: `Bearer ${a.token}` },
      data: { title: 'Owner-A Sheet' },
    })
    expect(created.status()).toBe(201)
    const createdJson = (await created.json()) as { id: string; title: string; owner_id: string }
    expect(createdJson.title).toBe('Owner-A Sheet')
    expect(createdJson.owner_id).toBe(a.userId)

    // Owner A sees it in list
    const listA = await ctx.get('/api/spreadsheets', {
      headers: { Authorization: `Bearer ${a.token}` },
    })
    expect(listA.status()).toBe(200)
    const listAJson = (await listA.json()) as Array<{ id: string }>
    expect(listAJson.some((r) => r.id === createdJson.id)).toBe(true)

    // Owner B does NOT see it
    const listB = await ctx.get('/api/spreadsheets', {
      headers: { Authorization: `Bearer ${b.token}` },
    })
    expect(listB.status()).toBe(200)
    const listBJson = (await listB.json()) as Array<{ id: string }>
    expect(listBJson.some((r) => r.id === createdJson.id)).toBe(false)

    // Owner B cannot read it directly (404)
    const readB = await ctx.get(`/api/spreadsheets/${createdJson.id}`, {
      headers: { Authorization: `Bearer ${b.token}` },
    })
    expect(readB.status()).toBe(404)

    // Owner B cannot delete it
    const delB = await ctx.delete(`/api/spreadsheets/${createdJson.id}`, {
      headers: { Authorization: `Bearer ${b.token}` },
    })
    expect(delB.status()).toBe(404)

    // Owner A can delete it
    const delA = await ctx.delete(`/api/spreadsheets/${createdJson.id}`, {
      headers: { Authorization: `Bearer ${a.token}` },
    })
    expect(delA.status()).toBe(204)

    await ctx.dispose()
  })

  test('UI: star toggle persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('wb-star'), 'TestPass123!')
    // Create a workbook so the list isn't empty.
    await page.goto(APP_BASE + '/workbooks')
    await page
      .getByRole('button', { name: /new workbook/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/workbooks\/[0-9a-f-]{36}/, { timeout: 15000 })
    const wbId = page.url().match(/\/workbooks\/([0-9a-f-]{36})/)![1]!

    // Back to list — locate the star button for this workbook.
    await page.goto(APP_BASE + '/workbooks')
    const starBtn = page.getByTestId(`workbook-star-${wbId}`)
    await expect(starBtn).toBeVisible({ timeout: 10000 })
    await expect(starBtn).toHaveAttribute('aria-pressed', 'false')

    // Click → optimistic flip → backend write → reload preserves.
    await starBtn.click()
    await expect(starBtn).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 })
    await page.reload()
    const starBtnAfter = page.getByTestId(`workbook-star-${wbId}`)
    await expect(starBtnAfter).toHaveAttribute('aria-pressed', 'true', { timeout: 10000 })

    // Toggle off, also persists.
    await starBtnAfter.click()
    await expect(starBtnAfter).toHaveAttribute('aria-pressed', 'false', { timeout: 5000 })
    await page.reload()
    await expect(page.getByTestId(`workbook-star-${wbId}`)).toHaveAttribute(
      'aria-pressed',
      'false',
      { timeout: 10000 },
    )
  })
})
