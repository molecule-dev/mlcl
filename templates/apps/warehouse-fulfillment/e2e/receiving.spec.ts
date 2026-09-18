import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listReceipts, seedSampleData, signup } from './_helpers.js'

test.describe('/receiving create + mark received', () => {
  test('seeded receipts render with PO numbers and supplier names', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)

    await page.goto(APP_BASE + '/receiving')
    await expect(page.getByTestId('receiving-page')).toBeVisible()

    const receipts = await listReceipts(page, accessToken)
    expect(receipts.length).toBeGreaterThan(0)
    // Each row shows supplier text — pick the first seeded one.
    const sup = receipts[0].supplier ?? ''
    if (sup) await expect(page.locator(`text=${sup}`).first()).toBeVisible()
  })

  test('creating a new ASN via UI persists po_number + expected_units', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/receiving')
    await page.getByTestId('receiving-new-toggle').click()
    await expect(page.getByTestId('receiving-new-form')).toBeVisible()
    const supplier = `Supplier-${Date.now().toString(36)}`
    const po = `PO-${Date.now().toString(36).toUpperCase()}`
    await page.getByTestId('receiving-supplier').fill(supplier)
    await page.getByTestId('receiving-po').fill(po)
    await page.getByTestId('receiving-units').fill('77')
    await page.getByTestId('receiving-create-submit').click()
    await page.waitForTimeout(800)

    // Verify backend invariant: row exists with the PO + units we entered.
    const list = await listReceipts(page, accessToken)
    const created = list.find((r) => r.po_number === po && r.supplier === supplier)
    expect(created, `created row supplier=${supplier} po=${po}`).toBeTruthy()
    expect(Number(created?.expected_units ?? -1)).toBe(77)

    // The UI also shows the new row.
    await expect(page.locator(`text=${po}`).first()).toBeVisible()
  })

  test('Mark received transitions an expected ASN to received', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/receiving')
    await expect(page.getByTestId('receiving-page')).toBeVisible()

    // Find first "Mark received" button (only visible when status != received).
    const markBtn = page.getByTestId('receipt-mark-received').first()
    await expect(markBtn).toBeVisible({ timeout: 10000 })
    await markBtn.click()
    await page.waitForTimeout(800)

    const after = await listReceipts(page, accessToken)
    const receivedCount = after.filter((r) => r.status === 'received').length
    expect(receivedCount, 'at least one received row after click').toBeGreaterThan(0)
  })
})
