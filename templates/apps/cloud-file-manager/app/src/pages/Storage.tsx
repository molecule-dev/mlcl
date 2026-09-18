import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { NimbusFilesLayout } from '../components/NimbusFilesLayout.js'
import { NimbusStorageMeter } from '../components/NimbusStorageMeter.js'

interface StorageBreakdown {
  documents: number
  images: number
  videos: number
  archives: number
  code: number
  audio: number
  other: number
}

interface StorageResponse {
  usedBytes: number
  breakdown: StorageBreakdown
}

interface PlanLimits {
  maxFiles: number
  maxFolders: number
  maxShares: number
  advancedFeatures: boolean
  canExport: boolean
  retentionDays: number
}

interface PlanRow {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: PlanLimits
}

interface PlanStatusResponse {
  planKey: string
  category: string
  name: string
  limits: PlanLimits
  isFree: boolean
}

const PLAN_TOTALS: Record<string, number> = {
  free: 15 * 1024 ** 3,
  pro: 200 * 1024 ** 3,
  team: 2 * 1024 ** 4,
}

const BREAKDOWN_META: Array<{
  key: keyof StorageBreakdown
  labelKey: string
  defaultLabel: string
  glyph: string
  tone: 'primary' | 'tertiary' | 'success' | 'warning' | 'error'
}> = [
  {
    key: 'documents',
    labelKey: 'storage.kind.documents',
    defaultLabel: 'Documents',
    glyph: 'description',
    tone: 'primary',
  },
  {
    key: 'images',
    labelKey: 'storage.kind.images',
    defaultLabel: 'Images',
    glyph: 'image',
    tone: 'tertiary',
  },
  {
    key: 'videos',
    labelKey: 'storage.kind.videos',
    defaultLabel: 'Video',
    glyph: 'movie',
    tone: 'error',
  },
  {
    key: 'audio',
    labelKey: 'storage.kind.audio',
    defaultLabel: 'Audio',
    glyph: 'audiotrack',
    tone: 'warning',
  },
  {
    key: 'archives',
    labelKey: 'storage.kind.archives',
    defaultLabel: 'Archives',
    glyph: 'folder_zip',
    tone: 'warning',
  },
  {
    key: 'code',
    labelKey: 'storage.kind.code',
    defaultLabel: 'Code & data',
    glyph: 'code',
    tone: 'success',
  },
  {
    key: 'other',
    labelKey: 'storage.kind.other',
    defaultLabel: 'Other',
    glyph: 'inbox',
    tone: 'primary',
  },
]

const TONE_BAR: Record<'primary' | 'tertiary' | 'success' | 'warning' | 'error', string> = {
  primary: 'bg-primary',
  tertiary: 'bg-tertiary',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
}

