import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiGet,
  apiPatch,
  apiPost,
  createArticle,
  createSpace,
  signup,
} from './_helpers.js'

test('Notifications empty state for fresh user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  await expect(page.getByRole('heading', { name: /notifications/i })).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText(/You are caught up|No notifications/i)).toBeVisible()
})

test('Notifications filter buttons (All / Unread / Mentions) are wired and clickable', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  for (const label of ['All', 'Unread', 'Mentions']) {
    await page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click()
    await page.waitForTimeout(150)
  }
})

test('Mark-all-read disables when no unread', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/notifications')
  const btn = page.getByRole('button', { name: /mark all as read/i })
  await expect(btn).toBeDisabled()
})

test('Publishing an article fans out an article_published notification to space members', async ({
  browser,
}) => {
  // Two users: owner publishes, member receives the notification.
  const ownerCtx = await browser.newContext()
  const memberCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()
  const member = await memberCtx.newPage()

  const ownerCreds = await signup(owner)
  const memberCreds = await signup(member)

  // Resolve ids via /users/me on each session.
  const ownerMe = await apiGet<{ props: { id: string } }>(owner, '/users/me')
  const memberMe = await apiGet<{ props: { id: string } }>(member, '/users/me')
  expect(ownerMe.body?.props.id).toBeTruthy()
  expect(memberMe.body?.props.id).toBeTruthy()
  void ownerCreds
  void memberCreds

  // Owner creates space, adds member as editor.
  const space = await createSpace(owner, {
    key: 'team-' + Date.now(),
    name: 'Team Space',
    description: 'Shared space',
  })
  const addMember = await apiPost<{ id: string }>(owner, `/spaces/${space.id}/members`, {
    user_id: memberMe.body!.props.id,
    role: 'editor',
  })
  expect(addMember.status).toBe(201)

  // Pre-condition: the member starts with zero notifications.
  const before = await apiGet<unknown>(member, '/notifications')
  expect(before.status).toBe(200)
  const beforeArr = Array.isArray(before.body)
    ? before.body
    : ((before.body as { data?: unknown[] })?.data ?? [])
  expect(Array.isArray(beforeArr)).toBe(true)
  expect((beforeArr as unknown[]).length).toBe(0)

  // Owner publishes a new article straight from POST.
  const article = await createArticle(owner, {
    space_id: space.id,
    title: 'Brand new policy',
    body_md: 'Body.',
    status: 'published',
  })

  // Invariant: the member now has exactly one article_published notification.
  const after = await apiGet<unknown>(member, '/notifications')
  const afterArr = (
    Array.isArray(after.body) ? after.body : ((after.body as { data?: unknown[] })?.data ?? [])
  ) as Array<{
    id: string
    kind: string
    payload: { title?: string; href?: string; article_id?: string; actor?: string }
    read_at: string | null
  }>
  expect(afterArr.length).toBeGreaterThanOrEqual(1)
  const note = afterArr.find((n) => n.payload?.article_id === article.id)
  expect(note, 'notification for article_id should exist').toBeTruthy()
  expect(note!.kind).toBe('article_published')
  expect(note!.payload.title).toBe('Brand new policy')
  expect(note!.payload.href).toBe(`/article/${article.id}`)
  expect(note!.read_at).toBeNull()

  // Mark-as-read updates the row.
  const patched = await apiPatch<{ data?: { read_at?: string } }>(
    member,
    `/notifications/${note!.id}/read`,
    {},
  )
  expect(patched.status).toBe(200)
  const reread = await apiGet<unknown>(member, '/notifications')
  const rerArr = (
    Array.isArray(reread.body) ? reread.body : ((reread.body as { data?: unknown[] })?.data ?? [])
  ) as Array<{ id: string; read_at: string | null }>
  const r = rerArr.find((n) => n.id === note!.id)
  expect(r).toBeTruthy()
  expect(r!.read_at).not.toBeNull()

  // Author (owner) does NOT receive their own notification.
  const ownerNotes = await apiGet<unknown>(owner, '/notifications')
  const ownerArr = (
    Array.isArray(ownerNotes.body)
      ? ownerNotes.body
      : ((ownerNotes.body as { data?: unknown[] })?.data ?? [])
  ) as Array<{ payload: { article_id?: string } }>
  expect(ownerArr.find((n) => n.payload?.article_id === article.id)).toBeUndefined()

  await ownerCtx.close()
  await memberCtx.close()
})

test('PATCH draft → published also fires a notification', async ({ browser }) => {
  const ownerCtx = await browser.newContext()
  const memberCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()
  const member = await memberCtx.newPage()

  await signup(owner)
  await signup(member)
  const memberMe = await apiGet<{ props: { id: string } }>(member, '/users/me')

  const space = await createSpace(owner, {
    key: 'flip-' + Date.now(),
    name: 'Flip Space',
  })
  await apiPost(owner, `/spaces/${space.id}/members`, {
    user_id: memberMe.body!.props.id,
    role: 'viewer',
  })

  // Article starts as draft → no notification yet.
  const draft = await createArticle(owner, {
    space_id: space.id,
    title: 'Quietly drafting',
    body_md: 'Not yet ready.',
    status: 'draft',
  })
  const before = await apiGet<unknown>(member, '/notifications')
  const beforeArr = (
    Array.isArray(before.body) ? before.body : ((before.body as { data?: unknown[] })?.data ?? [])
  ) as unknown[]
  expect(beforeArr.length).toBe(0)

  // Flip to published → member should now see a notification.
  const flipped = await apiPatch<{ data?: { id: string; status: string } }>(
    owner,
    `/articles/${draft.id}`,
    { status: 'published' },
  )
  expect(flipped.status).toBe(200)

  const after = await apiGet<unknown>(member, '/notifications')
  const afterArr = (
    Array.isArray(after.body) ? after.body : ((after.body as { data?: unknown[] })?.data ?? [])
  ) as Array<{ payload: { article_id?: string } }>
  expect(afterArr.find((n) => n.payload?.article_id === draft.id)).toBeTruthy()

  // PATCH again (still published) — must not double-notify.
  await apiPatch(owner, `/articles/${draft.id}`, { title: 'Quietly drafting v2' })
  const final = await apiGet<unknown>(member, '/notifications')
  const finalArr = (
    Array.isArray(final.body) ? final.body : ((final.body as { data?: unknown[] })?.data ?? [])
  ) as Array<{ payload: { article_id?: string } }>
  expect(finalArr.filter((n) => n.payload?.article_id === draft.id).length).toBe(1)

  await ownerCtx.close()
  await memberCtx.close()
})
