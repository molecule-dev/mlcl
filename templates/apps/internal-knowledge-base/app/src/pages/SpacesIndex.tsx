import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CairnSpaceCard } from '../components/CairnSpaceCard.js'
import { unwrapList } from '../lib/unwrap.js'

interface ApiSpace {
  id: string
  key: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  updated_at: string
}

interface ApiArticle {
  id: string
  space_id: string
  status: string
}

const ICON_FALLBACK = 'folder_special'
const COLOR_FALLBACK = '#0f766e'

export function SpacesIndex() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [spaces, setSpaces] = useState<ApiSpace[]>([])
  const [articleCounts, setArticleCounts] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([http.get('/spaces'), http.get('/articles')])
      .then(([sRes, aRes]) => {
        if (cancelled) return
        const list = unwrapList<ApiSpace>(sRes)
        setSpaces(list)
        const articles = unwrapList<ApiArticle>(aRes)
        const counts = new Map<string, number>()
        for (const a of articles) {
          counts.set(a.space_id, (counts.get(a.space_id) ?? 0) + 1)
        }
        setArticleCounts(counts)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')}>
      <header className={cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' })}>
        <div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('extrabold'),
              'uppercase tracking-widest text-secondary',
            )}
          >
            {t('spacesIndex.eyebrow', {}, { defaultValue: 'Knowledge spaces' })}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mt', 1),
              cm.textSize('3xl'),
              cm.fontWeight('extrabold'),
              'tracking-tight',
            )}
          >
            {t('spacesIndex.heading', {}, { defaultValue: 'Spaces' })}
          </h1>
          <p className={cm.cn(cm.sp('mt', 1), cm.textSize('sm'), 'text-on-surface-variant')}>
            {t(
              'spacesIndex.subtitle',
              {},
              {
                defaultValue:
                  'Each team gets a curated space — pick one to browse its articles, or open a new one.',
              },
            )}
          </p>
        </div>
        <Link
          to="/spaces/new"
          className={cm.cn(
            cm.sp('px', 5),
            cm.sp('py', 3),
            cm.fontWeight('extrabold'),
            cm.textSize('sm'),
            'rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md transition-transform hover:-translate-y-0.5',
          )}
        >
          {t('spacesIndex.newCta', {}, { defaultValue: 'New space' })}
        </Link>
      </header>

      {loading && spaces.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), 'text-center text-on-surface-variant')}>
          {t('spacesIndex.loading', {}, { defaultValue: 'Loading spaces\u2026' })}
        </p>
      ) : spaces.length === 0 ? (
        <div
          className={cm.cn(
            cm.sp('py', 16),
            cm.sp('px', 6),
            'rounded-2xl bg-surface-container-lowest text-center ring-1 ring-outline-variant',
          )}
        >
          <p className={cm.cn(cm.textSize('lg'), cm.fontWeight('extrabold'))}>
            {t('spacesIndex.emptyHeading', {}, { defaultValue: 'No spaces yet' })}
          </p>
          <p
            className={cm.cn(
              cm.sp('mt', 2),
              cm.textSize('sm'),
              'text-on-surface-variant max-w-md mx-auto',
            )}
          >
            {t(
              'spacesIndex.emptyBody',
              {},
              {
                defaultValue:
                  'A space groups articles for a team or topic. Create one to start writing.',
              },
            )}
          </p>
          <Link
            to="/spaces/new"
            className={cm.cn(
              cm.sp('mt', 6),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('extrabold'),
              cm.textSize('sm'),
              'inline-block rounded-full bg-gradient-to-br from-primary to-secondary text-white shadow-md',
            )}
          >
            {t('spacesIndex.emptyCta', {}, { defaultValue: 'Create your first space' })}
          </Link>
        </div>
      ) : (
        <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'sm:grid-cols-2 lg:grid-cols-3')}>
          {spaces.map((s) => (
            <CairnSpaceCard
              key={s.id}
              spaceKey={s.key}
              name={s.name}
              description={s.description ?? ''}
              icon={s.icon ?? ICON_FALLBACK}
              articleCount={articleCounts.get(s.id) ?? 0}
              accentColor={s.color ?? COLOR_FALLBACK}
              updatedAt={s.updated_at}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default SpacesIndex
