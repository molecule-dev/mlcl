import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

type GuideCategory = 'getting-started' | 'authentication' | 'core' | 'advanced' | 'recipes'

interface Guide {
  id: string
  title: string
  description: string
  category: GuideCategory
  read_time?: number | null
  updated?: string | null
}

const CATEGORY_TINT: Record<GuideCategory, string> = {
  'getting-started': 'bg-emerald-500/15 text-emerald-300',
  authentication: 'bg-blue-500/15 text-blue-300',
  core: 'bg-violet-500/15 text-violet-300',
  advanced: 'bg-amber-500/15 text-amber-300',
  recipes: 'bg-rose-500/15 text-rose-300',
}

function categoryTint(c: string | null | undefined): string {
  return c && c in CATEGORY_TINT
    ? CATEGORY_TINT[c as GuideCategory]
    : 'bg-surface-container text-on-surface-variant'
}

function fmtUpdated(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Guides() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    http
      .get('/api/guides')
      .then((res) => {
        if (!cancelled) setGuides(unwrapList<Guide>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('guides.loadError', {}, { defaultValue: 'Failed to load guides.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('6xl'), cm.mxAuto, cm.stack(8))}>
      <header>
        <p
          className={cm.cn(
            'text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono mb-2',
          )}
        >
          {t('guides.eyebrow', {}, { defaultValue: 'GUIDES' })}
        </p>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {t('guides.heading', {}, { defaultValue: 'Long-form how-tos' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
          {loading
            ? t('guides.loading', {}, { defaultValue: 'Loading guides…' })
            : t(
                'guides.subheading',
                { count: guides.length },
                { defaultValue: '{{count}} guides · search by category' },
              )}
        </p>
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : guides.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-on-surface-variant')}>
          {t('guides.empty', {}, { defaultValue: 'No guides published yet — check back soon.' })}
        </p>
      ) : (
        <section className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}>
          {guides.map((g) => (
            <Link
              key={g.id}
              to={`/docs/guides/${g.id}`}
              className={cm.cn(
                cm.sp('p', 6),
                'block bg-surface-container-lowest rounded-2xl hover:shadow-2xl hover:shadow-emerald-500/5 transition-all group',
              )}
            >
              <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                <span
                  className={cm.cn(
                    'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest font-mono',
                    categoryTint(g.category),
                  )}
                >
                  {(g.category ?? 'core').replace('-', ' ')}
                </span>
                {g.read_time != null ? (
                  <span
                    className={cm.cn(
                      cm.textSize('xs'),
                      'text-on-surface-variant tabular-nums font-mono',
                    )}
                  >
                    {t(
                      'guides.readTime',
                      { mins: g.read_time },
                      { defaultValue: '{{mins}} min read' },
                    )}
                  </span>
                ) : null}
              </div>
              <h3
                className={cm.cn(
                  cm.textSize('lg'),
                  cm.sp('mt', 4),
                  cm.sp('mb', 2),
                  'font-bold group-hover:text-emerald-400 transition-colors',
                )}
              >
                {g.title}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  'text-on-surface-variant leading-relaxed line-clamp-2',
                )}
              >
                {g.description}
              </p>
              {g.updated ? (
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.sp('mt', 4),
                    'text-on-surface-variant font-mono tabular-nums',
                  )}
                >
                  {t(
                    'guides.updated',
                    { date: fmtUpdated(g.updated) },
                    { defaultValue: 'Updated {{date}}' },
                  )}
                </p>
              ) : null}
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
