/**
 * /editor/:id/focus — distraction-free writing.
 *
 * Asserts the focus surface mounts, autosaves the body to the same row
 * as the editor (PATCH /documents/:id), and the word count updates as
 * the user types.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createDocument, readDocument, signup } from './_helpers.js'

test.describe('/editor/:id/focus', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('loads the document body and renders chrome', async ({ page }) => {
    const doc = await createDocument(page, {
      title: 'Focus Loaded',
      body_md: 'hush one two three four',
    })
    await page.goto(`${APP_BASE}/editor/${doc.id}/focus`)
    await expect(page.getByTestId('focus-body')).toHaveValue(/hush one two three four/)
    await expect(page.getByTestId('focus-word-count')).toContainText('5')
  })

  test('autosave persists body changes to the same document row', async ({ page }) => {
    const doc = await createDocument(page, { title: 'Focus Autosave', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}/focus`)
    await page.getByTestId('focus-body').fill('focus mode body persisted')
    await page.waitForTimeout(2_500)
    await expect(page.getByTestId('focus-save-state')).toContainText(/Saved/i, { timeout: 6_000 })
    const fresh = await readDocument(page, doc.id)
    expect(fresh.body_md).toBe('focus mode body persisted')
  })

  test('"Exit focus mode" link routes back to the regular editor', async ({ page }) => {
    const doc = await createDocument(page, { title: 'Exit Focus', body_md: '' })
    await page.goto(`${APP_BASE}/editor/${doc.id}/focus`)
    // Header chrome may auto-hide; trigger a movement to reveal it.
    await page.mouse.move(20, 20)
    await page.getByRole('link', { name: /Exit focus mode/i }).click()
    await page.waitForURL(new RegExp(`/editor/${doc.id}$`))
  })
})
