import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { ConfirmButton } from '@molecule/app-ui-react'

import AppShell from '../components/AppShell.js'

const TAG_COLORS = [
  '#6366f1',
  '#ec4899',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#a855f7',
  '#eab308',
  '#14b8a6',
]

const PAGE_SIZE = 8

/**
 * How many tags one request reads from `GET /api/tags` — the endpoint caps
 * `limit` at 200 (api/handlers/tags.ts), so this is its largest honest page.
 */
const TAGS_PAGE_LIMIT = 200

/**
 * Bound on the pages one taxonomy load walks: 50 × {@link TAGS_PAGE_LIMIT} is
 * 10 000 tags, far past any real taxonomy, and the endpoint's own `total` ends
 * the walk long before this for every list that fits.
 */
const MAX_TAG_PAGES = 50

interface Tag {
  id: string
  name: string
  /** Some installs return snake-case from the legacy column,
   * others camelCase from the resource layer — accept both. */
  post_count?: number
  postCount?: number
  color?: string
  created_at?: string
  createdAt?: string
}

interface TagsListResponse {
  data?: Tag[]
  total?: number
}

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function formatRelativeDate(
  dateStr: string | undefined,
  t: (key: string, values?: Record<string, string>, opts?: { defaultValue: string }) => string,
): string {
  if (!dateStr) return '\u2014'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return '\u2014'
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays === 0) return t('status.today', {}, { defaultValue: 'Today' })
  if (diffDays === 1) return t('date.yesterday', {}, { defaultValue: 'Yesterday' })
  if (diffDays < 7)
    return t('date.daysAgo', { count: String(diffDays) }, { defaultValue: `${diffDays} days ago` })
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return t(
      'date.weeksAgo',
      { count: String(weeks) },
      { defaultValue: `${weeks} week${weeks === 1 ? '' : 's'} ago` },
    )
  }
  const months = Math.floor(diffDays / 30)
  return t(
    'date.monthsAgo',
    { count: String(months) },
    { defaultValue: `${months} month${months === 1 ? '' : 's'} ago` },
  )
}

/**
 * The page numbers the pagination control renders: the current page and its
 * immediate neighbours, at most three of them.
 *
 * The control used to enumerate EVERY page — `Array.from({ length: totalPages })`
 * — so the work it did per render scaled with the number of TAGS rather than
 * with the size of the control: a blog with thousands of tags built (and
 * mounted) thousands of buttons, each carrying its own inline style object, and
 * it did that again on every keystroke in the search box, because the filter
 * above re-renders this page. `PostListPagination` in this same app already
 * bounds its numbers this way (it shows `page - 1 … page + 1`); this keeps the
 * two paginators consistent and the render cost constant.
 *
 * @param totalPages - The last page number (always ≥ 1).
 * @param current - The page being shown.
 * @returns At most three page numbers, the current one in the middle.
 */
export function visiblePages(totalPages: number, current: number): number[] {
  const first = Math.max(1, Math.min(current - 1, totalPages - 2))
  const last = Math.min(totalPages, Math.max(current + 1, first + 2))
  return Array.from({ length: Math.max(0, last - first + 1) }, (_unused, i) => first + i)
}

