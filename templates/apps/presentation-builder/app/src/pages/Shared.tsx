import { useCallback, useEffect, useMemo, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { DeckCard } from '../components/DeckCard.js'
import { PresentationBuilderLayout } from '../components/PresentationBuilderLayout.js'

interface Presentation {
  id: string
  title: string
  description: string | null
  is_public: boolean
  slide_count: number
  updated_at: string
}

const ACCENTS = ['#7c3aed', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#a78bfa']
const accentForId = (id: string): string => {
  let h = 0
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ACCENTS[h % ACCENTS.length]!
}

const formatRelative = (iso: string): string => {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const min = 60 * 1000
  const hr = 60 * min
  const day = 24 * hr
  if (diff < min) return 'Just now'
  if (diff < hr) return `Edited ${Math.floor(diff / min)} min ago`
  if (diff < day) return `Edited ${Math.floor(diff / hr)} hr ago`
  if (diff < 7 * day) return `Edited ${Math.floor(diff / day)} days ago`
  return `Edited ${new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
}

const TABS = ['shared-by-me', 'public'] as const
type Tab = (typeof TABS)[number]

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
  visibility: p.is_public ? 'public' : 'shared',
  themeColor: accentForId(p.id),
  status: p.slide_count === 0 ? 'editing' : 'ready',
  collaborators: [],
})

export function Shared() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [decks, setDecks] = useState<Presentation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('shared-by-me')

  const reload = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get<Presentation[]>('/presentations')
      .then((res) => {
        if (cancelled) return
        setDecks(res.data)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setDecks([])
        setError(err instanceof Error ? err.message : 'Failed to load shared decks')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(reload, [reload])

  const deckLabels: DeckLabels = {
    untitled: t('decks.untitled', {}, { defaultValue: 'Untitled deck' })!,
    publicFolder: t('deckCard.visibility.public', {}, { defaultValue: 'Public' })!,
    privateFolder: t('deckCard.visibility.private', {}, { defaultValue: 'Private' })!,
  }

  const visible = useMemo(() => {
    if (tab === 'public') return decks.filter((d) => d.is_public)
    // "Shared by me" — anything the user has authored that's been published
    // publicly OR has a non-empty share state. We approximate with public
    // decks; full share-management is gated by a separate per-user feature.
    return decks.filter((d) => d.is_public)
  }, [decks, tab])

  return (
    <PresentationBuilderLayout
      eyebrow={t('shared.eyebrow', {}, { defaultValue: 'Stage' })!}
      title={t('shared.title', {}, { defaultValue: 'Shared decks' })!}
    >
      <div className={cm.cn(cm.stack(6))}>
        {error && (
          <div
            role="alert"
            data-testid="shared-error"
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
              cm.sp('p', 4),
              'rounded-xl bg-error/10 text-error',
            )}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void reload()}
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.fontWeight('bold'),
                cm.textSize('xs'),
                'rounded-lg bg-error/15 hover:bg-error/25 uppercase tracking-widest shrink-0',
              )}
            >
              {t('common.retry', {}, { defaultValue: 'Retry' })}
            </button>
          </div>
        )}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {TABS.map((tk) => (
            <button
              key={tk}
              type="button"
              data-testid={`shared-tab-${tk}`}
              onClick={() => setTab(tk)}
              aria-pressed={tab === tk}
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.roundedFull,
                cm.fontWeight('bold'),
                'text-[10px] uppercase tracking-widest transition-colors',
                tab === tk
                  ? 'bg-primary text-on-primary shadow-md shadow-primary/30'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
              )}
            >
              {t(
                `shared.tab.${tk}`,
                {},
                { defaultValue: tk === 'public' ? 'Public' : 'Shared by me' },
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            data-testid="shared-loading"
            className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant text-center')}
          >
            {t('shared.loading', {}, { defaultValue: 'Loading…' })}
          </div>
        ) : visible.length === 0 ? (
          <div
            data-testid="shared-empty"
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center' }),
              cm.sp('p', 12),
              cm.stack(2),
              'bg-surface-container-low rounded-2xl text-center',
            )}
          >
            <span
              className={cm.cn('material-symbols-outlined text-[32px] text-on-surface-variant')}
            >
              group
            </span>
            <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface')}>
              {t('shared.empty.title', {}, { defaultValue: 'No shared decks yet' })}
            </span>
            <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant max-w-md')}>
              {t(
                'shared.empty.body',
                {},
                {
                  defaultValue:
                    'Decks you share publicly will appear here. Open a deck and toggle public to share.',
                },
              )}
            </span>
          </div>
        ) : (
          <div className={cm.cn(cm.grid({ cols: 12, gap: 'md' }))}>
            {visible.map((p) => (
              <div key={p.id} className={cm.cn('col-span-12 sm:col-span-6 lg:col-span-4')}>
                <DeckCard deck={presentationToDeckProp(p, deckLabels)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PresentationBuilderLayout>
  )
}

export default Shared
