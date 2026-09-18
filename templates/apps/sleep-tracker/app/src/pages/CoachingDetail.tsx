import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapSingle } from '../lib/unwrap.js'

interface Article {
  id: string
  slug: string
  title: string
  body_markdown: string
  category: string
  is_premium: boolean
  hero_image_key?: string | null
  published_at: string
  locked?: boolean
}

function renderMarkdown(
  md: string,
): { type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'li' | 'blank'; text: string }[] {
  const lines = md.split(/\r?\n/)
  return lines.map((raw) => {
    const line = raw.trimEnd()
    if (line.startsWith('### ')) return { type: 'h3', text: line.slice(4) }
    if (line.startsWith('## ')) return { type: 'h2', text: line.slice(3) }
    if (line.startsWith('# ')) return { type: 'h1', text: line.slice(2) }
    if (line.startsWith('- ') || line.startsWith('* ')) return { type: 'li', text: line.slice(2) }
    if (line.length === 0) return { type: 'blank', text: '' }
    return { type: 'p', text: line }
  })
}

export function CoachingDetail() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const { id } = useParams()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    http
      .get(`/api/coaching/${id}`)
      .then((res) => {
        if (cancelled) return
        const a = unwrapSingle<Article>(res)
        if (!a) {
          setNotFound(true)
          return
        }
        if (a.locked) {
          setLocked(true)
          setArticle(a)
          return
        }
        setArticle(a)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, id])

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header>
        <Link
          to="/coaching"
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.textSize('sm'),
            cm.fontWeight('bold'),
            cm.textPrimary,
            cm.sp('mb', 2),
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')}>arrow_back</span>
          {t('coachingDetail.backLink', {}, { defaultValue: 'All articles' })}
        </Link>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {article?.category ?? t('coachingDetail.eyebrow', {}, { defaultValue: 'Article' })}
        </p>
        <h1
          className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}
          data-testid="coaching-detail-title"
        >
          {loading
            ? t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })
            : (article?.title ??
              t('coachingDetail.unavailable', {}, { defaultValue: 'Article unavailable' }))}
        </h1>
      </header>

      {notFound && (
        <p
          className={cm.cn(cm.textSize('sm'), cm.textMuted)}
          data-testid="coaching-detail-not-found"
        >
          {t('coachingDetail.notFound', {}, { defaultValue: 'We could not find this article.' })}
        </p>
      )}

      {locked && (
        <section
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest text-center space-y-3',
          )}
          data-testid="coaching-detail-locked"
        >
          <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
            lock
          </span>
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('coachingDetail.locked.title', {}, { defaultValue: 'This article is premium' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t(
              'coachingDetail.locked.body',
              {},
              { defaultValue: 'Upgrade your plan to read this and other premium articles.' },
            )}
          </p>
          <Link
            to="/settings"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-full bg-primary text-on-primary shadow-md hover:shadow-lg transition-shadow',
            )}
          >
            {t('coachingDetail.locked.cta', {}, { defaultValue: 'Upgrade plan' })}
            <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
          </Link>
        </section>
      )}

      {!loading && !notFound && !locked && article && (
        <article
          className={cm.cn(
            cm.sp('p', 8),
            'bg-surface-container-lowest rounded-2xl shadow-sm space-y-3 max-w-3xl',
          )}
          data-testid="coaching-detail-body"
        >
          {renderMarkdown(article.body_markdown).map((block, idx) => {
            if (block.type === 'blank') return null
            if (block.type === 'h1') {
              return (
                <h1 key={idx} className={cm.cn('text-3xl font-extrabold tracking-tight')}>
                  {block.text}
                </h1>
              )
            }
            if (block.type === 'h2') {
              return (
                <h2 key={idx} className={cm.cn('text-2xl font-bold tracking-tight')}>
                  {block.text}
                </h2>
              )
            }
            if (block.type === 'h3') {
              return (
                <h3 key={idx} className={cm.cn('text-xl font-bold tracking-tight')}>
                  {block.text}
                </h3>
              )
            }
            if (block.type === 'li') {
              return (
                <li key={idx} className={cm.cn(cm.textSize('base'), 'list-disc ml-6')}>
                  {block.text}
                </li>
              )
            }
            return (
              <p
                key={idx}
                className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}
              >
                {block.text}
              </p>
            )
          })}
        </article>
      )}
    </div>
  )
}
