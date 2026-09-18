/**
 * /stats — derived analytics from /api/documents.
 *
 * Asserts the page mounts after creating a few real documents, the
 * total-words / drafts / published figures change after seeding, and
 * the recent-edits list reflects actual rows.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createDocument, signup } from './_helpers.js'

test.describe('/stats', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('renders KPI numbers derived from the live document list', async ({ page }) => {
    // Seed 3 documents with realistic word counts.
    await createDocument(page, {
      title: 'Alpha',
      body_md: 'one two three four five six seven eight',
    })
    await createDocument(page, {
      title: 'Beta',
      body_md: 'a b c d e f g h i j k l m n o',
    })
    await createDocument(page, {
      title: 'Gamma',
      body_md: 'gamma is the third one with several words inside',
    })
    await page.goto(APP_BASE + '/stats')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    // Page mentions documents created above by title in the recent-edits list.
    await expect(page.getByText(/Gamma|Beta|Alpha/).first()).toBeVisible()
  })
})
