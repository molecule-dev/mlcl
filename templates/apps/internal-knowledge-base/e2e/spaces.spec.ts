import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiGet,
  captureNetwork,
  createArticle,
  createSpace,
  signup,
  uniqueEmail,
} from './_helpers.js'

test('SpacesIndex empty state is rendered for fresh user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/spaces')
  // No spaces yet → empty state with CTA
  await expect(
    page.getByRole('link', { name: /create your first space|new space/i }).first(),
  ).toBeVisible()
})

test('NewSpace form creates a space and navigates to it; GET /spaces/:key reflects creation', async ({
  page,
}) => {
  await signup(page)
  const slug = `eng-${Date.now().toString(36)}`
  await page.goto(APP_BASE + '/spaces/new')
  await page.locator('input#space-name').fill('Engineering')
  // The slug auto-populates from name; override to make it unique
  await page.locator('input#space-key').fill(slug)
  await page.locator('textarea#space-description').fill('Runbooks and the rest.')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /create space/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/spaces/${slug}`), { timeout: 10_000 })
  })
  const post = reqs.find((r) => /\/api\/spaces$/.test(r.url) && r.method === 'POST')
  expect(post?.status).toBe(201)

  // Verify GET returns it
  const got = await apiGet<{ id: string; key: string; name: string }>(page, `/spaces/${slug}`)
  expect(got.status).toBe(200)
  expect(got.body?.name).toBe('Engineering')

  // Reload preserves the URL and page contents
  await page.reload()
  await expect(page.locator('h1', { hasText: 'Engineering' })).toBeVisible()
})

test('SpaceHome lists articles in the space (created via API)', async ({ page }) => {
  await signup(page)
  const space = await createSpace(page, { key: `prod-${Date.now().toString(36)}`, name: 'Product' })
  const a = await createArticle(page, {
    space_id: space.id,
    title: 'Q4 RFC: pricing model',
    body_md: '# Pricing\nUsage-based.',
    body_html: '<h1>Pricing</h1>',
    status: 'published',
  })
  expect(a.title).toBe('Q4 RFC: pricing model')

  await page.goto(`${APP_BASE}/spaces/${space.key}`)
  await expect(page.locator('h1', { hasText: 'Product' })).toBeVisible()
  await expect(page.getByText('Q4 RFC: pricing model')).toBeVisible()
})

test('Spaces index shows multiple spaces and links to each', async ({ page }) => {
  await signup(page)
  const a = await createSpace(page, { key: `eng-${Date.now().toString(36)}`, name: 'Engineering' })
  const b = await createSpace(page, { key: `ppl-${Date.now().toString(36)}`, name: 'Field Ops' })
  await page.goto(APP_BASE + '/spaces')
  await expect(page.getByText(a.name)).toBeVisible()
  await expect(page.getByText(b.name)).toBeVisible()
})

test('SpacesIndex header CTA "New space" links to /spaces/new', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/spaces')
  // After fresh signup the header CTA shows "New space" or the empty-
  // state CTA "Create your first space" — both point to /spaces/new.
  const cta = page.getByRole('link', { name: /(new space|create your first space)/i }).first()
  await expect(cta).toHaveAttribute('href', '/spaces/new')
  await cta.click()
  await expect(page).toHaveURL(/\/spaces\/new/, { timeout: 10_000 })
})

test("Cannot read another user's space (authz)", async ({ page, browser }) => {
  // Create user A and a space.
  const ctxA = await browser.newContext()
  const pA = await ctxA.newPage()
  await signup(pA, uniqueEmail('userA'))
  const sA = await createSpace(pA, { key: `pa-${Date.now().toString(36)}`, name: 'Private A' })
  await ctxA.close()

  // User B should not be able to read it.
  await signup(page, uniqueEmail('userB'))
  const r = await apiGet(page, `/spaces/${sA.key}`)
  expect(r.status).toBe(404)
})
