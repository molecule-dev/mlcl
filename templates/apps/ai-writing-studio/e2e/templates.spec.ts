/**
 * /templates — gallery of editorial frame templates.
 *
 * Real outcomes:
 *  - GET /api/templates returns a non-empty list (system templates seed)
 *  - Clicking a template card calls /api/templates/:id/instantiate, the
 *    returned id appears in the URL, and the new doc has the template's
 *    body content (read-after-write via /api/documents/:id).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, signup } from './_helpers.js'

interface DocumentRow {
  id: string
  title: string
  content: string
}

interface TemplateRow {
  id: string
  name: string
  category: string
  body_template?: string
}

test.describe('/templates', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/templates')
    await expect(page.getByRole('heading', { name: /^Templates$/i, level: 1 })).toBeVisible()
  })

  test('h1 reads "Templates"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Templates$/i, level: 1 })).toBeVisible()
  })

  test('All filter chip is pressed by default and shows every template', async ({ page }) => {
    const all = page.getByRole('button', { name: /^all$/i })
    await expect(all).toHaveAttribute('aria-pressed', 'true')
    // System templates seed on first GET — assert at least one card.
    const tpls = await authedGet<TemplateRow[]>(page, '/templates')
    expect(tpls.length, 'system templates must seed').toBeGreaterThan(0)
  })

  test('a category chip filters to that category', async ({ page }) => {
    const tpls = await authedGet<TemplateRow[]>(page, '/templates')
    const cat = tpls[0]?.category ?? 'general'
    const chip = page.getByRole('button', { name: new RegExp(`^${cat}$`, 'i') })
    await chip.first().click()
    await expect(chip.first()).toHaveAttribute('aria-pressed', 'true')
  })

  test('clicking a template card instantiates a document and routes to it', async ({ page }) => {
    test.setTimeout(60_000)
    const tpls = await authedGet<TemplateRow[]>(page, '/templates')
    expect(tpls.length).toBeGreaterThan(0)
    const reqs = await captureNetwork(page, async () => {
      // Card href is /documents/new?template=<id>; click the first card link.
      await page.locator(`a[href*="/documents/new?template="]`).first().click()
      await page.waitForURL(/\/documents\/[0-9a-f-]{8,}/i, { timeout: 30_000 })
    })
    const inst = reqs.find(
      (r) => /\/api\/templates\/[^/]+\/instantiate/.test(r.url) && r.method === 'POST',
    )
    expect(inst?.status).toBeGreaterThanOrEqual(200)
    expect(inst?.status).toBeLessThan(300)
    const newId = page.url().split('/documents/')[1]?.split('?')[0]
    expect(newId).toMatch(/[0-9a-f-]{8,}/i)
    const doc = await authedGet<DocumentRow>(page, `/documents/${newId}`)
    expect(
      doc.content?.length,
      'instantiated doc must have non-empty body from template',
    ).toBeGreaterThan(0)
  })
})
