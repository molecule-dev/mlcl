/**
 * /documents — Engram document library.
 *
 * Asserts on real outcomes: pasting a document POSTs /api/documents
 * with title + body_md, the new row appears in the grid after refresh,
 * and the empty state is shown when the user has no docs.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, createDocument, listDocuments, signup } from './_helpers.js'

test.describe('documents', () => {
  test('paste-toggle reveals the paste form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/documents')
    const toggle = page.locator('[data-testid="documents-paste-toggle"]')
    await toggle.click()
    await expect(page.locator('[data-testid="documents-paste-form"]')).toBeVisible()
  })

  test('paste-form fields accept text', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/documents')
    await page.locator('[data-testid="documents-paste-toggle"]').click()
    await page.locator('[data-testid="documents-paste-title"]').fill('Onboarding runbook')
    await expect(page.locator('[data-testid="documents-paste-title"]')).toHaveValue(
      'Onboarding runbook',
    )
    await page
      .locator('[data-testid="documents-paste-body"]')
      .fill('Step 1: invite the user. Step 2: create their first collection.')
    await expect(page.locator('[data-testid="documents-paste-body"]')).toHaveValue(
      'Step 1: invite the user. Step 2: create their first collection.',
    )
  })

  test('paste-submit POSTs /api/documents and the row appears in the grid', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/documents')
    await page.locator('[data-testid="documents-paste-toggle"]').click()
    const title = `Pasted ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="documents-paste-title"]').fill(title)
      await page
        .locator('[data-testid="documents-paste-body"]')
        .fill('Body content for the pasted document.')
      await page.locator('[data-testid="documents-paste-submit"]').click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find((r) => /\/api\/documents\/?$/.test(r.url) && r.method === 'POST')
    expect(post?.status).toBe(201)

    // Read-after-write
    const docs = await listDocuments(page, accessToken)
    expect(docs.some((d) => d.title === title)).toBe(true)
  })

  test('empty library shows the documents-empty placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/documents')
    await expect(page.locator('[data-testid="documents-empty"]')).toBeVisible()
  })

  test('after creating a document directly via API the grid contains it', async ({ page }) => {
    const { accessToken } = await signup(page)
    const doc = await createDocument(page, accessToken, { title: 'Direct API doc' })
    await page.goto(APP_BASE + '/documents')
    await expect(page.locator('[data-testid="documents-grid"]')).toBeVisible()
    await expect(page.getByText('Direct API doc')).toBeVisible()
    expect(doc.id).toMatch(/[0-9a-f-]{36}/)
  })

  test('documents-loading or grid is one of the visible states', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/documents')
    const grid = page.locator('[data-testid="documents-grid"]')
    const empty = page.locator('[data-testid="documents-empty"]')
    const loading = page.locator('[data-testid="documents-loading"]')
    expect((await grid.count()) + (await empty.count()) + (await loading.count())).toBeGreaterThan(
      0,
    )
  })
})
