/**
 * Coaching list + detail page contract.
 *
 * - The list page renders the articles /api/coaching returns (no PROGRAMS mock)
 * - Clicking an article navigates to /coaching/:id and the detail body renders
 * - A non-existent id renders a "not found" empty state (no fake "Day 9 of 14")
 *
 * The article library is demo content an app's owner replaces, so these specs
 * read the titles under test from the API instead of naming one.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listCoachingArticles, signup } from './_helpers.js'

test('list renders the articles the API returns (no mock PROGRAMS)', async ({ page }) => {
  const { accessToken } = await signup(page)
  // Read the library from the same endpoint the page reads.
  const articles = await listCoachingArticles(page, accessToken)
  expect(articles.length).toBeGreaterThan(0)

  await page.goto(APP_BASE + '/coaching')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('coaching-list')).toBeVisible({ timeout: 10_000 })

  // Every article the API returned renders as a real title in the list.
  for (const article of articles) {
    await expect(page.getByTestId('coaching-list').getByText(article.title).first()).toBeVisible()
  }
  // Old hardcoded copy must not appear.
  await expect(page.getByText(/Day 9 of 14/)).toHaveCount(0)
  await expect(page.getByText(/Reset your bedtime/)).toHaveCount(0)
})

test('clicking an article opens its detail page with body content', async ({ page }) => {
  const { accessToken } = await signup(page)
  const articles = await listCoachingArticles(page, accessToken)
  const target = articles[0]
  expect(target, 'coaching library is empty').toBeTruthy()

  await page.goto(APP_BASE + `/coaching/${target!.id}`)
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('coaching-detail-title')).toContainText(target!.title, {
    timeout: 10_000,
  })
  await expect(page.getByTestId('coaching-detail-body')).toBeVisible()
})

test('non-existent article id shows not-found state', async ({ page }) => {
  // The 404 console error IS the contract here — the detail fetch must miss
  // loudly for the not-found state to render.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
  await signup(page)
  await page.goto(APP_BASE + '/coaching/00000000-0000-0000-0000-000000000000')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('coaching-detail-not-found')).toBeVisible({ timeout: 10_000 })
})
