import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Dark monospace 404 — DESIGN.md spec: "Dark centered 404 with monospace
 * endpoint-not-found message and link back to docs."
 */
export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.minH('screen'),
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('px', 6),
      )}
      style={{
        backgroundColor: 'var(--mol-color-secondary)',
        color: 'var(--mol-color-background-tertiary)',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 30%, color-mix(in srgb, var(--color-method-get) 10%, transparent), transparent 45%),' +
            'radial-gradient(circle at 70% 60%, color-mix(in srgb, var(--color-method-patch) 8%, transparent), transparent 40%)',
        }}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10 text-center space-y-6 max-w-md')}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
          {t('notFound.eyebrow', {}, { defaultValue: 'HTTP 404' })}
        </p>
        <h1 className="text-7xl font-extrabold tracking-tighter">
          <span className="text-emerald-400">{`{`}</span>endpoint
          <span className="text-emerald-400">{`}`}</span>
        </h1>
        <pre
          className={cm.cn(
            'text-sm font-mono leading-relaxed bg-foreground/30 px-4 py-3 rounded-xl border border-outline-variant/20 text-left overflow-auto',
          )}
        >
          {`> GET ${typeof window !== 'undefined' ? window.location.pathname : '/missing'}
< 404 Not Found
{
  "error": "endpoint_not_found",
  "message": "No route matches this path."
}`}
        </pre>
        <p className={cm.cn('text-base text-on-surface-variant')}>
          {t(
            'notFound.body',
            {},
            { defaultValue: "The path you tried doesn't exist (yet). The docs are still home." },
          )}
        </p>
        <Link
          to="/"
          className={cm.cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold uppercase tracking-widest bg-emerald-500 text-foreground hover:bg-emerald-400 transition-colors',
          )}
        >
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_back
          </span>
          {t('auth.backToHome', {}, { defaultValue: 'Back to home' })}
        </Link>
      </div>
    </div>
  )
}
