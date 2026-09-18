import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiGet,
  apiPost,
  captureNetwork,
  createArticle,
  createSpace,
  signup,
} from './_helpers.js'

test('Search idle state shows guidance', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await expect(page.getByText(/Type a query and press Enter to search/i)).toBeVisible({
    timeout: 10_000,
  })
})

test('Search submit fans out GET /api/articles?q= and GET /api/spaces', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await createArticle(page, {
    space_id: sp.id,
    title: 'Search-net article',
    body_md: 'unique-body-token',
    body_html: '<p>unique-body-token</p>',
    status: 'published',
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(`${APP_BASE}/search?q=unique-body-token`)
    await page.waitForTimeout(800)
  })
  const articlesReq = reqs.find(
    (r) =>
      /\/api\/articles(\?|$)/.test(r.url) &&
      /q=unique-body-token/.test(r.url) &&
      r.method === 'GET',
  )
  const spacesReq = reqs.find((r) => /\/api\/spaces(\?|$)/.test(r.url) && r.method === 'GET')
  expect(articlesReq?.status).toBe(200)
  expect(spacesReq?.status).toBe(200)
})

test('Search ?q= matches an article by title', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await createArticle(page, {
    space_id: sp.id,
    title: 'Postgres failover runbook',
    body_md: 'When primary fails, promote replica.',
    body_html: '<p>When primary fails, promote replica.</p>',
    status: 'published',
  })
  await page.goto(`${APP_BASE}/search?q=Postgres`)
  await expect(page.getByText('Postgres failover runbook')).toBeVisible({ timeout: 10_000 })
})

test('Search ?q= matches an article by body content', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await createArticle(page, {
    space_id: sp.id,
    title: 'Incident comms',
    body_md: 'On-call escalation playbook for SEV-1 outages.',
    body_html: '<p>On-call escalation playbook for SEV-1 outages.</p>',
    status: 'published',
  })
  await page.goto(`${APP_BASE}/search?q=escalation`)
  await expect(page.getByText('Incident comms')).toBeVisible({ timeout: 10_000 })
})

test('Search empty state for no matches', async ({ page }) => {
  await signup(page)
  await page.goto(`${APP_BASE}/search?q=zzz-no-match-${Date.now()}`)
  await expect(page.getByText(/Nothing matched/i)).toBeVisible({ timeout: 10_000 })
})

test('Search submit via form updates URL and runs query', async ({ page }) => {
  await signup(page)
  const sp = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  await createArticle(page, {
    space_id: sp.id,
    title: 'Quickstart guide',
    body_md: 'Getting started with the platform.',
    body_html: '<p>Getting started with the platform.</p>',
    status: 'published',
  })
  await page.goto(APP_BASE + '/search')
  await page.locator('input[placeholder*="Search"]').fill('Quickstart')
  await page.locator('input[placeholder*="Search"]').press('Enter')
  await expect(page).toHaveURL(/\?q=Quickstart/)
  await expect(page.getByText('Quickstart guide')).toBeVisible({ timeout: 10_000 })
})

test('Search spans member spaces, not just owned spaces', async ({ browser }) => {
  // owner authors an article in a space; member is invited and can see it.
  const ownerCtx = await browser.newContext()
  const memberCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()
  const member = await memberCtx.newPage()
  await signup(owner)
  await signup(member)
  const memberMe = await apiGet<{ props: { id: string } }>(member, '/users/me')

  const sp = await createSpace(owner, { key: `xs-${Date.now().toString(36)}`, name: 'Cross-space' })
  await apiPost(owner, `/spaces/${sp.id}/members`, {
    user_id: memberMe.body!.props.id,
    role: 'viewer',
  })
  const uniq = `unicornhunter${Date.now().toString(36)}`
  await createArticle(owner, {
    space_id: sp.id,
    title: 'Owner authored article',
    body_md: `keyword body ${uniq}`,
    body_html: `<p>keyword body ${uniq}</p>`,
    status: 'published',
  })

  // The member, who did not author the article, can still find it via search.
  await member.goto(`${APP_BASE}/search?q=${uniq}`)
  await expect(member.getByText('Owner authored article')).toBeVisible({ timeout: 10_000 })

  await ownerCtx.close()
  await memberCtx.close()
})

test('Search excludes articles in spaces user is NOT a member of', async ({ browser }) => {
  const ownerCtx = await browser.newContext()
  const otherCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()
  const other = await otherCtx.newPage()
  await signup(owner)
  await signup(other)

  const sp = await createSpace(owner, { key: `priv-${Date.now().toString(36)}`, name: 'Private' })
  const uniq = `secrettoken${Date.now().toString(36)}`
  await createArticle(owner, {
    space_id: sp.id,
    title: 'Private article',
    body_md: `secret body ${uniq}`,
    body_html: `<p>secret body ${uniq}</p>`,
    status: 'published',
  })

  // 'other' is not a member — they should not see the article.
  await other.goto(`${APP_BASE}/search?q=${uniq}`)
  await expect(other.getByText('Private article')).toBeHidden({ timeout: 10_000 })
  await expect(other.getByText(/Nothing matched/i)).toBeVisible({ timeout: 10_000 })

  await ownerCtx.close()
  await otherCtx.close()
})
