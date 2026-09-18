import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, uniqueEmail } from './_helpers.js'

test.describe('history', () => {
  test('backend invariant: snapshot creates a version, restore wipes + re-creates', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-hist'))
    const auth = { Authorization: `Bearer ${me.token}` }

    // Create workbook + add a column + a row with content.
    const wb = await ctx.post('/api/spreadsheets', {
      headers: auth,
      data: { title: 'Hist Sheet' },
    })
    const wbId = ((await wb.json()) as { id: string }).id

    const detail = await ctx.get(`/api/spreadsheets/${wbId}`, { headers: auth })
    const detailJson = (await detail.json()) as { sheets: Array<{ id: string }> }
    const sheetId = detailJson.sheets[0]!.id

    const col = await ctx.post('/api/columns', {
      headers: auth,
      data: { sheet_id: sheetId, name: 'Col1', type: 'text' },
    })
    const colId = ((await col.json()) as { id: string }).id

    const row = await ctx.post('/api/rows', {
      headers: auth,
      data: { sheet_id: sheetId, cells: { [colId]: 'A' } },
    })
    const rowId = ((await row.json()) as { id: string }).id

    // Take snapshot v1.
    const snap = await ctx.post('/api/spreadsheet-versions', {
      headers: auth,
      data: { spreadsheet_id: wbId, change_summary: 'v1' },
    })
    expect(snap.status()).toBe(201)

    // Edit the cell to a new value.
    await ctx.patch(`/api/rows/${rowId}/cells/${colId}`, {
      headers: auth,
      data: { value: 'B' },
    })

    // Verify mid-state is "B".
    const midRows = await ctx.get(`/api/rows?sheet_id=${sheetId}`, { headers: auth })
    const midRowsJson = (await midRows.json()) as Array<{ cells: Record<string, string> }>
    expect(midRowsJson[0]?.cells[colId]).toBe('B')

    // List versions, find the v1 snapshot.
    const versions = await ctx.get(`/api/spreadsheet-versions?spreadsheet_id=${wbId}`, {
      headers: auth,
    })
    const versionsJson = (await versions.json()) as Array<{ id: string; change_summary: string }>
    const v1 = versionsJson.find((v) => v.change_summary === 'v1')
    expect(v1).toBeDefined()

    // Restore to v1.
    const restore = await ctx.post(`/api/spreadsheet-versions/${v1!.id}/restore`, {
      headers: auth,
      data: {},
    })
    expect(restore.status()).toBe(200)

    // Cell value should be back to "A". The row id may have changed (delete + recreate),
    // so re-fetch all rows and check the value.
    const finalRows = await ctx.get(`/api/rows?sheet_id=${sheetId}`, { headers: auth })
    expect(finalRows.status()).toBe(200)
    const finalRowsJson = (await finalRows.json()) as Array<{ cells: Record<string, string> }>
    expect(finalRowsJson.length).toBeGreaterThan(0)
    // At least one row's cells should contain the value "A".
    const values = finalRowsJson.flatMap((r) => Object.values(r.cells ?? {}))
    expect(values).toContain('A')

    await ctx.dispose()
  })

  test('history page lists snapshots after taking one via UI', async ({ page }) => {
    // Create workbook + take one snapshot via API, then load history page in UI.
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('hist-ui'))
    const auth = { Authorization: `Bearer ${me.token}` }
    const wb = await ctx.post('/api/spreadsheets', {
      headers: auth,
      data: { title: 'UI Hist' },
    })
    const wbId = ((await wb.json()) as { id: string }).id
    await ctx.post('/api/spreadsheet-versions', {
      headers: auth,
      data: { spreadsheet_id: wbId, change_summary: 'fixture-v1' },
    })
    await ctx.dispose()

    // Sign in via UI to get cookie / session for the same user.
    await page.goto(APP_BASE + '/login')
    await page.getByLabel(/email/i).first().fill(me.email)
    await page
      .getByLabel(/password/i)
      .first()
      .fill(me.password)
    await page
      .getByRole('button', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })

    await page.goto(APP_BASE + `/workbooks/${wbId}/history`)
    await expect(page.getByText(/fixture-v1/)).toBeVisible({ timeout: 10000 })
  })
})
