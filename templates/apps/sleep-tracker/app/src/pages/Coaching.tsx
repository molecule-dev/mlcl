import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { unwrapList } from '../lib/unwrap.js'

interface Article {
  id: string
  slug: string
  title: string
  category: string
  is_premium: boolean
  published_at: string
  hero_image_key?: string | null
}

const CATEGORY_PALETTE: Record<string, { bg: string; fg: string; icon: string; label: string }> = {
  'sleep-hygiene': {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'self_improvement',
    label: 'Wind-down',
  },
  lifestyle: {
    bg: 'var(--color-badge-violet-bg)',
    fg: 'var(--color-badge-violet-fg)',
    icon: 'schedule',
    label: 'Rhythm',
  },
  recovery: {
    bg: 'var(--color-badge-green-bg)',
    fg: 'var(--color-badge-green-fg)',
    icon: 'monitor_heart',
    label: 'Recovery',
  },
  mind: {
    bg: 'var(--color-badge-amber-bg)',
    fg: 'var(--color-badge-amber-fg)',
    icon: 'spa',
    label: 'Mind',
  },
  default: {
    bg: 'var(--color-badge-indigo-bg)',
    fg: 'var(--color-badge-indigo-fg)',
    icon: 'auto_stories',
    label: 'Article',
  },
}

function paletteFor(category: string) {
  return CATEGORY_PALETTE[category] ?? CATEGORY_PALETTE['default']!
}

export function Coaching() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    http
      .get('/api/coaching')
      .then((res) => {
        if (cancelled) return
        setArticles(unwrapList<Article>(res))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const featured = articles.find((a) => a.slug.includes('wind-down')) ?? articles[0]

  return (
    <div className={cm.cn(cm.sp('p', 8), 'space-y-8')}>
      <header>
        <p
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[10px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('coaching.eyebrow', {}, { defaultValue: 'Coaching' })}
        </p>
        <h1 className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight', cm.sp('mt', 1))}>
          {t('coaching.heading', {}, { defaultValue: 'Programs personalised to your nights' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('lg'), cm.sp('mt', 3), 'text-on-surface-variant max-w-2xl')}
        >
          {t(
            'coaching.subheading',
            { appName: APP_NAME },
            {
              defaultValue:
                'Each program adapts to your chronotype, the stages {{appName}} is seeing, and the goals you set.',
            },
          )}
        </p>
      </header>

      {featured && (
        <section
          className={cm.cn(cm.sp('p', 8), 'rounded-[2rem] text-white relative overflow-hidden')}
          style={{
            background:
              'linear-gradient(135deg, var(--color-hero-gradient-start) 0%, #6c5ce7 50%, #a78bfa 100%)',
          }}
          data-testid="coaching-featured"
        >
          <div
            className={cm.cn(
              'absolute -right-12 -top-16 w-56 h-56 rounded-full bg-surface/15 blur-3xl',
            )}
          />
          <div
            className={cm.cn('absolute -left-16 -bottom-16 w-64 h-64 rounded-full blur-3xl')}
            style={{ background: 'rgba(255, 255, 255, 0.15)' }}
          />
          <p
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[10px] uppercase tracking-widest text-white/75 relative z-10',
            )}
          >
            {t('coaching.activeBanner.eyebrow', {}, { defaultValue: 'Featured article' })}
          </p>
          <h2
            className={cm.cn(
              'text-3xl md:text-4xl font-extrabold tracking-tight relative z-10',
              cm.sp('mt', 1),
            )}
          >
            {featured.title}
          </h2>
          <Link
            to={`/coaching/${featured.id}`}
            className={cm.cn(
              cm.sp('mt', 6),
              cm.sp('px', 5),
              cm.sp('py', 2),
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              'inline-flex items-center gap-2 rounded-full bg-surface shadow-md hover:shadow-lg transition-shadow relative z-10',
            )}
            style={{ color: 'var(--color-primary)' }}
          >
            {t('coaching.activeBanner.continue', {}, { defaultValue: 'Read article' })}
            <span className={cm.cn('material-symbols-outlined')}>arrow_forward</span>
          </Link>
        </section>
      )}

      {!loading && articles.length === 0 ? (
        <section
          className={cm.cn(cm.sp('p', 8), 'rounded-2xl bg-surface-container-lowest text-center')}
          data-testid="coaching-empty"
        >
          <h2 className={cm.cn('text-xl font-extrabold tracking-tight')}>
            {t('coaching.empty.title', {}, { defaultValue: 'No coaching articles yet' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 2))}>
            {t(
              'coaching.empty.body',
              {},
              { defaultValue: 'New programs will appear here as they are added.' },
            )}
          </p>
        </section>
      ) : (
        <section
          className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-2')}
          data-testid="coaching-list"
        >
          {articles.map((p) => {
            const palette = paletteFor(p.category)
            return (
              <Link
                key={p.id}
                to={`/coaching/${p.id}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'block bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all border-l-4 group',
                )}
                style={{ borderLeftColor: palette.fg }}
              >
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 3),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      'h-12 w-12 rounded-xl shrink-0',
                    )}
                    style={{ backgroundColor: palette.bg, color: palette.fg }}
                  >
                    <span
                      className={cm.cn('material-symbols-outlined text-2xl')}
                      aria-hidden="true"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {palette.icon}
                    </span>
                  </span>
                  <span
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.fontWeight('bold'),
                      'text-[10px] py-1 rounded-full uppercase tracking-widest',
                    )}
                    style={{ backgroundColor: palette.bg, color: palette.fg }}
                  >
                    {t(`coaching.category.${p.category}`, {}, { defaultValue: palette.label })}
                  </span>
                </div>
                <h3
                  className={cm.cn(
                    cm.textSize('xl'),
                    cm.fontWeight('bold'),
                    'group-hover:text-primary transition-colors',
                  )}
                >
                  {p.title}
                </h3>
                {p.is_premium && (
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.sp('mt', 2))}
                    style={{ color: palette.fg }}
                  >
                    {t('coaching.premiumBadge', {}, { defaultValue: 'Premium' })}
                  </p>
                )}
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mt', 4),
                  )}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-[10px] uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {new Date(p.published_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.fontWeight('bold'),
                      cm.textSize('xs'),
                      cm.textPrimary,
                    )}
                  >
                    {t('coaching.read', {}, { defaultValue: 'Read' })}
                    <span className={cm.cn('material-symbols-outlined text-base')}>
                      arrow_forward
                    </span>
                  </span>
                </div>
              </Link>
            )
          })}
        </section>
      )}
    </div>
  )
}
