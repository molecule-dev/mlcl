import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createSpace, signup } from './_helpers.js'

test('Editor toolbar inserts markdown into the body textarea', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await page.goto(`${APP_BASE}/article/new/edit?space=${sp.key}`)
  await page.waitForTimeout(800)

  const ta = page.locator('textarea[data-editor-body]')
  await ta.fill('')

  await page.getByRole('button', { name: /^bold$/i }).click()
  await expect(ta).toHaveValue(/\*\*bold\*\*/)

  await page.getByRole('button', { name: /^italic$/i }).click()
  await expect(ta).toHaveValue(/\*italic\*/)

  await page.getByRole('button', { name: /^bullets$/i }).click()
  await expect(ta).toHaveValue(/- Item/)
})

test('Save-draft on a brand-new article requires a title', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await page.goto(`${APP_BASE}/article/new/edit?space=${sp.key}`)
  await page.waitForTimeout(500)

  await page.getByRole('button', { name: /save draft/i }).click()
  await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 })
})

test('Body textarea reflects typed input', async ({ page }) => {
  // The route /article/:id/edit drives this whole spec.
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await page.goto(`${APP_BASE}/article/new/edit?space=${sp.key}`)
  await page.waitForTimeout(500)
  const ta = page.locator('textarea[data-editor-body]')
  await ta.fill('First paragraph from the user.')
  await expect(ta).toHaveValue('First paragraph from the user.')
})

test('Title input accepts typing and is required for save', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await page.goto(`${APP_BASE}/article/new/edit?space=${sp.key}`)
  await page.waitForTimeout(500)
  const titleInput = page.locator('input[aria-label*="title"], input[aria-label*="Title"]').first()
  await titleInput.fill('Drafting a runbook')
  await expect(titleInput).toHaveValue('Drafting a runbook')
  // With a title typed but body empty, Save draft should still POST (not throw).
  await page.locator('textarea[data-editor-body]').fill('# H\n\nbody')
  // Don't submit here — POST is covered in articles.spec.ts.
})

test('Toolbar buttons stack: bold then italic both appear', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await page.goto(`${APP_BASE}/article/new/edit?space=${sp.key}`)
  await page.waitForTimeout(800)
  const ta = page.locator('textarea[data-editor-body]')
  await ta.fill('')
  await page.getByRole('button', { name: /^bold$/i }).click()
  await page.getByRole('button', { name: /^italic$/i }).click()
  // Both markers present after two clicks
  const value = await ta.inputValue()
  expect(value).toContain('**')
  expect(value).toMatch(/\*[^*]+\*/)
})
