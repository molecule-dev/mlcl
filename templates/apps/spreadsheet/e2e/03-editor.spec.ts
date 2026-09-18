import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('editor', () => {
  test('renames workbook, persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('edit-rename'), 'TestPass123!')
    await page.goto(APP_BASE + '/workbooks')
    await page
      .getByRole('button', { name: /new workbook/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/workbooks\/[0-9a-f-]{36}/, { timeout: 15000 })

    // Click the title button to rename, type new title, press enter.
    await page
      .getByRole('button', { name: /untitled workbook/i })
      .first()
      .click()
    const input = page.getByLabel(/workbook title/i)
    await input.fill('Q1 Forecast')
    await input.press('Enter')

    await expect(page.getByText('Q1 Forecast')).toBeVisible({ timeout: 5000 })
    await page.reload()
    await expect(page.getByText('Q1 Forecast')).toBeVisible({ timeout: 10000 })
  })

  test('add column + add row + edit cell persist across reload', async ({ page }) => {
    await signup(page, uniqueEmail('edit-cells'), 'TestPass123!')
    await page.goto(APP_BASE + '/workbooks')
    await page
      .getByRole('button', { name: /new workbook/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/workbooks\/[0-9a-f-]{36}/, { timeout: 15000 })

    // The default sheet is empty. Add first column via the empty-state button.
    page.once('dialog', (d) => d.accept('Customer'))
    await page
      .getByRole('button', { name: /add first column/i })
      .first()
      .click()
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible({
      timeout: 5000,
    })

    // Add a row via the toolbar button.
    await page
      .getByRole('button', { name: /add row/i })
      .first()
      .click()
    // Wait for the new row's edit-button placeholder to appear.
    const cells = page.locator('table td button:has-text("—")')
    await expect(cells.first()).toBeVisible({ timeout: 5000 })

    // Click the "—" placeholder cell to start editing it, then type + Enter.
    await cells.first().click()
    const cellInput = page.getByLabel(/edit cell/i)
    await cellInput.fill('Acme Corp')
    await cellInput.press('Enter')

    await expect(page.getByText('Acme Corp')).toBeVisible({ timeout: 5000 })

    await page.reload()
    await expect(page.getByText('Acme Corp')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible({
      timeout: 5000,
    })
  })

  test('backend invariant: editing a cell persists in /rows', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-cell'))
    const auth = { Authorization: `Bearer ${me.token}` }

    // Create workbook → returns id, plus default Sheet 1
    const wbRes = await ctx.post('/api/spreadsheets', {
      headers: auth,
      data: { title: 'Inv Sheet' },
    })
    expect(wbRes.status()).toBe(201)
    const wb = (await wbRes.json()) as { id: string }

    // Read sheets → first one
    const detail = await ctx.get(`/api/spreadsheets/${wb.id}`, { headers: auth })
    const detailJson = (await detail.json()) as { sheets: Array<{ id: string; name: string }> }
    expect(detailJson.sheets.length).toBeGreaterThan(0)
    const sheetId = detailJson.sheets[0]!.id

    // Add a column
    const colRes = await ctx.post('/api/columns', {
      headers: auth,
      data: { sheet_id: sheetId, name: 'Revenue', type: 'text' },
    })
    expect(colRes.status()).toBe(201)
    const col = (await colRes.json()) as { id: string }

    // Add a row
    const rowRes = await ctx.post('/api/rows', {
      headers: auth,
      data: { sheet_id: sheetId, cells: {} },
    })
    expect(rowRes.status()).toBe(201)
    const row = (await rowRes.json()) as { id: string; cells: Record<string, unknown> }

    // PATCH cell
    const cellRes = await ctx.patch(`/api/rows/${row.id}/cells/${col.id}`, {
      headers: auth,
      data: { value: '$48k' },
    })
    expect(cellRes.status()).toBe(200)

    // Re-fetch and confirm cell sticks
    const rowsRes = await ctx.get(`/api/rows?sheet_id=${sheetId}`, { headers: auth })
    const rows = (await rowsRes.json()) as Array<{ id: string; cells: Record<string, string> }>
    const persisted = rows.find((r) => r.id === row.id)
    expect(persisted?.cells[col.id]).toBe('$48k')

    await ctx.dispose()
  })
})
