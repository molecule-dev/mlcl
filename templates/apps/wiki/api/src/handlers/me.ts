import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { ensurePrefs } from './prefs.js'

const router = Router()

interface UserRow {
  id: string
  name?: string | null
  email?: string | null
  username?: string | null
  planKey?: string | null
}

interface SpaceRow {
  id: string
  owner_id: string
  name: string
  slug: string
}

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Idempotently ensure the signed-in user has at least one space and a
 * welcome page. Called by GET /api/me on first read so a fresh signup
 * doesn't drop the user into an empty state. Returns the seeded space.
 */
export async function ensureDefaultSpace(userId: string, displayName: string): Promise<SpaceRow> {
  const existing = await findOne<SpaceRow>('wiki_spaces', [
    { field: 'owner_id', operator: '=', value: userId },
  ])
  if (existing) return existing

  const baseName = displayName.trim().split(/\s+/)[0] || 'Personal'
  const name = `${baseName} workspace`
  let slug = slugify(name) || `space-${Date.now()}`
  let suffix = 1
  while (await findOne('wiki_spaces', [{ field: 'slug', operator: '=', value: slug }])) {
    slug = `${slugify(name)}-${suffix++}`
  }
  // The existence check above and this insert are not atomic, and /me is called
  // concurrently for a freshly signed-up user. Both callers see "no space", both
  // pick the SAME free slug, and the loser's insert violates the unique index —
  // surfacing as a 500 from /me moments after signup. Losing that race is not an
  // error: the winner created precisely the row we wanted, so adopt it.
  let space: SpaceRow
  try {
    const created = await create<SpaceRow>('wiki_spaces', {
      owner_id: userId,
      name,
      slug,
      description: 'Your personal Cairn — capture ideas, RFCs, and runbooks.',
      icon: 'workspaces',
      color: null,
      visibility: 'private',
      is_public: false,
      page_count: 0,
      created_at: new Date(),
    })
    space =
      (created.data as SpaceRow) ??
      (await findOne<SpaceRow>('wiki_spaces', [{ field: 'slug', operator: '=', value: slug }]))!
  } catch (error) {
    const raced = await findOne<SpaceRow>('wiki_spaces', [
      { field: 'owner_id', operator: '=', value: userId },
    ])
    // No row means the insert failed for some OTHER reason — do not swallow it.
    if (!raced) throw error
    return raced
  }

  // Seed a welcome page and a starter RFC template page so the user can see
  // a real list and explore the editor without a blank-canvas problem.
  const welcomeContent = `# Welcome to Cairn

This is your first page. Edit it freely — every change is auto-versioned.

- **Search** finds across all your spaces.
- **Trash** keeps deleted pages for 30 days.
- **Templates** seed common docs (RFC, post-mortem, oncall runbook).

Use the **+ New page** button in the sidebar to start writing.`
  const welcomeSlug = 'welcome'
  await create('wiki_pages', {
    space_id: space.id,
    parent_id: null,
    title: 'Welcome to Cairn',
    slug: welcomeSlug,
    content: welcomeContent,
    summary: null,
    is_template: false,
    position: null,
    trashed_at: null,
    tags: JSON.stringify(['onboarding']),
    author_id: userId,
    last_editor_id: userId,
    version: 1,
    sort_order: 0,
    created_at: new Date(),
    updated_at: new Date(),
  })
  const welcomeRow = await findOne<{ id: string }>('wiki_pages', [
    { field: 'space_id', operator: '=', value: space.id },
    { field: 'slug', operator: '=', value: welcomeSlug },
  ])
  if (welcomeRow) {
    await create('wiki_page_versions', {
      page_id: welcomeRow.id,
      title: 'Welcome to Cairn',
      content: welcomeContent,
      version: 1,
      editor_id: userId,
      created_at: new Date(),
    })
  }

  return space
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const user = await findById<UserRow>('users', userId)
    if (!user)
      return res
        .status(404)
        .json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })

    const displayName = user.name || user.email?.split('@')[0] || 'You'
    const defaultSpace = await ensureDefaultSpace(userId, displayName)
    await ensurePrefs(userId)

    const pageCount = await count('wiki_pages', [
      { field: 'author_id', operator: '=', value: userId },
      { field: 'trashed_at', operator: 'is_null', value: null },
    ])
    const spaceCount = await count('wiki_spaces', [
      { field: 'owner_id', operator: '=', value: userId },
    ])

    res.json({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      username: user.username ?? null,
      planKey: user.planKey ?? 'free',
      defaultSpace: { id: defaultSpace.id, name: defaultSpace.name, slug: defaultSpace.slug },
      stats: { pageCount, spaceCount },
    })
  } catch (err) {
    console.error('[me.get]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
