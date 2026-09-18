import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

type GuideCategory = 'getting-started' | 'authentication' | 'core' | 'advanced' | 'recipes'

interface Guide {
  id: string
  title: string
  description: string
  category?: GuideCategory | null
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

/**
 * Single guide view — fetched from GET /api/guides/:id (the same static
 * catalog the Guides list serves). Renders the catalog metadata (category,
 * read time, updated date) plus the guide's summary as the lead paragraph.
 */
export function GuideDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams<{ id: string }>()
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/guides/${id}`)
      .then((res) => {
        if (!cancelled) setGuide(unwrapSingle<Guide>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('guideDetail.loadError', {}, { defaultValue: 'Failed to load guide.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id, t])

  if (loading) {
    return (
      <div className={cm.cn(cm.sp('p', 8), 'text-on-surface-variant')}>
        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
      </div>
    )
  }

  if (error || !guide) {
    return (
      <div className={cm.cn(cm.sp('p', 8), cm.stack(4))}>
        <p className={cm.cn('text-error')}>
          {error ?? t('guideDetail.notFound', {}, { defaultValue: 'Guide not found.' })}
        </p>
        <Link
          to="/docs/guides"
          className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
        >
          ← {t('guideDetail.back', {}, { defaultValue: 'All guides' })}
        </Link>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), cm.maxW('4xl'), cm.mxAuto, cm.stack(8))}>
      <Link
        to="/docs/guides"
        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
      >
        ← {t('guideDetail.back', {}, { defaultValue: 'All guides' })}
      </Link>

      <header>
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }), cm.sp('mb', 3))}
        >
          <span
            className={cm.cn(
              'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest font-mono',
              categoryTint(guide.category),
            )}
          >
            {(guide.category ?? 'core').replace('-', ' ')}
          </span>
          {guide.read_time != null ? (
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums font-mono')}
            >
              {t(
                'guides.readTime',
                { mins: guide.read_time },
                { defaultValue: '{{mins}} min read' },
              )}
            </span>
          ) : null}
          {guide.updated ? (
            <span
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant tabular-nums font-mono')}
            >
              {t(
                'guides.updated',
                { date: fmtUpdated(guide.updated) },
                { defaultValue: 'Updated {{date}}' },
              )}
            </span>
          ) : null}
        </div>
        <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
          {guide.title}
        </h1>
      </header>

      <section className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl')}>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
          {guide.description}
        </p>
      </section>
    </div>
  )
}
