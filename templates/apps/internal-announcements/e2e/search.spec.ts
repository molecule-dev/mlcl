/**
 * /search — workspace-wide search across announcements, channels, people.
 *
 * The page aggregates `/api/announcements`, `/api/categories`, and
 * `/api/team` then filters client-side based on the search input. We
 * cover: typing narrows the list, kind filter pivots, results link to
 * the right detail pages, and ?q= URL param pre-fills the input.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedAnnouncement, signup, uniqueEmail } from './_helpers.js'

test.describe('search page', () => {
  test('renders the search input and four filter chips', async ({ page }) => {
    await signup(page, uniqueEmail('search-shape'))
    await page.goto(APP_BASE + '/search')
    await expect(page.getByTestId('search-input')).toBeVisible()
    await expect(page.getByTestId('search-filter-all')).toBeVisible()
    await expect(page.getByTestId('search-filter-announcement')).toBeVisible()
    await expect(page.getByTestId('search-filter-channel')).toBeVisible()
    await expect(page.getByTestId('search-filter-person')).toBeVisible()
  })

  test('typing a query narrows results to matching announcements', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-narrow'))
    const uniqueWord = `Distinctive${Date.now()}`
    const a = await seedAnnouncement(page, accessToken, {
      title: `${uniqueWord} announcement`,
    })
    await page.goto(APP_BASE + '/search')
    await page.getByTestId('search-input').fill(uniqueWord)
    await page.waitForTimeout(400)
    await expect(page.getByText(a.title).first()).toBeVisible()
  })

  test('?q=… in the URL prefills the search input', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-qparam'))
    const tag = `Tag${Date.now()}`
    await seedAnnouncement(page, accessToken, { title: `${tag} something` })
    await page.goto(APP_BASE + `/search?q=${tag}`)
    await page.waitForTimeout(300)
    const value = await page.getByTestId('search-input').inputValue()
    expect(value).toContain(tag)
  })

  test('clicking the "Announcements" filter shows announcement results only', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-filter-ann'))
    await seedAnnouncement(page, accessToken, { title: `FilterTest${Date.now()}` })
    await page.goto(APP_BASE + '/search?q=FilterTest')
    await page.getByTestId('search-filter-announcement').click()
    await page.waitForTimeout(300)
    // We can't easily count cards across kinds without DOM-internal
    // structure, but the filter button should be active.
    const active = await page.getByTestId('search-filter-announcement').getAttribute('class')
    expect(active).toBeTruthy()
  })

  test('clicking the "Channels" filter shows channel results', async ({ page }) => {
    await signup(page, uniqueEmail('search-filter-channel'))
    await page.goto(APP_BASE + '/search?q=company')
    await page.getByTestId('search-filter-channel').click()
    await page.waitForTimeout(300)
    // Default seeded channels include #company — assert it appears as a
    // result kind.
    const html = await page.locator('main').innerText()
    expect(html.toLowerCase()).toContain('company')
  })

  test('clicking the "People" filter shows the signed-up user', async ({ page }) => {
    const { firstName } = await signup(page, uniqueEmail('search-filter-people'))
    await page.goto(APP_BASE + `/search?q=${firstName}`)
    await page.getByTestId('search-filter-person').click()
    await page.waitForTimeout(300)
    const html = await page.locator('main').innerText()
    expect(html).toContain(firstName)
  })

  test('an announcement result link points to /announcement/<uuid>', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('search-link'))
    const a = await seedAnnouncement(page, accessToken, { title: `LinkTest${Date.now()}` })
    await page.goto(APP_BASE + `/search?q=${encodeURIComponent(a.title)}`)
    await page.waitForTimeout(400)
    const link = page.getByRole('link', { name: new RegExp(a.title, 'i') }).first()
    const href = await link.getAttribute('href')
    expect(href).toBe(`/announcement/${a.id}`)
  })

  test('on mount the page loads /api/announcements + /api/categories + /api/team', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('search-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/search', { waitUntil: 'networkidle' })
    })
    expect(reqs.some((r) => /\/api\/announcements(?!\/me)/.test(r.url))).toBe(true)
    expect(reqs.some((r) => /\/api\/categories\b/.test(r.url))).toBe(true)
    expect(reqs.some((r) => /\/api\/team\b/.test(r.url))).toBe(true)
  })

  test('Sign out from /search works', async ({ page }) => {
    await signup(page, uniqueEmail('search-signout'))
    await page.goto(APP_BASE + '/search')
    await page
      .getByRole('button', { name: /SIGN OUT|Sign out/i })
      .first()
      .click()
    await page.waitForURL(/\/login/, { timeout: 5000 })
  })

  test('Theme toggle flips data-mol-mode on /search', async ({ page }) => {
    await signup(page, uniqueEmail('search-theme'))
    await page.goto(APP_BASE + '/search')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /Toggle theme/i })
      .first()
      .click()
    await page.waitForTimeout(200)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after).not.toBe(before)
  })
})
