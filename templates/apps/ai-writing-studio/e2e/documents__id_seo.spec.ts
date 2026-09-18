/**
 * /documents/:id/seo — SEO analysis page for a single document.
 *
 * Real outcomes:
 *  - Initial GET /api/seo/documents/:id/analyses returns an array
 *  - Run analysis fires POST → returns a row → next GET reflects it
 *  - Score, suggestions, and history sections actually render
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

interface AnalysisRow {
  id: string
  document_id: string
  score: number
}

async function newDocumentWithContent(page: any) {
  await signup(page)
  const created = await authedPost<{ id: string }>(page, '/documents', {
    title: 'SEO Spec Doc',
    content:
      'Search engine optimisation matters. Plume Intelligence helps writers tune the keyword density of their content. Use clear headings and structured content blocks for best results.',
    status: 'draft',
    tags: [],
    outline: [],
  })
  return created.id
}

test.describe('/documents/:id/seo', () => {
  test('SEO analysis eyebrow renders', async ({ page }) => {
    const id = await newDocumentWithContent(page)
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    await expect(page.getByText(/SEO analysis/i).first()).toBeVisible()
  })

  test('hero heading renders', async ({ page }) => {
    const id = await newDocumentWithContent(page)
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    await expect(
      page.getByRole('heading', { name: /How this draft will travel/i, level: 1 }),
    ).toBeVisible()
  })

  test('Run analysis fires POST /api/seo/documents/:id/analyze and adds an analysis row', async ({
    page,
  }) => {
    test.setTimeout(120_000)
    const id = await newDocumentWithContent(page)
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    const before = await authedGet<AnalysisRow[]>(page, `/seo/documents/${id}/analyses`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Run analysis/i }).click()
      await page
        .waitForFunction(() => !document.querySelector('button[disabled]'), null, {
          timeout: 60_000,
        })
        .catch(() => {})
      await page.waitForTimeout(2000)
    })
    const post = reqs.find(
      (r) => new RegExp(`/api/seo/documents/${id}/analyze`).test(r.url) && r.method === 'POST',
    )
    expect(post, 'analyze POST must fire').toBeTruthy()
    expect(post?.status).toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(300)
    const after = await authedGet<AnalysisRow[]>(page, `/seo/documents/${id}/analyses`)
    expect(after.length, 'analyze must add an analysis row').toBeGreaterThan(before.length)
  })

  test('Back to editor link routes to /documents/:id', async ({ page }) => {
    const id = await newDocumentWithContent(page)
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    await page.getByRole('link', { name: /Back to editor/i }).click()
    await expect(page).toHaveURL(new RegExp(`/documents/${id}$`))
  })

  test('Target keywords section renders', async ({ page }) => {
    const id = await newDocumentWithContent(page)
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    await expect(page.getByRole('heading', { name: /Target keywords/i, level: 3 })).toBeVisible()
  })

  test('Analysis history section renders', async ({ page }) => {
    const id = await newDocumentWithContent(page)
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    await expect(page.getByRole('heading', { name: /Analysis history/i, level: 3 })).toBeVisible()
  })

  test('Suggested edits section renders', async ({ page }) => {
    const id = await newDocumentWithContent(page)
    await page.goto(APP_BASE + `/documents/${id}/seo`)
    await expect(page.getByRole('heading', { name: /Suggested edits/i, level: 3 })).toBeVisible()
  })
})
