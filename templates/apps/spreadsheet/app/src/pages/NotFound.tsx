import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'

interface RecentWorkbook {
  id: string
  title: string
  updated_at: string
}

/**
 * Calcite 404 — riff on the spreadsheet metaphor: a "cell-not-found"
 * formula error rendered in monospaced cells with primary blue accents
 * and recovery actions.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const [recent, setRecent] = useState<RecentWorkbook[]>([])

  // Best-effort recovery strip: the design's 404 offers the user's recent
  // workbooks as one-click destinations. Anonymous visitors (or a failed
  // fetch) simply don't see the section.
  useEffect(() => {
    let cancelled = false
    http
      .get<unknown>('/spreadsheets')
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res.data) ? (res.data as RecentWorkbook[]) : []
        setRecent(
          rows
            .slice()
            .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
            .slice(0, 4),
        )
      })
      .catch(() => {
        /* tolerate — section stays hidden */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        'bg-surface-container-low text-on-surface antialiased relative overflow-hidden',
      )}
    >
      <div
        className={'absolute -right-32 -top-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl'}
        aria-hidden="true"
      />
      <div
        className={'absolute -left-32 -bottom-32 w-96 h-96 rounded-full bg-secondary/10 blur-3xl'}
        aria-hidden="true"
      />

      <main className={cm.cn(cm.maxW('xl'), cm.w('full'), cm.textCenter, 'relative z-10')}>
        <Link
          to="/"
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
            cm.sp('mb', 8),
          )}
        >
          <BrandWordmark as="span" size="lg" />
        </Link>

        <div
          className={
            'rounded-2xl bg-surface-container-lowest shadow-sm border border-outline-variant/40 overflow-hidden'
          }
        >
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'border-b border-outline-variant/40 bg-surface-container-low',
            )}
          >
            <span
              className={
                'w-7 h-7 rounded-lg bg-formula-light text-formula font-mono text-xs font-extrabold flex items-center justify-center'
              }
              aria-hidden="true"
              style={{
                backgroundColor: 'var(--color-formula-light)',
                color: 'var(--color-formula)',
              }}
            >
              fx
            </span>
            <span
              className={
                'font-mono text-xs uppercase tracking-widest text-error font-bold border-r border-outline-variant/40 pr-3'
              }
            >
              {t('notFound.cellRef', {}, { defaultValue: '#REF!' })}
            </span>
            <code className={'font-mono text-[13px] text-on-surface-variant flex-1 text-left'}>
              {t(
                'notFound.formula',
                {},
                { defaultValue: '=LOOKUP(REQUEST.url, "routes", "page")' },
              )}
            </code>
          </div>
          <div className={cm.cn(cm.sp('p', 10), cm.stack(6))}>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-error">
              {t('notFound.eyebrow', {}, { defaultValue: 'Error 404 · cell not found' })}
            </p>
            <h1 className="text-6xl font-extrabold tracking-tight text-on-surface">
              {t('notFound.headline', {}, { defaultValue: 'This row never existed.' })}
            </h1>
            <p className={'text-base text-on-surface-variant max-w-md mx-auto leading-relaxed'}>
              {t(
                'notFound.subhead',
                {},
                {
                  defaultValue:
                    'The address you typed doesn’t resolve to a workbook, sheet, or named range. Maybe it was deleted, or you copied a stale link.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center', gap: 'sm', wrap: 'wrap' }),
              )}
            >
              <Link
                to="/"
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform'
                }
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  home
                </span>
                {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
              </Link>
              <Link
                to="/workbooks"
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-surface rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors'
                }
              >
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  grid_on
                </span>
                {t('notFound.toWorkbooks', {}, { defaultValue: 'My workbooks' })}
              </Link>
            </div>
          </div>
        </div>

        {recent.length > 0 && (
          <section
            data-testid="notfound-recent"
            aria-labelledby="notfound-recent-title"
            className={cm.cn(cm.sp('mt', 10), 'border-t border-outline-variant/40 pt-8 text-left')}
          >
            <h2
              id="notfound-recent-title"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 4),
                'text-on-surface',
              )}
            >
              {t('notFound.recent.heading', {}, { defaultValue: 'Recent workbooks' })}
            </h2>
            <div className={cm.cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4')}>
              {recent.map((wb) => (
                <Link
                  key={wb.id}
                  to={`/workbooks/${wb.id}`}
                  data-mol-id="notfound-recent-workbook"
                  className={cm.cn(
                    'group flex flex-col h-[100px] rounded-lg p-3 border border-outline-variant/50 bg-surface-container-lowest hover:border-primary hover:shadow-sm transition-all',
                  )}
                >
                  <span
                    className={
                      'w-8 h-8 grid grid-cols-3 grid-rows-3 gap-px rounded overflow-hidden border border-outline-variant/40 shrink-0'
                    }
                    aria-hidden="true"
                  >
                    <span className="bg-surface-container-high" />
                    <span className="bg-primary-fixed" />
                    <span className="bg-surface-container-high" />
                    <span className="bg-surface-container-high" />
                    <span className="bg-primary-fixed-dim" />
                    <span className="bg-surface-container-high" />
                    <span className="bg-primary/15" />
                    <span className="bg-surface-container-high" />
                    <span className="bg-surface-container-high" />
                  </span>
                  <span className="mt-auto block text-[13px] font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                    {wb.title}
                  </span>
                  <span className="block text-[11px] text-on-surface-variant tabular-nums mt-0.5">
                    {t(
                      'notFound.recent.edited',
                      { when: new Date(wb.updated_at).toLocaleDateString() },
                      { defaultValue: 'Edited {{when}}' },
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default NotFound
