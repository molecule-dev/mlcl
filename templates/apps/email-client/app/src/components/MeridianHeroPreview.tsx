import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from './BrandWordmark.js'

/**
 * Decorative 3-pane Meridian inbox mockup for the Landing hero. Shows
 * what the auth'd inbox feels like — same brand gradient header chip,
 * thread rail, and selected reading pane in miniature. Pure visual; no
 * interactivity, no data props.
 *
 * Translated from personal-finance's NetWorthCard sample card overlay
 * pattern — same "what the app looks like inside" idea.
 */
export function MeridianHeroPreview() {
  const cm = getClassMap()

  return (
    <div className="relative" aria-hidden="true">
      {/* Gradient blob halo behind the mockup window. */}
      <div
        className={cm.cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-lg',
          'bg-gradient-to-tr from-primary/20 to-secondary/20 blur-3xl rounded-full',
        )}
      />
      <div
        className={cm.cn(
          cm.flex({ direction: 'col' }),
          'relative z-10 h-[500px] rounded-xl bg-surface border border-outline-variant/40 shadow-2xl overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('px', 4),
            'h-12 border-b border-outline-variant/40 bg-surface-container-lowest relative',
          )}
        >
          <BrandWordmark as="span" size="sm" />
          <div
            className={cm.cn(
              cm.flex({ align: 'center' }),
              cm.sp('px', 3),
              'h-6 w-40 rounded-full bg-surface-container text-[10px] text-on-surface-variant',
            )}
          >
            Search mail
          </div>
          <span
            className={cm.cn(
              cm.w(6),
              cm.h(6),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              'text-[10px] rounded-full bg-primary-100 text-primary-700',
            )}
          >
            MC
          </span>
        </div>

        <div className={cm.cn(cm.flex({}), cm.flex1, 'overflow-hidden relative')}>
          {/* Sidebar */}
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'xs' }),
              cm.sp('p', 3),
              cm.textSize('xs'),
              'w-44 border-r border-outline-variant/40 bg-surface-container-lowest',
            )}
          >
            <div
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 2),
                cm.sp('mb', 3),
                cm.fontWeight('semibold'),
                cm.textCenter,
                'rounded-xl bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20',
              )}
            >
              Compose
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                cm.sp('px', 3),
                cm.fontWeight('semibold'),
                'py-1.5 rounded-lg bg-primary/10 text-primary-dark',
              )}
            >
              <span
                className={cm.cn('material-symbols-outlined text-base')}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                inbox
              </span>
              <span className={cm.flex1}>Inbox</span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'bg-primary text-white px-1.5 py-0.5 rounded-full text-[9px]',
                )}
              >
                12
              </span>
            </div>
            {['Starred', 'Drafts', 'Sent', 'Snoozed', 'Archive'].map((f) => (
              <div
                key={f}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'sm' }),
                  cm.sp('px', 3),
                  'py-1.5 rounded-lg text-on-surface-variant',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-base')}>
                  {f === 'Starred'
                    ? 'star'
                    : f === 'Drafts'
                      ? 'drafts'
                      : f === 'Sent'
                        ? 'send'
                        : f === 'Snoozed'
                          ? 'schedule'
                          : 'archive'}
                </span>
                <span>{f}</span>
              </div>
            ))}
            <div
              className={cm.cn(
                cm.sp('mt', 4),
                cm.sp('pt', 3),
                'border-t border-outline-variant/40',
              )}
            >
              <div
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.sp('mb', 2),
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-widest text-on-surface-variant',
                )}
              >
                Labels
              </div>
              {[
                { n: 'Work', c: 'bg-primary' },
                { n: 'Travel', c: 'bg-success' },
                { n: 'Receipts', c: 'bg-warning' },
              ].map((l) => (
                <div
                  key={l.n}
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'sm' }),
                    cm.sp('px', 3),
                    'py-1 text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, l.c)} />
                  <span>{l.n}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Thread list */}
          <div
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              'w-56 border-r border-outline-variant/40',
            )}
          >
            <div
              className={cm.cn(
                cm.sp('p', 2),
                'border-b border-outline-variant/40 bg-thread-active relative',
              )}
            >
              <span className={cm.cn('absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r')} />
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }), 'mb-0.5')}>
                <span
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'text-on-surface')}
                >
                  Sarah Jenkins
                </span>
                <span className={cm.cn(cm.fontWeight('bold'), 'text-[10px] text-primary')}>
                  10:42
                </span>
              </div>
              <div
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'text-on-surface truncate',
                )}
              >
                Q3 Roadmap Review
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'text-[10px] text-on-surface-variant truncate',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[12px]')}>attach_file</span>
                Updated metrics + slide deck
              </div>
              <div className={cm.cn(cm.sp('mt', 1), 'inline-flex')}>
                <span
                  className={cm.cn(
                    cm.fontWeight('bold'),
                    'px-1.5 py-0.5 rounded-full bg-error-light text-error text-[9px] uppercase tracking-wider',
                  )}
                >
                  Urgent
                </span>
              </div>
            </div>
            {[
              {
                s: 'Alex Rivera',
                sub: 'Design system updates',
                t: '9:14',
                c: 'bg-secondary/10 text-secondary',
              },
              {
                s: 'GitHub',
                sub: '[meridian-ui] PR #42',
                t: 'Mon',
                c: 'bg-success-light text-success',
              },
              {
                s: 'Jamie Park',
                sub: 'Lunch next week?',
                t: 'Sun',
                c: 'bg-warning-light text-warning',
              },
              {
                s: 'Stripe',
                sub: 'Receipt for invoice 8842',
                t: 'Sep 9',
                c: 'bg-primary/10 text-primary-dark',
              },
            ].map((r) => (
              <div
                key={r.s}
                className={cm.cn(
                  cm.flex({ align: 'start', gap: 'sm' }),
                  cm.sp('p', 2),
                  'border-b border-outline-variant/40',
                )}
              >
                <span
                  className={cm.cn(
                    cm.w(7),
                    cm.h(7),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'text-[10px] shrink-0',
                    r.c,
                  )}
                >
                  {r.s.slice(0, 2).toUpperCase()}
                </span>
                <div className={cm.cn(cm.flex1, 'min-w-0')}>
                  <div className={cm.cn(cm.flex({ align: 'center', justify: 'between' }))}>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'text-on-surface truncate',
                      )}
                    >
                      {r.s}
                    </span>
                    <span className={cm.cn('text-[10px] text-on-surface-variant')}>{r.t}</span>
                  </div>
                  <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                    {r.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reading pane */}
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', gap: 'sm' }),
              cm.flex1,
              cm.sp('p', 5),
              'bg-surface overflow-hidden',
            )}
          >
            <h3
              className={cm.cn(
                cm.textSize('base'),
                cm.fontWeight('bold'),
                'text-on-surface leading-tight',
              )}
            >
              Q3 Roadmap Review — needs your sign-off by Thursday
            </h3>
            <div className={cm.cn(cm.flex({ gap: 'xs' }))}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'px-2 py-0.5 rounded-full bg-error-light text-error text-[9px] uppercase tracking-wider',
                )}
              >
                Urgent
              </span>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'px-2 py-0.5 rounded-full bg-primary/10 text-primary-dark text-[9px] uppercase tracking-wider',
                )}
              >
                Work
              </span>
            </div>
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 1))}>
              <span
                className={cm.cn(
                  cm.w(8),
                  cm.h(8),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  cm.fontWeight('bold'),
                  'text-[10px] bg-gradient-to-br from-primary to-secondary text-white',
                )}
              >
                SJ
              </span>
              <div>
                <div
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'text-on-surface')}
                >
                  Sarah Jenkins
                </div>
                <div className={cm.cn('text-[10px] text-on-surface-variant')}>
                  to me, design-team
                </div>
              </div>
            </div>
            <div
              className={cm.cn(
                cm.textSize('xs'),
                cm.sp('mt', 1),
                'text-on-surface leading-relaxed space-y-2',
              )}
            >
              <p>Hi team,</p>
              <p>
                I&apos;ve attached the latest draft of the Q3 roadmap with the new metrics from
                analytics. The numbers are stronger than expected — we&apos;re up 12% YoY, not 8%.
              </p>
              <p>
                Action items pinned in the action box below. Quick 15-min huddle at 1pm to sync
                who&apos;s tackling what.
              </p>
            </div>
            <div
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('mt', 1),
                'rounded-xl border border-primary/30 bg-primary/5 py-2',
              )}
            >
              <div
                className={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 1),
                  'text-[10px] uppercase tracking-widest text-primary',
                )}
              >
                Action items
              </div>
              <ul
                className={cm.cn(
                  cm.textSize('xs'),
                  'text-on-surface space-y-0.5 list-disc list-inside',
                )}
              >
                <li>Update slide 14 with new analytics</li>
                <li>Send revised deck by 4 PM PST</li>
              </ul>
            </div>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'mt-auto')}>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.fontWeight('semibold'),
                  cm.textSize('xs'),
                  'py-1.5 rounded-lg bg-gradient-to-br from-primary to-secondary text-white shadow-md shadow-primary/20',
                )}
              >
                Reply
              </span>
              <span
                className={cm.cn(
                  cm.sp('px', 3),
                  cm.fontWeight('medium'),
                  cm.textSize('xs'),
                  'py-1.5 rounded-lg bg-surface-container text-on-surface',
                )}
              >
                Forward
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
