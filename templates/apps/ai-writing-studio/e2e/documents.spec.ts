/**
 * /documents — authenticated library list view.
 *
 * Asserts the list loads, status filters actually narrow the visible cards
 * (and bump the "Filter applied" counter), search-by-title narrows by
 * substring, and the New-document CTA actually creates a row server-side.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, authedPost, captureNetwork, signup } from './_helpers.js'

interface DocumentRow {
  id: string
  title: string
  status: string
}

test.describe('/documents', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/documents')
  })

  test('h1 reads "Documents"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Documents$/i, level: 1 })).toBeVisible()
  })

  test('New document CTA creates a row and redirects to /documents/<uuid>', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      // Match the toolbar CTA exactly — both the toolbar "New document"
      // pill and the empty-state "Create new document" link share the
      // same /documents/new href, so a substring match collides.
      await page.getByRole('link', { name: 'New document', exact: true }).click()
      await page.waitForURL(/\/documents\/[0-9a-f-]{8,}/i, { timeout: 20_000 })
    })
    const createCall = reqs.find((r) => /\/api\/documents(\?|$)/.test(r.url) && r.method === 'POST')
    expect(createCall?.status).toBeGreaterThanOrEqual(200)
    expect(createCall?.status).toBeLessThan(300)
    // Read-after-write
    const list = await authedGet<DocumentRow[]>(page, '/documents')
    expect(list.length).toBeGreaterThan(0)
  })

  test('All filter chip is pressed by default', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^All$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('Drafts filter narrows the list and bumps the "Filter applied" counter', async ({
    page,
  }) => {
    // Seed two drafts via API so the list is non-empty.
    await authedPost(page, '/documents', { title: 'D-1', content: '', status: 'draft' })
    await authedPost(page, '/documents', { title: 'P-1', content: '', status: 'published' })
    await page.reload()
    await page.getByRole('button', { name: /^Drafts$/ }).click()
    await expect(page.getByRole('button', { name: /^Drafts$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByText(/Filter applied/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /D-1/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /P-1/ })).not.toBeVisible()
  })

  test('Published filter narrows to published-only', async ({ page }) => {
    await authedPost(page, '/documents', { title: 'Draft-A', content: '', status: 'draft' })
    await authedPost(page, '/documents', { title: 'Pub-A', content: '', status: 'published' })
    await page.reload()
    await page.getByRole('button', { name: /^Published$/ }).click()
    await expect(page.getByRole('button', { name: /^Published$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('link', { name: /Pub-A/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Draft-A/ })).not.toBeVisible()
  })

  test('AI assisted filter sets aria-pressed', async ({ page }) => {
    await page.getByRole('button', { name: /AI assisted/i }).click()
    await expect(page.getByRole('button', { name: /AI assisted/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('Archived filter sets aria-pressed', async ({ page }) => {
    await page.getByRole('button', { name: /^Archived$/ }).click()
    await expect(page.getByRole('button', { name: /^Archived$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('Search box filters by title substring', async ({ page }) => {
    await authedPost(page, '/documents', {
      title: 'Manuscript About Whales',
      content: '',
      status: 'draft',
    })
    await authedPost(page, '/documents', {
      title: 'Essay On Sand',
      content: '',
      status: 'draft',
    })
    await page.reload()
    const search = page.getByRole('searchbox', { name: /Search documents/i })
    await search.fill('whales')
    await expect(page.getByRole('link', { name: /Manuscript About Whales/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Essay On Sand/i })).not.toBeVisible()
  })

  test('Empty-state Create-new-document CTA navigates to a fresh editor', async ({ page }) => {
    // Filter to a category that has nothing to surface the empty-state CTA.
    await page.getByRole('button', { name: /^Archived$/ }).click()
    await page.getByRole('link', { name: /Create new document/i }).click()
    await page.waitForURL(/\/documents\/[0-9a-f-]{8,}/i, { timeout: 20_000 })
  })
})