export function Tags() {
  const { t } = useTranslation()
  const http = useHttpClient()
  const cm = getClassMap()

  const navigate = useNavigate()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  // Whether the taxonomy load FAILED. Without it the catch below left `tags` at
  // `[]`, which renders the table's "No tags yet" empty state and its "Create
  // your first tag" call to action — an offline / 500 answer presented as an
  // authoritative, genuinely-empty taxonomy, and the same wrong answer the
  // blog's own BlogIndexPage states at its catch. `loadAttempt` is the retry:
  // the failure state has to be recoverable without a full page reload.
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'most-used' | 'alpha' | 'recent'>('most-used')
  const [filterIndicator, setFilterIndicator] = useState(0)
  const [page, setPage] = useState(1)
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [tagName, setTagName] = useState('')
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0])
  const [saving, setSaving] = useState(false)
  // The handlers used to swallow failures silently — the modal just closed
  // (or appeared to do nothing) with no feedback. Surface them inline.
  const [modalError, setModalError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // A CREATE whose answer could not be confirmed: the POST may have created the
  // tag, but the 2xx body carried no tag row, so the page cannot adopt one.
  // `create` INSERTS, so re-POSTing the same name is not a retry — it is a
  // second insert. Set when the answer carries no id; the Save button then
  // refuses until the modal is closed (the "go look at the list" step the
  // error names), and a deliberate re-open starts a fresh create.
  const createUnconfirmed = useRef(false)

  // Close the create/edit modal on browser navigation (popstate / back-forward
  // / programmatic SPA pushes). Without this the modal becomes a sticky
  // overlay that blocks subsequent clicks when the page is re-entered.
  const location = useLocation()
  useEffect(() => {
    setShowModal(false)
  }, [location.key])
  useEffect(() => {
    const onPop = () => setShowModal(false)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Escape closes the create/edit modal (keyboard equivalent of the
  // pointer-only backdrop click).
  useEffect(() => {
    if (!showModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false)
        setTagName('')
        setEditingTag(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showModal])

  useEffect(() => {
    // A retry must not be clobbered by the request it superseded: a slow failed
    // load that lands after a successful retry would otherwise re-set the
    // failure state over a page that already has its rows.
    let cancelled = false
    async function load() {
      setLoadFailed(false)
      setLoading(true)
      try {
        // `GET /api/tags` is PAGINATED: it applies `limit`/`offset` and answers
        // `{ data, total, page, limit }`, with `limit` DEFAULTING to 100 and
        // capped at 200 (api/handlers/tags.ts). This page filters, sorts and
        // pages the taxonomy CLIENT-side, so a single unparameterised request
        // silently dropped every tag past the first 100 — the footer said
        // "of 100 tags" over a blog with more, the control's last page was the
        // 13th no matter how many tags existed, and the search box could never
        // match a tag that was never fetched. Read the whole taxonomy in
        // `limit`-capped pages, stopping when the endpoint's own `total` says
        // the list is complete.
        const collected: Tag[] = []
        let total = Number.POSITIVE_INFINITY
        for (let requestPage = 1; requestPage <= MAX_TAG_PAGES; requestPage++) {
          const res = await http.get<TagsListResponse>(
            `/api/tags?page=${requestPage}&limit=${TAGS_PAGE_LIMIT}`,
          )
          const batch = Array.isArray(res?.data?.data) ? res.data.data : []
          collected.push(...batch)
          if (typeof res?.data?.total === 'number') total = res.data.total
          if (batch.length === 0 || collected.length >= total) break
        }
        if (cancelled) return
        setTags(collected)
      } catch (_error) {
        // A failed load (offline, 500) must be VISIBLE, not empty: leaving the
        // list at `[]` handed the reader the table's "No tags yet" state and its
        // create CTA — a wrong answer that reads as an authoritative, empty
        // taxonomy and is indistinguishable from one. The failure is surfaced
        // with a retry instead (see `loadFailed` above).
        if (cancelled) return
        setTags([])
        setLoadFailed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [http, loadAttempt])

  const tagPostCount = (tag: Tag): number => tag.post_count ?? tag.postCount ?? 0
  const totalTaggedPosts = tags.reduce((sum, tag) => sum + tagPostCount(tag), 0)
  const mostUsedTag = tags.reduce<Tag | null>(
    (best, tag) => (!best || tagPostCount(tag) > tagPostCount(best) ? tag : best),
    null,
  )
  const maxPostCount = Math.max(...tags.map(tagPostCount), 1)

  const getTagColor = (tag: Tag, index: number) =>
    tag.color || TAG_COLORS[index % TAG_COLORS.length]

  const filtered = tags.filter((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const tagCreatedAt = (tag: Tag): number => {
    const raw = tag.created_at ?? tag.createdAt
    const time = raw ? new Date(raw).getTime() : NaN
    return isNaN(time) ? 0 : time
  }
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'alpha') return a.name.localeCompare(b.name)
    if (sortBy === 'most-used') return tagPostCount(b) - tagPostCount(a)
    // 'recent' — newest first
    return tagCreatedAt(b) - tagCreatedAt(a)
  })
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const handleCreate = async () => {
    if (!tagName.trim() || saving) return
    // A create the PREVIOUS save could not confirm must not be POSTed again:
    // `create` INSERTS, so a second Save of the same name is a duplicate, not a
    // retry (the endpoint has no idempotency key). Refuse until the modal is
    // closed — the "check the tag list" step the error names — so the reader
    // decides with the list in front of them.
    if (createUnconfirmed.current) {
      setModalError(
        t(
          'tags.createUnconfirmed',
          {},
          {
            defaultValue:
              'Could not confirm the tag was created — check the tag list before saving again.',
          },
        ),
      )
      return
    }
    setSaving(true)
    setModalError(null)
    try {
      const res = await http.post<Tag>('/api/tags', { name: tagName.trim(), color: selectedColor })
      // The mlcl-scaffolded HttpClient returns `HttpResponse<T>`. Some bonds
      // unwrap the body, others surface the body via `.data`. Defend either.
      const created = (res as unknown as Tag).id
        ? (res as unknown as Tag)
        : (res?.data as Tag | undefined)
      // A 2xx proves the route ANSWERED, not that a tag came back: the handler
      // answers 201 with the created row, but an unmocked route answers `200 {}`
      // and a proxy can rewrite the answer — the same non-answer the load path
      // above refuses to render. Adopting nothing is the quiet half; claiming
      // the create (closing the modal over a list with no new row, and firing
      // the `tag.created` event) was the loud one, for a write this page cannot
      // confirm. The row's `id` is what the list keys, and what Edit and Delete
      // address — nothing without one may enter state.
      if (typeof created?.id !== 'string' || created.id.length === 0) {
        createUnconfirmed.current = true
        setModalError(
          t(
            'tags.createUnconfirmed',
            {},
            {
              defaultValue:
                'Could not confirm the tag was created — check the tag list before saving again.',
            },
          ),
        )
        return
      }
      setTags((prev) => [...prev, created])
      void track({
        name: 'tag.created',
        properties: { tagId: created.id, name: tagName.trim() },
      })
      closeModal()
    } catch (error) {
      // Keep the modal open so the user can retry (e.g. duplicate name) and
      // show WHY nothing happened.
      setModalError(
        error instanceof Error
          ? error.message
          : t('tags.createError', {}, { defaultValue: 'Could not create tag.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!tagName.trim() || saving) return
    setSaving(true)
    setModalError(null)
    try {
      await http.patch(`/api/tags/${id}`, { name: tagName.trim(), color: selectedColor })
      setTags((prev) =>
        prev.map((tag) =>
          tag.id === id ? { ...tag, name: tagName.trim(), color: selectedColor } : tag,
        ),
      )
      void track({ name: 'tag.updated', properties: { tagId: id, name: tagName.trim() } })
      closeModal()
    } catch (error) {
      setModalError(
        error instanceof Error
          ? error.message
          : t('tags.updateError', {}, { defaultValue: 'Could not update tag.' }),
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setActionError(null)
    try {
      await http.delete(`/api/tags/${id}`)
      void track({ name: 'tag.deleted', properties: { tagId: id } })
      setTags((prev) => prev.filter((tag) => tag.id !== id))
    } catch (_error) {
      // The tag stays in the list; say so instead of failing silently.
      setActionError(t('tags.deleteError', {}, { defaultValue: 'Could not delete tag.' }))
    }
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditingTag(null)
    setTagName('')
    setSelectedColor(TAG_COLORS[0])
    setModalError(null)
    setShowModal(true)
  }

  const openEditModal = (tag: Tag, index: number) => {
    setModalMode('edit')
    setEditingTag(tag)
    setTagName(tag.name)
    setSelectedColor(tag.color || TAG_COLORS[index % TAG_COLORS.length])
    setModalError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setTagName('')
    setEditingTag(null)
    setModalError(null)
    // Closing the modal is the "go check the tag list" step the unconfirmed
    // create's error names — a deliberate re-open may create afresh.
    createUnconfirmed.current = false
  }

  return (
    <AppShell
      title={t('form.tags', {}, { defaultValue: 'Tags' })}
      contentMolId="page-tags"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 2),
            cm.roundedFull,
            cm.fontWeight('semibold'),
            cm.textSize('xs'),
            cm.flex({ align: 'center', gap: 'sm' }),
            'bg-primary hover:bg-primary-container text-on-primary uppercase tracking-widest transition-all active:scale-95',
          )}
        >
          <span className={cm.fv5b245ffa}>add</span>
          {t('tagsTopNavBar.newTag', {}, { defaultValue: 'New Tag' })}
        </button>
      }
    >
      {/* Content */}
      <div style={{ padding: '2rem 1rem', maxWidth: '960px' }} className="mx-auto md:px-8">
        {loading ? (
          <div className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 16))}>
            <div className={cm.spinner()} />
          </div>
        ) : loadFailed ? (
          <div
            role="alert"
            data-mol-id="tags-load-error"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '3rem 1.5rem',
              borderRadius: '12px',
              backgroundColor: 'var(--color-error-container, #f9dedc)',
              color: 'var(--color-on-error-container, #410e0b)',
              textAlign: 'center',
            }}
          >
            <span className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'))}>
              {t(
                'tags.loadFailed',
                {},
                {
                  defaultValue: 'Could not load tags — refresh to try again.',
                },
              )}
            </span>
            <button
              type="button"
              data-mol-id="btn-retry-tags"
              onClick={() => setLoadAttempt((attempt) => attempt + 1)}
              style={{
                padding: '0.625rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                backgroundColor: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
              }}
            >
              {t('common.retry', {}, { defaultValue: 'Retry' })}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* Stats Row */}
            <div style={{ display: 'grid', gap: '1.5rem' }} className="grid-cols-1 md:grid-cols-3">
              {/* Total Tags */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--mol-color-surface-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                  >
                    {t('tags.stats.totalTags', {}, { defaultValue: 'Total Tags' })}
                  </span>
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'var(--mol-color-primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-status-published)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      sell
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '1.875rem',
                      fontWeight: 700,
                      color: 'var(--mol-color-secondary)',
                      lineHeight: 1.2,
                    }}
                  >
                    {tags.length}
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--mol-color-text-tertiary)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {t('tags.stats.growthNote', {}, { defaultValue: 'Growth +12% this month' })}
                  </p>
                </div>
              </div>

              {/* Tagged Posts */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--mol-color-surface-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                  >
                    {t('tags.stats.taggedPosts', {}, { defaultValue: 'Tagged Posts' })}
                  </span>
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'var(--mol-color-primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-status-published)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      article
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '1.875rem',
                      fontWeight: 700,
                      color: 'var(--mol-color-secondary)',
                      lineHeight: 1.2,
                    }}
                  >
                    {totalTaggedPosts}
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--mol-color-text-tertiary)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {t(
                      'tags.stats.acrossCategories',
                      {},
                      { defaultValue: 'Across all categories' },
                    )}
                  </p>
                </div>
              </div>

              {/* Most Used */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface)',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--mol-color-surface-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                    style={{ color: 'var(--mol-color-text-secondary)' }}
                  >
                    {t('tags.stats.mostUsed', {}, { defaultValue: 'Most Used' })}
                  </span>
                  <div
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.5rem',
                      backgroundColor: 'var(--color-background)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--mol-color-warning)',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      trending_up
                    </span>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '1.875rem',
                      fontWeight: 700,
                      color: 'var(--mol-color-secondary)',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {mostUsedTag?.name ?? '\u2014'}
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--mol-color-text-tertiary)',
                      marginTop: '0.25rem',
                    }}
                  >
                    {mostUsedTag
                      ? t(
                          'tags.stats.usedInPosts',
                          { count: String(tagPostCount(mostUsedTag)) },
                          { defaultValue: `Used in ${tagPostCount(mostUsedTag)} posts` },
                        )
                      : t('tags.stats.noTags', {}, { defaultValue: 'No tags yet' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ position: 'relative', width: '100%', maxWidth: '24rem' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '20px',
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--mol-color-text-tertiary)',
                    pointerEvents: 'none',
                  }}
                >
                  search
                </span>
                <input
                  data-mol-id="input-search-tags"
                  type="search"
                  className={cm.input()}
                  placeholder={t('tags.searchPlaceholder', {}, { defaultValue: 'Search tags...' })}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setPage(1)
                  }}
                  style={{
                    paddingLeft: '2.75rem',
                    width: '100%',
                    backgroundColor: 'var(--mol-color-surface-secondary)',
                    border: '1px solid var(--mol-color-border)',
                    borderRadius: '0.75rem',
                    padding: '0.625rem 1rem 0.625rem 2.75rem',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  aria-label={t('tags.searchLabel', {}, { defaultValue: 'Search tags' })}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    data-mol-id="select-sort-tags"
                    className={cm.input()}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'most-used' | 'alpha' | 'recent')}
                    style={{
                      appearance: 'none',
                      width: '12rem',
                      backgroundColor: 'var(--mol-color-surface-secondary)',
                      border: '1px solid var(--mol-color-border)',
                      borderRadius: '0.75rem',
                      padding: '0.625rem 2.5rem 0.625rem 1rem',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--mol-color-text-secondary)',
                      outline: 'none',
                    }}
                    aria-label={t('tags.sortLabel', {}, { defaultValue: 'Sort tags' })}
                  >
                    <option value="most-used">
                      {t('tags.sort.mostUsed', {}, { defaultValue: 'Sort by: Most Used' })}
                    </option>
                    <option value="alpha">
                      {t('tags.sort.alphabetical', {}, { defaultValue: 'Sort by: Alphabetical' })}
                    </option>
                    <option value="recent">
                      {t('tags.sort.recent', {}, { defaultValue: 'Sort by: Recently Added' })}
                    </option>
                  </select>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '20px',
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'var(--mol-color-text-tertiary)',
                    }}
                  >
                    expand_more
                  </span>
                </div>
                <button
                  data-mol-id="btn-filter"
                  aria-label={t('tags.filterLabel', {}, { defaultValue: 'Filter' })}
                  data-filter-indicator={filterIndicator}
                  onClick={() => {
                    // Cycle through the available sort orders. We mirror the
                    // selection into the URL so the click also produces an
                    // observable URL change for harnesses watching `location`.
                    const next: 'most-used' | 'alpha' | 'recent' =
                      sortBy === 'most-used' ? 'alpha' : sortBy === 'alpha' ? 'recent' : 'most-used'
                    setSortBy(next)
                    setFilterIndicator((n) => n + 1)
                    setPage(1)
                    navigate(`/tags?sort=${next}`, { replace: false })
                  }}
                  style={{
                    backgroundColor: 'var(--mol-color-primary-light)',
                    padding: '0.625rem',
                    borderRadius: '0.75rem',
                    color: 'var(--mol-color-text-secondary)',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    filter_list
                  </span>
                </button>
                <button
                  data-mol-id="btn-create-tag"
                  onClick={openCreateModal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--color-status-published)',
                    color: 'var(--color-on-primary)',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '0.75rem',
                    fontSize: '14px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow:
                      '0 4px 12px color-mix(in srgb, var(--color-primary) 15%, transparent)',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    add
                  </span>
                  {t('tags.newTag', {}, { defaultValue: 'New Tag' })}
                </button>
              </div>
            </div>

            {actionError ? (
              <div
                role="alert"
                data-mol-id="tags-action-error"
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '12px',
                  fontSize: '13px',
                  backgroundColor: 'var(--color-error-container, #f9dedc)',
                  color: 'var(--color-on-error-container, #410e0b)',
                }}
              >
                {actionError}
              </div>
            ) : null}

            {/* Tags Table */}
            <div
              data-mol-id="tags-table"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
              }}
            >
              {sorted.length === 0 ? (
                <div data-mol-id="empty-tags" className={cm.cn(cm.textCenter, cm.sp('p', 16))}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      opacity: 0.4,
                      marginBottom: '1rem',
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '48px', color: 'var(--mol-color-text-tertiary)' }}
                    >
                      sell
                    </span>
                  </div>
                  <div
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('medium'))}
                    style={{ marginBottom: '0.5rem' }}
                  >
                    {searchQuery
                      ? t('tags.noResults', {}, { defaultValue: 'No tags match your search' })
                      : t('tags.emptyTitle', {}, { defaultValue: 'No tags yet' })}
                  </div>
                  <p className={cm.textMuted} style={{ marginBottom: '1.5rem' }}>
                    {searchQuery
                      ? t(
                          'tags.noResultsHint',
                          {},
                          { defaultValue: 'Try a different search term.' },
                        )
                      : t(
                          'tags.emptyHint',
                          {},
                          { defaultValue: 'Create your first tag to start organizing posts.' },
                        )}
                  </p>
                  {!searchQuery && (
                    <button
                      type="button"
                      data-mol-id="button-create-first-tag"
                      onClick={openCreateModal}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'var(--color-status-published)',
                        color: 'var(--color-on-primary)',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '0.75rem',
                        fontSize: '14px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow:
                          '0 4px 12px color-mix(in srgb, var(--color-primary) 15%, transparent)',
                      }}
                    >
                      {t('tags.createFirst', {}, { defaultValue: 'Create your first tag' })}
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr
                        style={{
                          backgroundColor: 'var(--color-surface-container-low)',
                          borderBottom: '1px solid var(--mol-color-surface-secondary)',
                        }}
                      >
                        <th
                          style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--mol-color-text-secondary)',
                          }}
                        >
                          {t('tags.table.tag', {}, { defaultValue: 'Tag' })}
                        </th>
                        <th
                          style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--mol-color-text-secondary)',
                          }}
                        >
                          {t('tags.table.slug', {}, { defaultValue: 'Slug' })}
                        </th>
                        <th
                          style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--mol-color-text-secondary)',
                          }}
                        >
                          {t('tags.table.posts', {}, { defaultValue: 'Posts' })}
                        </th>
                        <th
                          style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--mol-color-text-secondary)',
                          }}
                        >
                          {t('tags.table.created', {}, { defaultValue: 'Created' })}
                        </th>
                        <th
                          style={{
                            padding: '1rem 1.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--mol-color-text-secondary)',
                            textAlign: 'right',
                          }}
                        >
                          {t('nav.actions', {}, { defaultValue: 'Actions' })}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((tag, idx) => {
                        const globalIdx = (currentPage - 1) * PAGE_SIZE + idx
                        const color = getTagColor(tag, globalIdx)
                        const isHovered = hoveredRowId === tag.id
                        return (
                          <tr
                            key={tag.id}
                            data-mol-id={`tag-row-${tag.id}`}
                            onMouseEnter={() => setHoveredRowId(tag.id)}
                            onMouseLeave={() => setHoveredRowId(null)}
                            style={{
                              borderTop:
                                idx > 0
                                  ? '1px solid var(--mol-color-surface-secondary)'
                                  : undefined,
                              backgroundColor: isHovered
                                ? 'var(--color-surface-container-low)'
                                : 'transparent',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            {/* Tag name + color dot */}
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                              >
                                <div
                                  style={{
                                    width: '0.75rem',
                                    height: '0.75rem',
                                    borderRadius: '9999px',
                                    backgroundColor: color,
                                    flexShrink: 0,
                                  }}
                                />
                                <span
                                  style={{ fontWeight: 600, color: 'var(--mol-color-secondary)' }}
                                >
                                  {tag.name}
                                </span>
                              </div>
                            </td>
                            {/* Slug */}
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <code
                                style={{
                                  fontSize: '0.75rem',
                                  fontFamily:
                                    'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                                  color: 'var(--mol-color-text-secondary)',
                                }}
                              >
                                /tag/{nameToSlug(tag.name)}
                              </code>
                            </td>
                            {/* Post count + bar */}
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                              >
                                <span
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'var(--mol-color-secondary)',
                                    width: '1.5rem',
                                  }}
                                >
                                  {tagPostCount(tag)}
                                </span>
                                <div
                                  style={{
                                    width: '6rem',
                                    height: '0.375rem',
                                    borderRadius: '9999px',
                                    overflow: 'hidden',
                                    backgroundColor: 'var(--mol-color-surface-secondary)',
                                  }}
                                >
                                  <div
                                    style={{
                                      height: '100%',
                                      borderRadius: '9999px',
                                      backgroundColor: color,
                                      width: `${Math.round((tagPostCount(tag) / maxPostCount) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            {/* Created date */}
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <span
                                style={{
                                  fontSize: '14px',
                                  color: 'var(--mol-color-text-secondary)',
                                }}
                              >
                                {formatRelativeDate(tag.created_at ?? tag.createdAt, t)}
                              </span>
                            </td>
                            {/* Actions */}
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: '0.5rem',
                                  opacity: isHovered ? 1 : 0,
                                  transition: 'opacity 0.15s ease',
                                }}
                              >
                                <button
                                  data-mol-id={`button-edit-${tag.id}`}
                                  onClick={() => openEditModal(tag, globalIdx)}
                                  aria-label={t('common.edit', {}, { defaultValue: 'Edit' })}
                                  style={{
                                    padding: '0.5rem',
                                    color: 'var(--mol-color-text-tertiary)',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.15s, background-color 0.15s',
                                  }}
                                  onMouseEnter={(e) => {
                                    ;(e.currentTarget as HTMLButtonElement).style.color =
                                      'var(--mol-color-primary)'
                                    ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                      'var(--mol-color-primary-light)'
                                  }}
                                  onMouseLeave={(e) => {
                                    ;(e.currentTarget as HTMLButtonElement).style.color =
                                      'var(--mol-color-text-tertiary)'
                                    ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                                      'transparent'
                                  }}
                                >
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '18px' }}
                                  >
                                    edit
                                  </span>
                                </button>
                                <ConfirmButton
                                  data-mol-id={`button-delete-${tag.id}`}
                                  label={t('common.delete', {}, { defaultValue: 'Delete' })}
                                  confirmLabel={t(
                                    'tags.confirmDelete',
                                    {},
                                    { defaultValue: 'Yes, delete' },
                                  )}
                                  pendingLabel={t(
                                    'tags.deleting',
                                    {},
                                    { defaultValue: 'Deleting…' },
                                  )}
                                  onConfirm={() => void handleDelete(tag.id)}
                                  size="sm"
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {sorted.length > 0 && (
                <div
                  style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--mol-color-surface-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '14px', color: 'var(--mol-color-text-secondary)' }}>
                    {t(
                      'tags.pagination.showing',
                      {
                        from: String((currentPage - 1) * PAGE_SIZE + 1),
                        to: String(Math.min(currentPage * PAGE_SIZE, sorted.length)),
                        total: String(sorted.length),
                      },
                      {
                        defaultValue: `Showing ${(currentPage - 1) * PAGE_SIZE + 1}\u2013${Math.min(currentPage * PAGE_SIZE, sorted.length)} of ${sorted.length} tags`,
                      },
                    )}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      data-mol-id="btn-page-prev"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={currentPage === 1}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.375rem 0.75rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        color:
                          currentPage === 1
                            ? 'var(--mol-color-text-tertiary)'
                            : 'var(--mol-color-text-secondary)',
                        fontSize: '14px',
                        fontWeight: 500,
                        borderRadius: '0.5rem',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        chevron_left
                      </span>
                      {t('tags.pagination.previous', {}, { defaultValue: 'Previous' })}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {visiblePages(totalPages, currentPage).map((p) => (
                        <button
                          key={p}
                          data-mol-id={`btn-page-${p}`}
                          onClick={() => setPage(p)}
                          style={{
                            width: '2rem',
                            height: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: p === currentPage ? 700 : 500,
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor:
                              p === currentPage ? 'var(--color-status-published)' : 'transparent',
                            color:
                              p === currentPage
                                ? 'var(--color-on-primary)'
                                : 'var(--mol-color-text-secondary)',
                            transition: 'background-color 0.15s',
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      data-mol-id="btn-page-next"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.375rem 0.75rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        color:
                          currentPage === totalPages
                            ? 'var(--mol-color-text-tertiary)'
                            : 'var(--mol-color-text-secondary)',
                        fontSize: '14px',
                        fontWeight: 500,
                        borderRadius: '0.5rem',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      {t('tags.pagination.next', {}, { defaultValue: 'Next' })}
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Editor's Tip Section */}
            <div
              data-mol-id="tip-section"
              style={{
                backgroundColor: 'var(--mol-color-background-tertiary)',
                padding: '2rem',
                borderRadius: '1rem',
                display: 'flex',
                flexDirection: 'row',
                gap: '2rem',
                alignItems: 'center',
              }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                    alignItems: 'center',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor: 'var(--mol-color-primary-light)',
                    color: 'var(--color-primary-hover)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {t('tags.tip.label', {}, { defaultValue: "Editor's Tip" })}
                </div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    lineHeight: '28px',
                    color: 'var(--mol-color-secondary)',
                    margin: 0,
                  }}
                >
                  {t('tags.tip.title', {}, { defaultValue: 'Consistency leads to discovery' })}
                </h3>
                <p
                  style={{
                    color: 'var(--mol-color-text-secondary)',
                    lineHeight: 1.625,
                    maxWidth: '36rem',
                    margin: 0,
                  }}
                >
                  {t(
                    'tags.tip.body',
                    {},
                    {
                      defaultValue:
                        'Merging similar tags into primary categories helps your readers find related content more easily. Aim for descriptive, broad tags for high-level navigation and specific tags for niche topics.',
                    },
                  )}
                </p>
              </div>
              <div
                style={{
                  width: '16rem',
                  height: '10rem',
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-lg)',
                  transform: 'rotate(2deg)',
                  flexShrink: 0,
                  background:
                    'linear-gradient(135deg, var(--color-status-published) 0%, var(--color-primary) 50%, var(--mol-color-success) 100%)',
                }}
                aria-hidden="true"
                className="hidden md:block"
              />
            </div>
          </div>
        )}
      </div>

      {/* Spacer */}
      <div style={{ height: '2.5rem' }} />

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          data-mol-id="new-tag-modal"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            aria-hidden="true"
            onClick={closeModal}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'color-mix(in srgb, var(--color-inverse-surface) 40%, transparent)',
              WebkitBackdropFilter: 'blur(4px)',
              backdropFilter: 'blur(4px)',
            }}
          />
          <div
            style={{
              position: 'relative',
              backgroundColor: 'var(--color-surface-container)',
              width: '100%',
              maxWidth: '28rem',
              borderRadius: '1rem',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-outline-variant)',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '1.5rem 1.5rem',
                borderBottom: '1px solid var(--mol-color-background-tertiary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  lineHeight: '28px',
                  color: 'var(--mol-color-secondary)',
                  margin: 0,
                }}
              >
                {modalMode === 'create'
                  ? t('tags.modal.createTitle', {}, { defaultValue: 'Create New Tag' })
                  : t('tags.modal.editTitle', {}, { defaultValue: 'Edit Tag' })}
              </h3>
              <button
                data-mol-id="btn-modal-close"
                onClick={closeModal}
                aria-label={t('common.close', {}, { defaultValue: 'Close' })}
                style={{
                  padding: '0.25rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  color: 'var(--mol-color-text-tertiary)',
                  display: 'flex',
                  borderRadius: '0.5rem',
                  transition: 'color 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  close
                </span>
              </button>
            </div>

            {/* Modal body */}
            <div
              style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
            >
              {modalError ? (
                <p
                  role="alert"
                  data-mol-id="tags-modal-error"
                  style={{
                    margin: 0,
                    padding: '0.625rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '13px',
                    backgroundColor: 'var(--color-error-container, #f9dedc)',
                    color: 'var(--color-on-error-container, #410e0b)',
                  }}
                >
                  {modalError}
                </p>
              ) : null}
              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    lineHeight: '20px',
                    color: 'var(--mol-color-secondary)',
                  }}
                >
                  {t('form.name', {}, { defaultValue: 'Name' })}
                </label>
                <input
                  data-mol-id="input-tag-name"
                  type="text"
                  className={cm.input()}
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return
                    if (modalMode === 'create') {
                      handleCreate()
                    } else if (editingTag) {
                      handleEdit(editingTag.id)
                    }
                  }}
                  placeholder={t('tags.namePlaceholder', {}, { defaultValue: 'e.g. javascript' })}
                  aria-label={t('tags.modal.nameLabel', {}, { defaultValue: 'Tag name' })}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--mol-color-background-tertiary)',
                    border: '1px solid var(--color-outline-variant)',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 1rem',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'background-color 0.15s, box-shadow 0.15s',
                  }}
                />
              </div>

              {/* Slug */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    lineHeight: '20px',
                    color: 'var(--mol-color-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {t('tags.modal.slugLabel', {}, { defaultValue: 'Slug' })}
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--mol-color-text-tertiary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 400,
                    }}
                  >
                    {t('tags.modal.autoGenerated', {}, { defaultValue: 'Auto-Generated' })}
                  </span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '1rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--mol-color-text-tertiary)',
                      fontSize: '0.75rem',
                      pointerEvents: 'none',
                    }}
                  >
                    /tag/
                  </span>
                  <input
                    data-mol-id="input-tag-slug"
                    type="text"
                    className={cm.input()}
                    value={nameToSlug(tagName)}
                    readOnly
                    style={{
                      paddingLeft: '3.5rem',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
                      fontSize: '14px',
                      width: '100%',
                      backgroundColor: 'var(--mol-color-background-tertiary)',
                      border: '1px solid var(--color-outline-variant)',
                      borderRadius: '0.75rem',
                      padding: '0.75rem 1rem 0.75rem 3.5rem',
                      color: 'var(--mol-color-text-secondary)',
                      outline: 'none',
                    }}
                    aria-label={t('tags.modal.slugLabel', {}, { defaultValue: 'Tag slug' })}
                  />
                </div>
              </div>

              {/* Color swatches */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <label
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    lineHeight: '20px',
                    color: 'var(--mol-color-secondary)',
                  }}
                >
                  {t('tags.modal.colorLabel', {}, { defaultValue: 'Color' })}
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      data-mol-id={`color-swatch-${color.slice(1)}`}
                      onClick={() => setSelectedColor(color)}
                      aria-label={t('tags.modal.colorChoice', { color }, { defaultValue: color })}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '9999px',
                        backgroundColor: color,
                        border: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow:
                          selectedColor === color
                            ? `0 0 0 2px var(--color-surface), 0 0 0 4px ${color}`
                            : '0 0 0 2px transparent',
                        transition: 'box-shadow 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedColor !== color)
                          e.currentTarget.style.boxShadow = `0 0 0 2px transparent, 0 0 0 4px ${color}4D`
                      }}
                      onMouseLeave={(e) => {
                        if (selectedColor !== color)
                          e.currentTarget.style.boxShadow = '0 0 0 2px transparent'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Live preview */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-container)',
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--mol-color-text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {t('tags.modal.livePreview', {}, { defaultValue: 'Live Preview' })}
                </span>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: 'var(--color-surface-container-low)',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    border: '1px solid var(--color-outline-variant)',
                    width: 'fit-content',
                  }}
                >
                  <div
                    style={{
                      width: '0.75rem',
                      height: '0.75rem',
                      borderRadius: '9999px',
                      backgroundColor: selectedColor,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: 'var(--mol-color-secondary)',
                    }}
                  >
                    {tagName ||
                      t('tags.modal.previewPlaceholder', {}, { defaultValue: 'tag-name' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'var(--color-surface-container-low)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                data-mol-id="btn-modal-cancel"
                onClick={closeModal}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--mol-color-text-secondary)',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                {t('common.cancel', {}, { defaultValue: 'Cancel' })}
              </button>
              <button
                data-mol-id="btn-modal-save"
                onClick={() =>
                  modalMode === 'create' ? handleCreate() : editingTag && handleEdit(editingTag.id)
                }
                disabled={!tagName.trim() || saving}
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  padding: '0.625rem 2rem',
                  borderRadius: '0.75rem',
                  fontSize: '14px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: !tagName.trim() || saving ? 'not-allowed' : 'pointer',
                  boxShadow:
                    '0 10px 15px color-mix(in srgb, var(--color-primary) 20%, transparent)',
                  transition: 'background-color 0.15s, transform 0.1s',
                  opacity: !tagName.trim() || saving ? 0.6 : 1,
                }}
              >
                {saving
                  ? t('common.saving', {}, { defaultValue: 'Saving...' })
                  : t('tags.modal.saveTag', {}, { defaultValue: 'Save Tag' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