const TONE_TILE: Record<'primary' | 'tertiary' | 'success' | 'warning' | 'error', string> = {
  primary: 'bg-primary-container/15 text-primary',
  tertiary: 'bg-tertiary-container/15 text-tertiary',
  success: 'bg-success-light text-success',
  warning: 'bg-warning-light text-warning',
  error: 'bg-error-light text-error',
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 MB'
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function formatPlanTotal(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(0)} TB`
  return `${Math.round(bytes / 1024 ** 3)} GB`
}

export function Storage() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()

  const [storage, setStorage] = useState<StorageResponse | null>(null)
  const [plans, setPlans] = useState<PlanRow[] | null>(null)
  const [currentCategory, setCurrentCategory] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      http.get<StorageResponse>('/api/storage'),
      http.get<{ data?: PlanRow[] }>('/api/billing/tiers').catch(() => null),
      http.get<PlanStatusResponse>('/api/billing/status').catch(() => null),
    ])
      .then(([storageRes, plansRes, statusRes]) => {
        if (cancelled) return
        setStorage(storageRes.data ?? null)
        const tiers = plansRes?.data?.data
        setPlans(Array.isArray(tiers) ? tiers : [])
        setCurrentCategory(statusRes?.data?.category ?? null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(
          e instanceof Error
            ? e.message
            : t('storage.fetchError', {}, { defaultValue: 'Could not load storage.' }),
        )
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const usedBytes = storage?.usedBytes ?? 0
  const totalBytes = useMemo(() => {
    if (currentCategory && PLAN_TOTALS[currentCategory] !== undefined)
      return PLAN_TOTALS[currentCategory]
    return PLAN_TOTALS.pro
  }, [currentCategory])

  const usagePercent =
    totalBytes > 0 ? Math.min(100, Math.round((usedBytes / totalBytes) * 100)) : 0
  const headroom = Math.max(0, totalBytes - usedBytes)

  function handleChoosePlan() {
    navigate('/pricing')
  }

  return (
    <NimbusFilesLayout
      breadcrumbs={[
        {
          to: '/files',
          label: t('storage.crumbs.home', { appName: APP_NAME }, { defaultValue: '{{appName}}' }),
        },
        { label: t('storage.crumbs.storage', {}, { defaultValue: 'Storage' }) },
      ]}
      usedBytes={usedBytes}
      totalBytes={totalBytes}
    >
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}
        data-mol-id={`storage-page-${usedBytes}`}
      >
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'lg' }),
            cm.sp('p', 10),
            'rounded-[2rem] bg-gradient-to-br from-primary to-tertiary-container text-on-primary relative overflow-hidden',
          )}
        >
          <div className="relative z-10">
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mb', 3),
                'font-black uppercase tracking-widest text-on-primary/80',
              )}
            >
              {t('storage.hero.eyebrow', {}, { defaultValue: 'Storage overview' })}
            </p>
            <h1
              className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight leading-tight')}
            >
              {t(
                'storage.hero.title',
                { used: formatBytes(usedBytes), total: formatPlanTotal(totalBytes) },
                { defaultValue: '{{used}} of {{total}} used' },
              )}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                cm.sp('mt', 3),
                cm.maxW('lg'),
                'text-on-primary/85',
              )}
            >
              {t(
                'storage.hero.body',
                {},
                {
                  defaultValue:
                    'Plenty of room to grow. We’ll alert you when you cross 75% — and again at 90% — so you can prune the heavy stuff before it slows anyone down.',
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(
              cm.sp('p', 6),
              'relative z-10 rounded-2xl bg-surface/15 backdrop-blur-md',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                cm.sp('mb', 3),
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  'font-black uppercase tracking-widest text-on-primary/80',
                )}
              >
                {t(
                  'storage.hero.meterLabel',
                  { percent: usagePercent },
                  { defaultValue: '{{percent}}% of plan' },
                )}
              </span>
              <span
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.fontWeight('bold'),
                  'text-on-primary tabular-nums',
                )}
              >
                {t(
                  'storage.hero.headroom',
                  { headroom: formatBytes(headroom) },
                  { defaultValue: '{{headroom}} headroom' },
                )}
              </span>
            </div>
            <div className={cm.cn('h-3 rounded-full overflow-hidden bg-surface/20')}>
              <div
                className={cm.cn('h-full bg-on-primary rounded-full transition-all')}
                style={{ width: `${usagePercent}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
          <div
            className={cm.cn(
              'absolute -right-24 -bottom-24 w-80 h-80 rounded-full bg-surface/10 blur-3xl',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              'absolute right-12 top-12 w-32 h-32 rounded-full bg-surface/10 blur-2xl',
            )}
            aria-hidden="true"
          />
        </section>

        {error && (
          <div
            role="alert"
            className={cm.cn(
              cm.sp('p', 4),
              cm.textSize('sm'),
              'rounded-xl bg-error-container text-on-error-container',
            )}
          >
            {error}
          </div>
        )}

        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'md' }),
            cm.sp('p', 8),
            'rounded-2xl bg-surface-container-lowest border border-outline-variant/15',
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('storage.breakdown.title', {}, { defaultValue: 'What’s using your space' })}
            </h2>
          </div>
          {storage === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
            </p>
          ) : usedBytes === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'storage.breakdown.empty',
                {},
                {
                  defaultValue:
                    'No files yet. Upload something to see your storage break down by type.',
                },
              )}
            </p>
          ) : (
            <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
              {BREAKDOWN_META.filter((m) => storage.breakdown[m.key] > 0).map((m) => {
                const bytes = storage.breakdown[m.key]
                const percent = usedBytes > 0 ? Math.round((bytes / usedBytes) * 100) : 0
                return (
                  <li
                    key={m.key}
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'md' }),
                      cm.sp('p', 4),
                      'rounded-xl bg-surface-container-low',
                    )}
                  >
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        'rounded-xl shrink-0',
                        TONE_TILE[m.tone],
                      )}
                    >
                      <span className="material-symbols-outlined">{m.glyph}</span>
                    </span>
                    <div
                      className={cm.cn(
                        cm.flex({ direction: 'col', gap: 'xs' }),
                        'flex-grow min-w-0',
                      )}
                    >
                      <div className={cm.cn(cm.flex({ align: 'baseline', justify: 'between' }))}>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('semibold'),
                            'text-on-surface',
                          )}
                        >
                          {t(m.labelKey, {}, { defaultValue: m.defaultLabel })}
                        </span>
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('bold'),
                            'text-on-surface tabular-nums',
                          )}
                        >
                          {formatBytes(bytes)}
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          'h-1.5 rounded-full overflow-hidden bg-surface-container-high',
                        )}
                      >
                        <div
                          className={cm.cn('h-full rounded-full', TONE_BAR[m.tone])}
                          style={{ width: `${percent}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('bold'),
                        'w-10 text-right text-on-surface-variant tabular-nums shrink-0',
                      )}
                    >
                      {`${percent}%`}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <div className={cm.cn(cm.sp('mt', 2))}>
            <NimbusStorageMeter usedBytes={usedBytes} totalBytes={totalBytes} variant="full" />
          </div>
        </section>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
              {t('storage.plans.title', {}, { defaultValue: 'Plans that grow with you' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'storage.plans.body',
                {},
                { defaultValue: 'Switch any time — your files stay exactly where they are.' },
              )}
            </p>
          </div>
          {plans === null ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t('nav.loadingPlans', {}, { defaultValue: 'Loading plans…' })}
            </p>
          ) : plans.length === 0 ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'storage.plans.unavailable',
                {},
                { defaultValue: 'Plan information will appear here once configured.' },
              )}
            </p>
          ) : (
            <div className={cm.cn(cm.grid({ cols: 1, gap: 4 }), 'md:grid-cols-3')}>
              {plans.map((p) => {
                const current = currentCategory === p.key
                const monthly = p.prices.find((x) => x.period === 'month')
                const monthlyLabel = monthly?.price ?? t('nav.free', {}, { defaultValue: 'Free' })
                const total = PLAN_TOTALS[p.key]
                return (
                  <div
                    key={p.key}
                    data-mol-id={`storage-plan-${p.key}`}
                    className={cm.cn(
                      cm.flex({ direction: 'col', gap: 'md' }),
                      cm.sp('p', 6),
                      'rounded-2xl border transition-all',
                      current
                        ? 'bg-gradient-to-br from-primary-container/15 to-tertiary-container/15 border-primary shadow-md shadow-primary/10'
                        : 'bg-surface-container-lowest border-outline-variant/20 hover:border-primary-container',
                    )}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-black uppercase tracking-widest text-on-surface-variant',
                        )}
                      >
                        {p.name ?? p.key}
                      </span>
                      {current && (
                        <span
                          className={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('px', 2),
                            cm.sp('py', 1),
                            cm.roundedFull,
                            'font-black uppercase tracking-widest bg-primary text-on-primary',
                          )}
                        >
                          {t('nav.current', {}, { defaultValue: 'Current' })}
                        </span>
                      )}
                    </div>
                    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                      <span
                        className={cm.cn('text-3xl font-extrabold tracking-tight text-on-surface')}
                      >
                        {monthlyLabel}
                      </span>
                      {total && (
                        <span className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                          {t(
                            'storage.plans.included',
                            { storage: formatPlanTotal(total) },
                            { defaultValue: '{{storage}} included' },
                          )}
                        </span>
                      )}
                      <ul
                        className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.sp('mt', 2))}
                      >
                        <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'storage.plans.maxFiles',
                            { count: p.limits.maxFiles.toLocaleString() },
                            { defaultValue: '{{count}} files' },
                          )}
                        </li>
                        <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'storage.plans.maxFolders',
                            { count: p.limits.maxFolders.toLocaleString() },
                            { defaultValue: '{{count}} folders' },
                          )}
                        </li>
                        <li className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {t(
                            'storage.plans.maxShares',
                            { count: p.limits.maxShares.toLocaleString() },
                            { defaultValue: '{{count}} shares' },
                          )}
                        </li>
                      </ul>
                    </div>
                    <button
                      type="button"
                      disabled={current}
                      onClick={handleChoosePlan}
                      data-mol-id={`storage-plan-cta-${p.key}`}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.sp('py', 3),
                        cm.fontWeight('semibold'),
                        'rounded-xl transition-all',
                        current
                          ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                          : 'bg-gradient-to-br from-primary to-tertiary-container text-on-primary hover:opacity-90',
                      )}
                    >
                      {current
                        ? t('storage.plans.youreOn', {}, { defaultValue: 'You’re on this plan' })
                        : t(
                            'storage.plans.choose',
                            { name: p.name ?? p.key },
                            { defaultValue: 'Choose {{name}}' },
                          )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </NimbusFilesLayout>
  )
}

export default Storage
