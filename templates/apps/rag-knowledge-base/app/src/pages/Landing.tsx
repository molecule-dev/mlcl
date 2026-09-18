import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE, BRAND_GRADIENT } from '../branding.js'
import { PublicTopNav } from '../components/PublicTopNav.js'

const FEATURES = [
  {
    key: 'semantic',
    defaultTitle: 'Semantic search, not keyword search',
    defaultBody:
      'Embeddings-powered retrieval understands intent. Ask in plain language; get the relevant chunks even if the words don\u2019t match.',
    icon: 'manage_search',
    tint: 'text-primary',
  },
  {
    key: 'cited',
    defaultTitle: 'Every answer cites its sources',
    defaultBody:
      'Inline citation chips link back to the exact paragraph. Hover to preview, click to open. No more hand-checking the AI.',
    icon: 'format_quote',
    // secondary cyan #06b6d4 was 2.42:1 on white (axe serious, needs 3:1 at 24px);
    // secondary-hover is the app's own darker cyan (#0891b2 = 3.68:1)
    tint: 'text-secondary-hover',
  },
  {
    key: 'connectors',
    defaultTitle: 'Sync from where work happens',
    defaultBody:
      'Notion, Google Drive, Confluence, Slack, GitHub, web crawlers, plus drag-and-drop uploads. {{appName}} keeps the index fresh.',
    icon: 'cable',
    tint: 'text-tertiary',
  },
  {
    key: 'graph',
    defaultTitle: 'See how knowledge connects',
    defaultBody:
      'A live semantic graph shows which docs reinforce each other, which are orphaned, and where the gaps are.',
    icon: 'hub',
    tint: 'text-info',
  },
] as const

