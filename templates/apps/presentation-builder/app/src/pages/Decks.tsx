import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { track } from '@molecule/app-analytics'
import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { ActivityFeedItem } from '../components/ActivityFeedItem.js'
import { DeckCard } from '../components/DeckCard.js'
import { DeckHeroCard } from '../components/DeckHeroCard.js'
import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'

interface Presentation {
  id: string
  title: string
  description: string | null
  theme_id: string | null
  is_public: boolean
  public_slug: string | null
  slide_count: number
  created_at: string
  updated_at: string
}

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - then)
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  if (diffMs < min) return 'Just now'
  if (diffMs < hr) return `Edited ${Math.floor(diffMs / min)} min ago`
  if (diffMs < day) return `Edited ${Math.floor(diffMs / hr)} hr ago`
  if (diffMs < 2 * day) return 'Edited yesterday'
  if (diffMs < 7 * day) return `Edited ${Math.floor(diffMs / day)} days ago`
  return `Edited ${new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
}

const ACCENT_PALETTE = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#a78bfa', '#dc2626']
const accentForId = (id: string): string => {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENT_PALETTE[h % ACCENT_PALETTE.length]!
}

interface DeckLabels {
  untitled: string
  publicFolder: string
  privateFolder: string
}

const presentationToDeckProp = (
  p: Presentation,
  labels: DeckLabels,
): Parameters<typeof DeckCard>[0]['deck'] => ({
  id: p.id,
  title: p.title || labels.untitled,
  folder: p.is_public ? labels.publicFolder : labels.privateFolder,
  updatedLabel: formatRelative(p.updated_at),
  slideCount: p.slide_count,
  visibility: p.is_public ? 'public' : 'private',
  themeColor: accentForId(p.id),
  status: p.slide_count === 0 ? 'editing' : 'ready',
  collaborators: [],
})

export function Decks() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()

  const [decks, setDecks] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await http.get<Presentation[]>('/presentations')
      setDecks(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load decks')
    } finally {
      setLoading(false)
    }
  }, [http])

  const createDeck = useCallback(
    async (titleInput?: string, templateId?: string) => {
      setCreating(true)
      try {
        const title = titleInput ?? t('decks.untitled', {}, { defaultValue: 'Untitled Deck' })!
        const res = await http.post<Presentation>('/presentations', { title })
        track({
          name: 'deck.created',
          properties: { deckId: res.data.id, ...(templateId ? { templateId } : {}) },
        })
        navigate(`/decks/${res.data.id}/edit`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create deck')
      } finally {
        setCreating(false)
      }
    },
    [http, navigate, t],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  // Honor the layout's "New deck" button (sets ?new=1) and any template
  // landing redirects (?template=foo) by creating a real deck and routing
  // straight to the editor.
  useEffect(() => {
    const wantsNew = params.get('new') === '1'
    const tplId = params.get('template')
    if (!wantsNew && !tplId) return
    const titleByTemplate: Record<string, string> = {
      'pitch-aurora': 'Aurora Pitch',
      'investor-pulse': 'Investor Pulse',
      'webinar-keynote': 'Webinar Keynote',
      'sales-kickoff': 'Sales Kickoff',
      'design-review': 'Design Review',
      'all-hands': 'Company All-Hands',
      'product-launch': 'Product Launch',
      workshop: 'Hands-On Workshop',
    }
    const title = tplId
      ? (titleByTemplate[tplId] ?? tplId)
      : t('decks.untitled', {}, { defaultValue: 'Untitled Deck' })!
    setParams({}, { replace: true })
    void createDeck(title, tplId ?? undefined)
  }, [params, setParams, createDeck, t])

  const deckLabels: DeckLabels = {
    untitled: t('decks.untitled', {}, { defaultValue: 'Untitled deck' })!,
    publicFolder: t('deckCard.visibility.public', {}, { defaultValue: 'Public' })!,
    privateFolder: t('deckCard.visibility.private', {}, { defaultValue: 'Private' })!,
  }

  const featured = useMemo<Parameters<typeof DeckHeroCard>[0]['deck'] | null>(() => {
    const top = decks[0]
    if (!top) return null
    return {
      id: top.id,
      title: top.title || t('decks.untitled', {}, { defaultValue: 'Untitled deck' })!,
      slideCount: top.slide_count,
      activeCollaborators: 0,
      updatedLabel: formatRelative(top.updated_at),
      deckCode: top.public_slug ? top.public_slug.toUpperCase() : 'DRAFT',
      activeTheme: 'Aurora Stage',
    }
  }, [decks, t])

  const ACTIVITY: Array<Parameters<typeof ActivityFeedItem>[0]['item']> = useMemo(
    () =>
      decks.slice(0, 3).map((d, i) => ({
        id: `act-${d.id}`,
        kind: i === 0 ? 'comment' : i === 1 ? 'present' : 'invite',
        actorName: t('nav.you', {}, { defaultValue: 'You' })!,
        actorColor: accentForId(d.id),
        sentence: t('decks.activity.edited', {}, { defaultValue: 'edited' })!,
        target: d.title || t('decks.untitled', {}, { defaultValue: 'Untitled deck' })!,
        targetHref: `/decks/${d.id}/edit`,
        timeLabel: formatRelative(d.updated_at),
      })),
    [decks, t],
  )

  return (
    <PresentationBuilderLayout
      eyebrow={t('decks.eyebrow', {}, { defaultValue: 'Studio' })!}
      title={t('decks.title', {}, { defaultValue: 'Your decks' })!}
      actions={
        <button
          type="button"
          data-testid="new-deck-action"
          onClick={() => createDeck()}
          disabled={creating}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 4),
            cm.sp('py', 2),
            cm.fontWeight('bold'),
            cm.textSize('sm'),
            'bg-gradient-to-br from-primary to-secondary text-white rounded-xl shadow-md shadow-primary/30 hover:scale-[1.01] transition-transform disabled:opacity-50',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
          {t('decks.newDeck', {}, { defaultValue: 'New deck' })}
        </button>
      }
    >
      <div className={cm.cn(cm.grid({ cols: 12, gap: 'lg' }))}>
        {error && (
          <div
            role="alert"
            data-testid="decks-error"
            className={cm.cn('col-span-12', cm.sp('p', 4), 'rounded-xl bg-error/10 text-error')}
          >
            {error}
          </div>
        )}

        {loading && decks.length === 0 ? (
          <div
            data-testid="decks-loading"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.sp('p', 12),
              'col-span-12 text-on-surface-variant',
            )}
          >
            {t('decks.loading', {}, { defaultValue: 'Loading decks…' })}
          </div>
        ) : decks.length === 0 ? (
          <div
            data-testid="decks-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.sp('p', 12),
              cm.stack(3),
              'col-span-12 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-center',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-[40px] text-primary')}>
              co_present
            </span>
            <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('decks.empty.title', {}, { defaultValue: 'Your studio is empty' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
              {t(
                'decks.empty.body',
                {},
                {
                  defaultValue:
                    'Create your first deck — every theme, animation, and presenter tool is one click away.',
                },
              )}
            </p>
            <button
              type="button"
              data-testid="new-deck-empty-action"
              onClick={() => createDeck()}
              disabled={creating}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('sm'),
                'bg-primary text-on-primary rounded-xl shadow-md shadow-primary/30 disabled:opacity-50',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[18px]')}>add</span>
              {t('decks.newDeck', {}, { defaultValue: 'New deck' })}
            </button>
          </div>
        ) : (
          <>
            {featured && <DeckHeroCard deck={featured} />}

            <aside
              className={cm.cn(
                cm.flex({ direction: 'col' }),
                cm.sp('p', 6),
                cm.stack(4),
                'lg:col-span-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <div className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-primary',
                    )}
                  >
                    {t('decks.activity.eyebrow', {}, { defaultValue: 'Stage activity' })}
                  </span>
                  <h2
                    className={cm.cn(
                      cm.textSize('lg'),
                      cm.fontWeight('bold'),
                      'text-on-surface tracking-tight',
                    )}
                  >
                    {t('decks.activity.title', {}, { defaultValue: 'Recent edits' })}
                  </h2>
                </div>
                <Link
                  to="/notifications"
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                    'text-primary hover:underline',
                  )}
                >
                  {t('common.viewAll', {}, { defaultValue: 'View all' })}
                </Link>
              </div>
              <div className={cm.cn(cm.stack(3))}>
                {ACTIVITY.map((item) => (
                  <ActivityFeedItem key={item.id} item={item} />
                ))}
                {ACTIVITY.length === 0 && (
                  <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'decks.activity.empty',
                      {},
                      { defaultValue: 'No activity yet — create a deck to start.' },
                    )}
                  </span>
                )}
              </div>
            </aside>

            <section className={cm.cn(cm.stack(4), 'col-span-12')}>
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                <div className={cm.stack(1)}>
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t('decks.grid.eyebrow', {}, { defaultValue: 'All decks' })}
                  </span>
                  <h2
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      'text-on-surface tracking-tight',
                    )}
                  >
                    {t(
                      'decks.grid.title',
                      { count: decks.length },
                      { defaultValue: 'Your studio library' },
                    )}
                  </h2>
                </div>
              </div>
              <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
                {decks.map((p) => (
                  <div key={p.id} className={cm.cn('col-span-12 sm:col-span-6 lg:col-span-4')}>
                    <DeckCard deck={presentationToDeckProp(p, deckLabels)} />
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </PresentationBuilderLayout>
  )
}

export default Decks
