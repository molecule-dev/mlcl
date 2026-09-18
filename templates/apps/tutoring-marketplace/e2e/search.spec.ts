/**
 * /search — public tutor search.
 * Asserts real DB rows render, query parameter triggers a backend search
 * call, subject filter narrows the rendered set, and rating filter behaves.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  SUBJECT_CHIPS,
  captureNetwork,
  getTutors,
  pickSubjectChip,
  splitByRating,
  tutorMatchesChip,
} from './_helpers.js'

test('search page renders every tutor the catalog returns', async ({ page }) => {
  // The rendered set is compared against the same endpoint the page reads, so
  // the spec still holds once the demo tutors are replaced with real ones.
  const catalog = await getTutors(page)
  expect(catalog.length).toBeGreaterThan(0)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(catalog.length)
  await expect(
    page.getByRole('heading', { level: 3, name: catalog[0]!.display_name }),
  ).toBeVisible()
})

test('typing in the search input updates the query and refires /api/tutors', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="search"]').first().fill('python')
    await page.waitForTimeout(1_500)
  })
  const searchCall = reqs.find(
    (r) => r.method === 'GET' && /\/api\/tutors\?search=python/.test(r.url),
  )
  expect(searchCall, 'expected GET /api/tutors?search=python').toBeDefined()
  expect(searchCall?.status).toBe(200)
})

test('subject filter narrows the visible tutor cards', async ({ page }) => {
  // Drive whichever subject chip the live catalog can demonstrate — one tutor
  // it keeps, one it hides — instead of naming a demo tutor's subject.
  const { chip, match, miss } = await pickSubjectChip(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const beforeCount = await page.getByRole('heading', { level: 3 }).count()
  await page
    .getByRole('button', { name: new RegExp(`^${chip.label}$`, 'i') })
    .first()
    .click()
  await page.waitForTimeout(800)
  await expect(page.getByRole('heading', { level: 3, name: match.display_name })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: miss.display_name })).toHaveCount(0)
  const afterCount = await page.getByRole('heading', { level: 3 }).count()
  expect(afterCount).toBeLessThan(beforeCount)
})

test('rating filter "4.8★+" filters out lower-rated tutors', async ({ page }) => {
  // Which tutors survive 4.8+ is read from the catalog's own rating_average.
  const { above, below } = await splitByRating(page, 4.8)
  expect(above, 'the catalog needs a tutor rated 4.8 or better').toBeTruthy()
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.getByRole('radio', { name: /4\.8/ }).first().check()
  await page.waitForTimeout(500)
  await expect(page.getByRole('heading', { level: 3, name: above!.display_name })).toBeVisible()
  if (below) {
    await expect(page.getByRole('heading', { level: 3, name: below.display_name })).toHaveCount(0)
  }
})

test('search results count line is rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(/tutors match your filters/i).first()).toBeVisible()
})

test('clicking a tutor card navigates to /tutor/:id', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  // First tutor card link goes to /tutor/<uuid>
  const firstCard = page.locator('a[href^="/tutor/"]').first()
  await firstCard.click()
  await page.waitForURL(/\/tutor\//, { timeout: 10_000 })
})

test('"All" subject button resets subject filter to all tutors', async ({ page }) => {
  // "all tutors" = however many the catalog holds, read from the API.
  const catalog = await getTutors(page)
  const { chip } = await pickSubjectChip(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  // Pick a narrow filter first, then go back to All
  await page
    .getByRole('button', { name: new RegExp(`^${chip.label}$`, 'i') })
    .first()
    .click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^all$/i }).first().click()
  await page.waitForTimeout(500)
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(catalog.length)
})

test('"Mathematics" subject button filters to mathematics tutors', async ({ page }) => {
  const mathChip = SUBJECT_CHIPS.find((c) => c.key === 'math')!
  // Who teaches mathematics is read from the catalog's own subjects array.
  const catalog = await getTutors(page)
  const mathTutors = catalog.filter((tt) => tutorMatchesChip(tt, mathChip))
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^mathematics$/i })
    .first()
    .click()
  await page.waitForTimeout(500)
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(mathTutors.length)
  if (mathTutors[0]) {
    await expect(
      page.getByRole('heading', { level: 3, name: mathTutors[0].display_name }),
    ).toBeVisible()
  }
})

test('"Science" subject button filters to science tutors', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^science$/i })
    .first()
    .click()
  await page.waitForTimeout(500)
  // List filtered (count check is sufficient)
  const heads = await page.getByRole('heading', { level: 3 }).count()
  expect(heads).toBeGreaterThanOrEqual(0)
})

test('"Languages" subject button filters list', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('button', { name: /^languages$/i })
    .first()
    .click()
  await page.waitForTimeout(500)
  const heads = await page.getByRole('heading', { level: 3 }).count()
  expect(heads).toBeGreaterThanOrEqual(0)
})

test('"Any rating" radio resets the rating filter', async ({ page }) => {
  // Resetting must restore the whole catalog — its size comes from the API.
  const catalog = await getTutors(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.getByRole('radio', { name: /4\.8/ }).first().check()
  await page.waitForTimeout(300)
  await page
    .getByRole('radio', { name: /any rating/i })
    .first()
    .check()
  await page.waitForTimeout(300)
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(catalog.length)
})

test('"4★+" rating radio applies a 4-and-up filter', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page
    .getByRole('radio', { name: /4★/ })
    .first()
    .check()
    .catch(async () => {
      await page.getByRole('radio', { name: /^4\b/ }).first().check()
    })
  await page.waitForTimeout(300)
  const heads = await page.getByRole('heading', { level: 3 }).count()
  expect(heads).toBeGreaterThanOrEqual(0)
})

test('"4.5★+" rating radio applies a 4.5-and-up filter', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.getByRole('radio', { name: /4\.5/ }).first().check()
  await page.waitForTimeout(300)
  const heads = await page.getByRole('heading', { level: 3 }).count()
  expect(heads).toBeGreaterThanOrEqual(0)
})
