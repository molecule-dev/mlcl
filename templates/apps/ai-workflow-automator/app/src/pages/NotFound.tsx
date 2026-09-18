/**
 * 404 — branded empty-state with disconnected node graph and rescue actions.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      data-mol-id="page-not-found"
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 8),
        'relative overflow-hidden font-body text-center',
      )}
      style={{ background: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in srgb, var(--color-node-trigger) 18%, transparent) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />
      <div
        className={'absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl'}
        style={{ background: 'color-mix(in srgb, var(--color-node-trigger) 45%, transparent)' }}
        aria-hidden
      />
      <div
        className={'absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl'}
        style={{ background: 'color-mix(in srgb, var(--color-node-condition) 45%, transparent)' }}
        aria-hidden
      />

      <div className="relative z-10 max-w-md">
        {/* Disconnected node SVG */}
        <svg viewBox="0 0 200 120" className={'w-64 mx-auto mb-8'} aria-hidden>
          <path
            d="M30 60 L80 60"
            stroke="var(--color-accent-violet-light)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <path
            d="M120 60 L170 60"
            stroke="var(--color-accent-violet-light)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx="30" cy="60" r="14" fill="var(--color-node-trigger)" />
          <circle cx="170" cy="60" r="14" fill="var(--color-node-condition)" />
          <circle
            cx="100"
            cy="60"
            r="18"
            fill="var(--mol-color-error)"
            fillOpacity="0.25"
            stroke="var(--mol-color-error)"
            strokeWidth="2"
          />
          <text
            x="100"
            y="66"
            textAnchor="middle"
            fill="var(--color-status-error-bg)"
            fontSize="14"
            fontWeight="700"
          >
            !
          </text>
        </svg>

        <div
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            'uppercase tracking-widest mb-2',
          )}
          style={{ color: 'var(--color-node-condition)' }}
        >
          {t('notFound.eyebrow', {}, { defaultValue: 'Error 404 · Node not found' })}
        </div>
        <h1 className={'text-4xl md:text-5xl font-extrabold tracking-tighter mb-3'}>
          {t('notFound.title', {}, { defaultValue: 'This route is disconnected.' })}
        </h1>
        <p
          className={cm.cn(cm.textSize('base'), cm.sp('mb', 8))}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                "The path you tried doesn't link to any workflow in this workspace. Maybe a node was renamed?",
            },
          )}
        </p>
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'sm' }), 'flex-wrap')}
        >
          <Link
            to="/dashboard"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full text-white shadow-md transition-all hover:-translate-y-0.5',
            )}
            style={{
              background:
                'linear-gradient(135deg, var(--color-node-trigger), var(--color-node-condition))',
              boxShadow:
                '0 6px 20px color-mix(in srgb, var(--color-node-trigger) 45%, transparent)',
            }}
          >
            <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
              space_dashboard
            </span>
            {t('auth.backToDashboard', {}, { defaultValue: 'Back to dashboard' })}
          </Link>
          <Link
            to="/workflows"
            className={cm.cn(
              cm.sp('px', 5),
              cm.sp('py', 3),
              cm.textSize('sm'),
              cm.fontWeight('bold'),
              'rounded-full transition-colors',
            )}
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-foreground)',
              border: '1px solid var(--color-border)',
            }}
          >
            {t('notFound.workflowsCta', {}, { defaultValue: 'Browse workflows' })}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
