import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

/**
 * Calcite 404 — riff on the spreadsheet metaphor: a "cell-not-found"
 * formula error rendered in monospaced cells with primary blue accents
 * and recovery actions.
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

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
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(10),
              cm.h(10),
              'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30',
            )}
            aria-hidden="true"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              grid_on
            </span>
          </span>
          <span className={'text-2xl font-extrabold tracking-tight'}>{APP_NAME}</span>
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
      </main>
    </div>
  )
}

export default NotFound
