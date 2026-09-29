import { getClassMap } from '@molecule/app-ui'

export interface AuthFeatureItem {
  /** Material symbol name — used when the item has no step number. */
  icon?: string
  /** Optional "01"-style step number (the credential-protocol list). */
  step?: string
  title: string
  body: string
}

/**
 * Companion panel under an auth form — the designs' "why sign in",
 * "commuter benefits", and "credential protocol" cards. A titled, bordered
 * list of icon-tile features (or numbered steps) rendered below the form so
 * the marketing/trust copy from the Stitch designs lives on the same screen
 * as the action it supports.
 *
 * Titles/bodies arrive pre-resolved through i18n `t()` at the call site;
 * this component is presentation-only. No inputs or submit controls may
 * live here — the auth e2e specs address the form's fields by position and
 * `form button[type="submit"]`.
 */
export function AuthFeaturePanel({
  title,
  badge,
  items,
}: {
  title: string
  badge?: string
  items: AuthFeatureItem[]
}) {
  const cm = getClassMap()
  return (
    <section
      data-mol-id="auth-feature-panel"
      className={cm.cn(
        cm.sp('mt', 8),
        cm.sp('p', 5),
        'bg-surface-container-low rounded-2xl ring-1 ring-outline-variant/40',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
          cm.sp('pb', 3),
          'border-b border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{title}</h2>
        {badge ? (
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest rounded-full px-2.5 py-0.5 bg-surface-container text-primary',
            )}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), cm.sp('mt', 4))}>
        {items.map((item) => (
          <li key={item.title} className={cm.flex({ align: 'start', gap: 'md' })}>
            {item.step ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 text-sm font-bold tabular-nums',
                )}
                aria-hidden="true"
              >
                {item.step}
              </span>
            ) : (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(9),
                  cm.h(9),
                  'shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
              </span>
            )}
            <div className="min-w-0">
              <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{item.title}</h3>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
