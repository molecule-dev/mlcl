/**
 * /documents/:id — Engram document detail.
 *
 * Asserts on real outcomes: the page hydrates GET /api/documents/:id
 * and renders the doc title + metric tiles. Navigating back routes to
 * /documents.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, createDocument, signup } from './_helpers.js'

test.describe('documents/:id', () => {
  test('renders the document title in the header', async ({ page }) => {
    const { accessToken } = await signup(page)
    const doc = await createDocument(page, accessToken, { title: 'Detail Page Doc' })
    await page.goto(APP_BASE + `/documents/${doc.id}`)
    await expect(page.locator('[data-testid="documentDetail-header"]')).toBeVisible()
    await expect(page.getByText('Detail Page Doc')).toBeVisible()
  })

  test('renders metric tiles (chunks, words, size, pages)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const doc = await createDocument(page, accessToken, { title: 'Metrics Doc' })
    await page.goto(APP_BASE + `/documents/${doc.id}`)
    await expect(page.getByText(/chunks/i).first()).toBeVisible()
    await expect(page.getByText(/words/i).first()).toBeVisible()
  })

  test('back link routes to /documents and GET /api/documents/:id was called on mount', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const doc = await createDocument(page, accessToken, { title: 'Back Doc' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/documents/${doc.id}`)
      await expect(page.locator('[data-testid="documentDetail-header"]')).toBeVisible()
    })
    const get = reqs.find((r) => r.method === 'GET' && r.url.includes(`/api/documents/${doc.id}`))
    expect(get?.status).toBe(200)
    await page
      .getByRole('link', { name: /back|documents/i })
      .first()
      .click()
    await page.waitForURL(/\/documents$/, { timeout: 10_000 })
  })
})
