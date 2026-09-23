import { useEffect, useState } from 'react'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { unwrapList } from '../lib/unwrap.js'

interface Statement {
  id: string
  account_id: string
  account_name: string
  account_last4: string
  period_start_iso: string
  period_end_iso: string
  size_bytes: number
  download_url: string
}

function fmtPeriod(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return s.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  }
  return `${s.toLocaleDateString(undefined, { month: 'short' })} – ${e.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function Statements() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    http
      .get('/api/statements')
      .then((res) => {
        if (!cancelled) setStatements(unwrapList<Statement>(res))
      })
      .catch(() => {
        if (!cancelled)
          setError(t('statements.loadError', {}, { defaultValue: 'Failed to load statements.' }))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, t])

  const totalSize = statements.reduce((acc, s) => acc + s.size_bytes, 0)
  const accountCount = new Set(statements.map((s) => s.account_id)).size

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary',
          )}
        >
          {t('statements.eyebrow', {}, { defaultValue: 'Documents' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('statements.heading', {}, { defaultValue: 'Statements' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mt', 1))}>
          {t(
            'statements.subheading',
            {},
            { defaultValue: 'Monthly summaries of every account, downloadable as PDF.' },
          )}
        </p>

        {/* Summary chips */}
        {!loading && !error && statements.length > 0 ? (
          <div className={cm.cn(cm.flex({ gap: 'sm', wrap: 'wrap' }), cm.sp('mt', 4))}>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-primary-container text-primary uppercase tracking-wider',
              )}
            >
              {t(
                'statements.totalCount',
                { count: statements.length },
                { defaultValue: '{{count}} statements' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-surface-container text-on-surface-variant uppercase tracking-wider',
              )}
            >
              {t(
                'statements.accountsCount',
                { count: accountCount },
                { defaultValue: '{{count}} accounts' },
              )}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'bg-surface-container text-on-surface-variant uppercase tracking-wider font-mono',
              )}
            >
              {fmtSize(totalSize)}
            </span>
          </div>
        ) : null}
      </header>

      {error ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, 'text-error')}>{error}</p>
      ) : loading ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
        </p>
      ) : statements.length === 0 ? (
        <p className={cm.cn(cm.sp('py', 16), cm.textCenter, cm.textMuted)}>
          {t('statements.empty', {}, { defaultValue: 'No statements available yet.' })}
        </p>
      ) : (
        <ul className={cm.cn('space-y-2')}>
          {statements.map((s) => (
            <li
              key={s.id}
              className={cm.cn(
                cm.card(),
                cm.sp('p', 4),
                cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
              )}
            >
              <div className={cm.flex({ align: 'center', gap: 'md' })}>
                <span
                  className={cm.cn('material-symbols-outlined text-2xl text-primary')}
                  aria-hidden="true"
                >
                  description
                </span>
                <div>
                  <p className={cm.fontWeight('semibold')}>
                    {fmtPeriod(s.period_start_iso, s.period_end_iso)}
                  </p>
                  <p className={cm.cn(cm.textSize('xs'), cm.textMuted, 'font-mono truncate')}>
                    {s.account_name} · •••• {s.account_last4}
                  </p>
                </div>
              </div>
              <div className={cm.flex({ align: 'center', gap: 'md' })}>
                <span className={cm.cn(cm.textSize('xs'), cm.textMuted, 'font-mono')}>
                  {fmtSize(s.size_bytes)}
                </span>
                <a
                  href={s.download_url}
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'border border-outline rounded-md hover:bg-surface-container',
                  )}
                >
                  {t('statements.downloadCta', {}, { defaultValue: 'Download PDF' })}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