const PROOF_POINTS = [
  { key: 'docs', defaultLabel: 'Docs indexed', defaultValue: '4.8M+' },
  { key: 'recall', defaultLabel: 'Top-1 recall', defaultValue: '94.6%' },
  { key: 'latency', defaultLabel: 'P50 latency', defaultValue: '380ms' },
] as const

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicTopNav />

      <main>
        <section className={cm.cn('relative overflow-hidden')}>
          <div
            className={cm.cn(
              'absolute inset-0 bg-gradient-to-br from-primary-container/30 via-surface to-surface pointer-events-none',
            )}
            aria-hidden="true"
          />
          <div
            className={cm.cn(
              cm.maxW('7xl'),
              cm.mxAuto,
              cm.sp('px', 6),
              'py-20 md:py-28 lg:py-32 relative',
            )}
          >
            <div className={cm.cn('grid grid-cols-1 lg:grid-cols-12 gap-12 items-center')}>
              <div className={cm.cn('lg:col-span-7')}>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.sp('mb', 4),
                    'font-bold uppercase tracking-widest text-primary',
                  )}
                >
                  {t(
                    'landing.eyebrow',
                    {},
                    { defaultValue: 'Retrieval \u00b7 Embeddings \u00b7 Cited Q&A' },
                  )}
                </p>
                <h1
                  className={cm.cn(
                    cm.sp('mb', 6),
                    'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[0.95]',
                  )}
                >
                  {t(
                    'landing.heroTitle',
                    { tagline: APP_TAGLINE },
                    { defaultValue: '{{tagline}}' },
                  )}
                </h1>
                <p
                  className={cm.cn(
                    cm.textSize('lg'),
                    cm.sp('mb', 10),
                    'text-on-surface-variant max-w-xl leading-relaxed',
                  )}
                >
                  {t(
                    'landing.heroSubtitle',
                    { appName: APP_NAME },
                    {
                      defaultValue:
                        '{{appName}} indexes your docs, wikis, and chat logs into a semantic memory. Ask anything in plain English; get an answer with citations linked back to the exact paragraph.',
                    },
                  )}
                </p>
                <div className={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
                  <Link
                    to="/signup"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      'font-semibold rounded-full text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-md shadow-primary/30',
                    )}
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
                    <span
                      className={cm.cn('material-symbols-outlined text-base')}
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className={cm.cn(
                      cm.sp('px', 8),
                      cm.sp('py', 4),
                      cm.fontWeight('semibold'),
                      'rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors',
                    )}
                  >
                    {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                  </Link>
                </div>

                <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'lg' }), cm.sp('mt', 12))}>
                  {PROOF_POINTS.map((p) => (
                    <div key={p.key} className={cm.cn(cm.flex({ direction: 'col' }))}>
                      <span
                        className={cm.cn(
                          cm.textSize('2xl'),
                          'font-extrabold tracking-tight text-primary tabular-nums',
                        )}
                      >
                        {t(`landing.proof.${p.key}.value`, {}, { defaultValue: p.defaultValue })}
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'uppercase tracking-widest text-on-surface-variant font-semibold',
                        )}
                        style={{ fontSize: 10 }}
                      >
                        {t(`landing.proof.${p.key}.label`, {}, { defaultValue: p.defaultLabel })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={cm.cn('lg:col-span-5')}>
                <div
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between' }),
                    cm.sp('p', 8),
                    'min-h-[360px] rounded-[2rem] text-white relative overflow-hidden shadow-2xl shadow-primary/20',
                  )}
                  style={{ background: BRAND_GRADIENT }}
                >
                  <div className={cm.cn('relative z-10')}>
                    <p
                      className={cm.cn(
                        'font-bold text-xs uppercase tracking-widest text-white/80 mb-2',
                      )}
                    >
                      {t('landing.sampleCardLabel', {}, { defaultValue: 'Today \u00b7 Q&A' })}
                    </p>
                    <p className={cm.cn(cm.textSize('lg'), cm.sp('mb', 4), 'font-bold')}>
                      {t(
                        'landing.sampleQuestion',
                        {},
                        {
                          defaultValue:
                            '\u201cWhat\u2019s our refund policy for annual customers?\u201d',
                        },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'text-white/85 leading-relaxed')}>
                      {t(
                        'landing.sampleAnswer',
                        {},
                        {
                          defaultValue:
                            'Annual plans are eligible for a prorated refund within 30 days, per the Refund Policy section of the customer agreement',
                        },
                      )}
                      <span
                        className={cm.cn(
                          'inline-flex items-center justify-center rounded-full font-bold tabular-nums ml-1.5',
                        )}
                        style={{
                          background: 'color-mix(in srgb, white 25%, transparent)',
                          color: 'var(--color-bg-card)',
                          minWidth: 20,
                          height: 18,
                          fontSize: 11,
                          padding: '0 6px',
                        }}
                      >
                        1
                      </span>
                      <span
                        className={cm.cn(
                          'inline-flex items-center justify-center rounded-full font-bold tabular-nums ml-1',
                        )}
                        style={{
                          background: 'color-mix(in srgb, white 25%, transparent)',
                          color: 'var(--color-bg-card)',
                          minWidth: 20,
                          height: 18,
                          fontSize: 11,
                          padding: '0 6px',
                        }}
                      >
                        2
                      </span>
                      .
                    </p>
                  </div>
                  <div
                    className={cm.cn(
                      'relative z-10 mt-6 flex flex-col gap-2 border-t border-surface/20 pt-4',
                    )}
                  >
                    <p
                      className={cm.cn(
                        'text-[10px] uppercase tracking-widest text-white/70 font-bold',
                      )}
                    >
                      {t('landing.sampleSourcesLabel', {}, { defaultValue: 'Sources' })}
                    </p>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'inline-flex items-center justify-center rounded-full font-bold tabular-nums shrink-0',
                        )}
                        style={{
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary-dark)',
                          minWidth: 22,
                          height: 22,
                          fontSize: 11,
                          padding: '0 7px',
                        }}
                      >
                        1
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-white/90 truncate')}>
                        customer-agreement.pdf · §3.2
                      </span>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'rounded-full font-semibold tabular-nums ml-auto',
                        )}
                        style={{
                          background: 'var(--color-success)',
                          // dark-on-green: success-light was 2.2:1 on the chip (axe serious)
                          color: '#052e16',
                          fontSize: 11,
                          padding: '2px 8px',
                        }}
                      >
                        96%
                      </span>
                    </div>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <span
                        className={cm.cn(
                          'inline-flex items-center justify-center rounded-full font-bold tabular-nums shrink-0',
                        )}
                        style={{
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary-dark)',
                          minWidth: 22,
                          height: 22,
                          fontSize: 11,
                          padding: '0 7px',
                        }}
                      >
                        2
                      </span>
                      <span className={cm.cn(cm.textSize('xs'), 'text-white/90 truncate')}>
                        refund-policy.md · line 14
                      </span>
                      <span
                        className={cm.cn(
                          cm.flex({ align: 'center', gap: 'xs' }),
                          'rounded-full font-semibold tabular-nums ml-auto',
                        )}
                        style={{
                          background: 'var(--color-accent)',
                          // dark-on-gold: accent-hover was 1.4:1 on the chip (axe serious)
                          color: '#3a2a00',
                          fontSize: 11,
                          padding: '2px 8px',
                        }}
                      >
                        74%
                      </span>
                    </div>
                  </div>
                  <div
                    className={cm.cn(
                      'absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-surface/10 blur-3xl',
                    )}
                  />
                  <div
                    className={cm.cn(
                      'absolute right-8 top-8 w-16 h-16 rounded-full bg-surface/15 blur-xl',
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-20')}>
          <h2
            className={cm.cn(
              cm.sp('mb', 12),
              cm.textCenter,
              'text-3xl md:text-4xl font-extrabold tracking-tight',
            )}
          >
            {t('landing.featuresHeading', {}, { defaultValue: 'Knowledge that explains itself' })}
          </h2>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4')}
          >
            {FEATURES.map((f) => (
              <div
                key={f.key}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:shadow-2xl hover:shadow-primary/10 transition-all group',
                )}
              >
                <div
                  className={cm.cn(
                    cm.sp('p', 3),
                    'inline-flex bg-surface rounded-xl shadow-sm group-hover:scale-110 transition-transform',
                    f.tint,
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-3xl')} aria-hidden="true">
                    {f.icon}
                  </span>
                </div>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.sp('mt', 5), cm.sp('mb', 2), 'font-bold')}
                >
                  {t(`landing.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    `landing.feature.${f.key}.body`,
                    { appName: APP_NAME },
                    { defaultValue: f.defaultBody },
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={cm.cn('border-t border-outline-variant/40')}>
          <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 text-center')}>
            <h3
              className={cm.cn(cm.textSize('3xl'), cm.sp('mb', 4), 'font-extrabold tracking-tight')}
            >
              {t('landing.ctaHeading', {}, { defaultValue: 'Stop searching. Start recalling.' })}
            </h3>
            <p
              className={cm.cn(
                cm.textSize('base'),
                cm.sp('mb', 8),
                'text-on-surface-variant max-w-xl mx-auto',
              )}
            >
              {t(
                'landing.ctaBody',
                {},
                {
                  defaultValue:
                    '14-day trial. No credit card. Connects to Notion, Drive, Confluence, Slack, and GitHub in under 5 minutes.',
                },
              )}
            </p>
            <Link
              to="/signup"
              className={cm.cn(
                cm.sp('px', 10),
                cm.sp('py', 4),
                'font-semibold rounded-full text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-md shadow-primary/30',
              )}
              style={{ background: BRAND_GRADIENT }}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer
        className={cm.cn(
          cm.sp('py', 8),
          cm.textCenter,
          cm.textSize('sm'),
          'bg-surface text-on-surface-variant border-t border-outline-variant',
        )}
      >
        <p>
          {t(
            'landing.copyright',
            { year: new Date().getFullYear(), app: APP_NAME },
            { defaultValue: '\u00a9 {{year}} {{app}}. Built for teams that cite their work.' },
          )}
        </p>
      </footer>
    </div>
  )
}
