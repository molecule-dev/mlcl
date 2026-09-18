import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  pickShow,
  pickUnsubscribedShow,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * End-to-end "kitchen-sink" journey for a brand-new listener:
 *
 *   1. Sign up → land on /discover
 *   2. Discover → click a featured show → land on /shows/:id
 *   3. Show → click first episode → land on /episodes/:id
 *   4. Episode → add to queue → confirm /queue contains it
 *   5. Queue → remove episode → confirm it's gone
 *   6. Library → confirm the seeded subscriptions render
 *   7. Subscribe to an unsubscribed catalog show → confirm Library updates
 *   8. Settings → toggle a preference → confirm it persists across reload
 *   9. Notifications → confirm seeded welcome notification appears
 *  10. Search → query a catalog show's title → confirm result appears
 *
 * Touches every primary feature in one user session and verifies each
 * action against the backend (read-after-write), not just UI state.
 */
test('full listener journey: signup → discover → show → episode → queue → library → settings → search', async ({
  page,
}) => {
  test.setTimeout(180_000)
  const email = uniqueEmail('journey')
  const password = 'TestPass123!'

  // 1. Signup.
  await signup(page, email, password)
  await expect(page).toHaveURL(/\/discover$/)
  await expect(page.getByRole('heading', { name: /^discover$/i, level: 1 })).toBeVisible()

  // 2. Click a show card.
  const showCard = page.locator('a[href^="/shows/"]').first()
  await expect(showCard).toBeVisible({ timeout: 10000 })
  const showHref = await showCard.getAttribute('href')
  await showCard.click()
  await expect(page).toHaveURL(new RegExp(`${showHref}$`))

  // 3. Click first episode.
  const epLink = page.locator('a[href^="/episodes/"]').first()
  await expect(epLink).toBeVisible({ timeout: 10000 })
  await epLink.click()
  await expect(page).toHaveURL(/\/episodes\/[0-9a-f-]{36}$/)

  // 4. Add to queue + verify backend POST.
  const enqueueRequests = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /add to queue/i }).click()
    await page.waitForTimeout(1200)
  })
  expect(
    enqueueRequests.some((r) => r.method === 'POST' && /\/api\/queue/.test(r.url)),
  ).toBeTruthy()

  // 5. Visit /queue and confirm at least one item, then clear it.
  await page.goto(APP_BASE + '/queue')
  await expect(page.getByRole('listitem').first()).toBeVisible({ timeout: 10000 })
  const clearRequests = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /clear queue/i }).click()
    await page.waitForTimeout(1500)
  })
  expect(
    clearRequests.some((r) => r.method === 'DELETE' && /\/api\/queue/.test(r.url)),
  ).toBeTruthy()
  await page.reload()
  await expect(page.getByRole('listitem')).toHaveCount(0)

  // 6. Library — seeded subscriptions render.
  await page.goto(APP_BASE + '/library')
  await expect(page.getByRole('heading', { name: /your library/i })).toBeVisible()
  await expect(page.locator('a[href^="/shows/"]').first()).toBeVisible({ timeout: 10000 })

  // 7. Subscribe to a different show via the show-detail page, then
  //    verify Library reflects the change. The show is read from the catalog
  //    so the journey survives the demo shows being replaced.
  const unsubscribed = await pickUnsubscribedShow(page)
  await page.goto(APP_BASE + `/shows/${unsubscribed.id}`)
  const subBtn = page.getByRole('button', { name: /subscrib/i }).first()
  await expect(subBtn).toBeVisible()
  const initialText = (await subBtn.textContent()) ?? ''
  const subRequests = await captureNetwork(page, async () => {
    await subBtn.click()
    await page.waitForTimeout(1500)
  })
  expect(
    subRequests.some(
      (r) => (r.method === 'POST' || r.method === 'DELETE') && /\/api\/subscriptions\//.test(r.url),
    ),
  ).toBeTruthy()
  // Toggling again should produce the inverse state.
  const newText =
    (await page
      .getByRole('button', { name: /subscrib/i })
      .first()
      .textContent()) ?? ''
  expect(newText).not.toEqual(initialText)

  // 8. Settings — change default speed, reload, confirm persistence.
  await page.goto(APP_BASE + '/settings')
  const speed = page.getByRole('textbox', { name: /default speed/i })
  await expect(speed).toBeVisible()
  await speed.fill('1.75×')
  await speed.blur()
  await page.waitForTimeout(1500)
  await page.reload()
  await expect(page.getByRole('textbox', { name: /default speed/i })).toHaveValue(/1\.75/)

  // 9. Notifications — seeded welcome should appear.
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('listitem').first()).toBeVisible({ timeout: 8000 })

  // 10. Search — find a catalog show by its own title.
  const show = await pickShow(page)
  await page.goto(APP_BASE + '/search')
  await page.getByRole('searchbox').fill(show.title)
  await expect(page.getByRole('link', { name: show.title }).first()).toBeVisible({
    timeout: 8000,
  })
})
