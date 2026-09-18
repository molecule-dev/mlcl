import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { ProductPriceCard, type ProductPriceCardProduct } from '../components/ProductPriceCard.js'
import { fmtUsd, unwrapList } from '../lib/unwrap.js'

interface AccountUser {
  id?: string
  name?: string | null
  email?: string | null
}

interface ApiUser {
  id: string
  name?: string | null
  email?: string | null
}

interface ApiWatchlistItem {
  id: string
  product_id: string
  target_price?: number | null
  product?: {
    id: string
    name: string
    brand?: string
    category?: string
    best_price?: number
    price?: number
  } | null
}

const ACHIEVEMENT_DEFS = [
  { key: 'first', glyph: 'celebration', label: 'First $100 saved', threshold: 10000 },
  { key: 'streak', glyph: 'local_fire_department', label: '5-product streak', threshold: 0 },
  { key: 'big', glyph: 'workspace_premium', label: '$1,000 lifetime savings', threshold: 100000 },
  {
    key: 'master',
    glyph: 'military_tech',
    label: '{{appName}} master · $2.5K saved',
    threshold: 250000,
  },
] as const

const fmtMonth = (d: Date): string => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const auth = useAuth<AccountUser>()
  const http = useHttpClient()
  const [items, setItems] = useState<ApiWatchlistItem[]>([])
  const [shareCopied, setShareCopied] = useState(false)
  const [liveUser, setLiveUser] = useState<ApiUser | null>(null)
  const user = liveUser ?? auth.user
  const display =
    user?.name ?? user?.email ?? t('profile.guestName', {}, { defaultValue: 'Smart shopper' })
  const initial = (display ?? 'S').slice(0, 1).toUpperCase()

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get('/api/watchlist')
        if (cancelled) return
        setItems(unwrapList<ApiWatchlistItem>(res))
      } catch (_error) {
        // non-fatal: profile renders without watchlist savings data
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    const id = auth.user?.id
    if (!id) return
    let cancelled = false
    void (async () => {
      try {
        const res = await http.get(`/api/users/${id}`)
        if (cancelled) return
        const wrapped = (res as { data?: { props?: ApiUser } | ApiUser }).data
        const u: ApiUser | null =
          wrapped && typeof wrapped === 'object' && 'props' in wrapped
            ? (wrapped as { props: ApiUser }).props
            : (wrapped as ApiUser | null)
        if (u && (u.name || u.email)) setLiveUser(u)
      } catch (_error) {
        // non-fatal: profile falls back to auth.user data if the API call fails
      }
    })()
    return () => {
      cancelled = true
    }
  }, [http, auth.user?.id])

  const lifetimeSavings = items.reduce((acc, w) => {
    const p = w.product
    if (!p) return acc
    const list = Number(p.price ?? 0)
    const best = Number(p.best_price ?? list)
    return acc + Math.max(0, list - best)
  }, 0)

  const watchedProducts: ProductPriceCardProduct[] = items
    .flatMap((w) => {
      const p = w.product
      if (!p) return []
      const list = Number(p.price ?? 0)
      const best = Number(p.best_price ?? list)
      const drop = list > 0 ? Math.round(((list - best) / list) * 100) : 0
      return [
        {
          id: p.id,
          name: p.name,
          brand: p.brand ?? '—',
          category: p.category ?? '—',
          best_price_cents: best,
          list_price_cents: list,
          retailer_count: 5,
          drop_pct: drop,
          in_stock: true,
        },
      ]
    })
    .slice(0, 6)

  const achievements = ACHIEVEMENT_DEFS.map((a) => ({
    ...a,
    earned: lifetimeSavings >= a.threshold,
    earnedAt: lifetimeSavings >= a.threshold ? fmtMonth(new Date()) : 'In progress',
  }))

  const share = async () => {
    if (typeof navigator === 'undefined') return
    const url = `${window.location.origin}/profile`
    try {
      const nav = navigator as Navigator & {
        share?: (data: { title: string; url: string }) => Promise<void>
      }
      if (typeof nav.share === 'function') {
        await nav.share({ title: `My ${APP_NAME} profile`, url })
      } else if (nav.clipboard?.writeText) {
        await nav.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch (_error) {
      // user cancelled the native share dialog; no action needed
    }
  }

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8), 'space-y-8')} data-test="profile-page">
      <header
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container text-on-primary',
        )}
      >
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-surface/15 blur-3xl pointer-events-none',
          )}
        />
        <div
          aria-hidden="true"
          className={cm.cn(
            'absolute -left-12 top-1/3 h-56 w-56 rounded-full bg-secondary/30 blur-3xl pointer-events-none',
          )}
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }), 'relative')}>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-24 w-24 rounded-full bg-surface/20 backdrop-blur-md text-3xl font-extrabold text-on-primary border-2 border-surface/30',
            )}
          >
            {initial}
          </div>
          <div className={cm.cn('min-w-0 flex-1 space-y-2')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-primary/80',
              )}
            >
              {t('profile.eyebrow', {}, { defaultValue: 'Public profile' })}
            </p>
            <h1
              data-test="profile-display-name"
              className={cm.cn('text-3xl md:text-4xl font-extrabold tracking-tight')}
            >
              {display}
            </h1>
            <p
              className={cm.cn(cm.textSize('base'), 'text-on-primary/85 leading-relaxed max-w-2xl')}
            >
              {t(
                'profile.bio',
                {},
                {
                  defaultValue:
                    'Bargain hunting since 2024. Patient, target-driven, and allergic to MSRPs.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn('space-y-1 min-w-[12rem]')}>
            <p
              className={cm.cn(
                'text-[10px] font-black uppercase tracking-widest text-on-primary/80',
              )}
            >
              {t('profile.lifetimeSavings', {}, { defaultValue: 'Lifetime savings' })}
            </p>
            <p
              data-test="profile-savings"
              className={cm.cn('text-4xl font-extrabold tabular-nums tracking-tighter')}
            >
              {fmtUsd(lifetimeSavings)}
            </p>
            <button
              type="button"
              data-test="profile-share"
              onClick={() => void share()}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                'rounded-full bg-surface/20 backdrop-blur-md text-on-primary uppercase tracking-wider hover:bg-surface/30 transition-colors',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                share
              </span>
              {shareCopied
                ? t('profile.shareCopied', {}, { defaultValue: 'Link copied' })
                : t(
                    'profile.shareCta',
                    { appName: APP_NAME },
                    { defaultValue: 'Share my {{appName}}' },
                  )}
            </button>
          </div>
        </div>
      </header>

      <section>
        <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-secondary')}>
          {t('nav.achievements', {}, { defaultValue: 'Achievements' })}
        </p>
        <h2 className={cm.cn('mt-1 mb-5 text-2xl font-extrabold tracking-tight text-on-surface')}>
          {t('profile.achievementsHeading', {}, { defaultValue: 'Savings milestones' })}
        </h2>
        <div
          data-test="profile-achievements"
          className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}
        >
          {achievements.map((a) => (
            <article
              key={a.key}
              data-test={`profile-achievement-${a.key}`}
              className={cm.cn(
                cm.sp('p', 5),
                'rounded-2xl border shadow-sm transition-all',
                a.earned
                  ? 'bg-surface-container-lowest border-secondary/40 hover:-translate-y-0.5 hover:shadow-md'
                  : 'bg-surface-container/30 border-outline-variant/30 opacity-70',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-12 w-12 rounded-xl',
                  a.earned
                    ? 'bg-secondary/15 text-secondary'
                    : 'bg-surface-container text-on-surface-variant',
                )}
                aria-hidden="true"
              >
                <span
                  className={cm.cn('material-symbols-outlined text-2xl')}
                  style={{ fontVariationSettings: a.earned ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {a.glyph}
                </span>
              </span>
              <h3
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('base'),
                  cm.fontWeight('extrabold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t(
                  `profile.achievement.${a.key}.label`,
                  { appName: APP_NAME },
                  { defaultValue: a.label },
                )}
              </h3>
              <p
                className={cm.cn(
                  cm.sp('mt', 1),
                  cm.textSize('xs'),
                  'text-on-surface-variant uppercase tracking-widest font-bold',
                )}
              >
                {a.earned
                  ? a.earnedAt
                  : t('profile.inProgress', {}, { defaultValue: 'In progress' })}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <header
          className={cm.cn(
            cm.flex({ align: 'end', justify: 'between', gap: 'md' }),
            cm.sp('mb', 5),
          )}
        >
          <div>
            <p className={cm.cn('text-[10px] font-black uppercase tracking-widest text-tertiary')}>
              {t('profile.publicWatchesEyebrow', {}, { defaultValue: 'Public watchlist' })}
            </p>
            <h2 className={cm.cn('mt-1 text-2xl font-extrabold tracking-tight text-on-surface')}>
              {t('profile.publicWatchesHeading', {}, { defaultValue: 'What I am watching' })}
            </h2>
          </div>
          <Link
            to="/watchlist"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'text-primary hover:underline',
            )}
          >
            {t('profile.editWatchlist', {}, { defaultValue: 'Edit watchlist' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </header>
        {watchedProducts.length === 0 ? (
          <div
            data-test="profile-watches-empty"
            className={cm.cn(
              cm.sp('p', 8),
              cm.textCenter,
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant',
            )}
          >
            {t(
              'profile.publicWatchesEmpty',
              {},
              { defaultValue: 'Your public watchlist is empty.' },
            )}
          </div>
        ) : (
          <div
            data-test="profile-watches-grid"
            className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}
          >
            {watchedProducts.map((p) => (
              <ProductPriceCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
