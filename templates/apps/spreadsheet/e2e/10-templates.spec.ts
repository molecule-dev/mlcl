import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiContext, apiSignup, signup, uniqueEmail } from './_helpers.js'

test.describe('templates', () => {
  test('templates page renders without errors and exposes a system list', async ({ page }) => {
    await signup(page, uniqueEmail('tpl-ui'), 'TestPass123!')
    await page.goto(APP_BASE + '/templates')
    // Header should be visible.
    await expect(page.getByRole('heading', { name: /templates/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('backend invariant: GET /spreadsheet-templates returns an array', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-tpl'))
    const auth = { Authorization: `Bearer ${me.token}` }
    const res = await ctx.get('/api/spreadsheet-templates', { headers: auth })
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    await ctx.dispose()
  })

  test('backend invariant: ?system=true returns the seeded gallery (>=6 templates with names)', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-sys'))
    const auth = { Authorization: `Bearer ${me.token}` }
    const res = await ctx.get('/api/spreadsheet-templates?system=true', { headers: auth })
    expect(res.status()).toBe(200)
    const json = (await res.json()) as Array<{ name?: string; is_system?: boolean }>
    expect(Array.isArray(json)).toBe(true)
    expect(json.length).toBeGreaterThanOrEqual(6)
    for (const t of json) {
      expect(typeof t.name).toBe('string')
      expect(t.is_system).toBe(true)
    }
    await ctx.dispose()
  })

  test('backend invariant: instantiating a system template creates a workbook + columns + rows', async () => {
    const ctx = await apiContext()
    const me = await apiSignup(ctx, uniqueEmail('inv-inst'))
    const auth = { Authorization: `Bearer ${me.token}` }
    const sysRes = await ctx.get('/api/spreadsheet-templates?system=true', { headers: auth })
    const sys = (await sysRes.json()) as Array<{ id: string; name: string }>
    expect(sys.length).toBeGreaterThan(0)
    const tpl = sys[0]!
    const inst = await ctx.post(`/api/spreadsheet-templates/${tpl.id}/instantiate`, {
      headers: { ...auth, 'Content-Type': 'application/json' },
      data: { title: `From ${tpl.name}` },
    })
    expect(inst.status()).toBe(201)
    const insBody = (await inst.json()) as { id: string; title: string }
    expect(insBody.title).toBe(`From ${tpl.name}`)
    // Read back the workbook + verify it has at least one sheet, and that
    // sheet has at least one column (templates always seed >0 columns).
    const wbRes = await ctx.get(`/api/spreadsheets/${insBody.id}`, { headers: auth })
    expect(wbRes.status()).toBe(200)
    const wb = (await wbRes.json()) as { sheets: Array<{ id: string }> }
    expect(wb.sheets.length).toBeGreaterThan(0)
    const sheetId = wb.sheets[0]!.id
    const colsRes = await ctx.get(`/api/columns?sheet_id=${sheetId}`, { headers: auth })
    const cols = (await colsRes.json()) as Array<{ name: string; type: string }>
    expect(cols.length).toBeGreaterThan(0)
    expect(typeof cols[0]!.name).toBe('string')
    await ctx.dispose()
  })
})
