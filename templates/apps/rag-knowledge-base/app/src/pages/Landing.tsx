import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { LegalModalLinks } from '@molecule/app-legal-pages-react'

import { APP_NAME, APP_TAGLINE, BRAND_GRADIENT } from '../branding.js'
import { loadContent } from '../config.js'
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

const TRUST_MARKS = ['Acme Corp', 'Stark Ind.', 'Wayne Tech', 'Cyberdyne', 'Initech']

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div className={cm.cn(cm.minH('screen'), 'bg-background text-on-surface antialiased')}>
      <PublicTopNav />

      <main>
        {/* Hero — centered, search demo below the CTAs */}
        <section
          className={cm.cn(
            cm.maxW('4xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'pt-16 md:pt-24 pb-20 flex flex-col items-center text-center',
          )}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-headline tracking-tighter text-on-surface mb-6 leading-tight">
            {t('landing.heroTitle', { tagline: APP_TAGLINE }, { defaultValue: '{{tagline}}' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mb', 10),
              'text-on-surface-variant max-w-2xl leading-relaxed',
            )}
          >
            {t(
              'landing.heroSubtitle',
              {},
              {
                defaultValue:
                  'Semantic search across your entire organizational archive. Instantly retrieve deeply buried insights with pinpoint accuracy and inline source citations.',
              },
            )}
          </p>
          <div className={cm.cn(cm.flex({ justify: 'center', gap: 'md' }), 'flex-wrap mb-16')}>
            <Link
              to="/signup"
              data-mol-id="cta-start-free-trial"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-xl text-white hover:opacity-90 transition-opacity inline-flex items-center shadow-lg shadow-primary/20',
              )}
              style={{ background: BRAND_GRADIENT }}
            >
              {t('common.startFreeTrial', {}, { defaultValue: 'Start free trial' })}
            </Link>
            <Link
              to="/login"
              className={cm.cn(
                cm.sp('px', 8),
                cm.sp('py', 3),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'rounded-xl bg-transparent text-on-surface hover:bg-surface-container-high transition-colors inline-flex items-center border border-outline-variant/30',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
          </div>

          {/* Search demo panel */}
          <div
            className={cm.cn(
              cm.w('full'),
              'max-w-3xl bg-surface-container-low rounded-[24px] p-6 md:p-8 shadow-xl shadow-on-surface/5 border border-outline-variant/15 text-left relative',
            )}
            data-mol-id="search-demo"
          >
            {/* Search bar */}
            <div className="bg-surface-container-lowest h-[52px] rounded-full flex items-center px-6 mb-8 shadow-sm">
              <span
                className={cm.cn('material-symbols-outlined text-on-surface-variant mr-3')}
                aria-hidden="true"
              >
                search
              </span>
              <span className={cm.cn(cm.flex1, cm.textSize('sm'), 'text-on-surface truncate')}>
                {t(
                  'landing.demo.query',
                  {},
                  { defaultValue: 'How does the new caching layer affect API latency?' },
                )}
              </span>
              <span
                className={cm.cn(
                  'bg-surface-container px-3 py-1 rounded text-on-surface-variant font-mono text-xs font-medium ml-3 flex items-center gap-1 shrink-0',
                )}
              >
                <span>⌘</span>
                <span>K</span>
              </span>
            </div>
            {/* Results */}
            <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
              {/* Result card 1 */}
              <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/15">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 3),
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-on-surface-variant text-sm')}
                      aria-hidden="true"
                    >
                      description
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-mono text-on-surface-variant truncate',
                      )}
                    >
                      Architecture_RFC_v2.md
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      'bg-success-light text-success-text px-2 py-0.5 rounded text-[11px] font-medium tabular-nums font-mono flex items-center gap-1 shrink-0',
                    )}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-success block"
                      aria-hidden="true"
                    />
                    98%
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
                  {t(
                    'landing.demo.result1Body',
                    {},
                    {
                      defaultValue:
                        'The introduction of the Redis caching layer reduces median API latency by approximately 45ms for read-heavy endpoints. Write operations incur a slight penalty of 2-3ms for cache invalidation.',
                    },
                  )}
                </p>
                <div className={cm.cn(cm.sp('mt', 3), cm.flex({ gap: 'sm' }))}>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-on-surface bg-primary/10">
                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[10px]">
                      1
                    </span>
                    {t('landing.demo.result1Cite', {}, { defaultValue: 'Section 3.2 Performance' })}
                  </span>
                </div>
              </div>
              {/* Result card 2 */}
              <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant/15 opacity-90">
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'between' }),
                    cm.sp('mb', 3),
                  )}
                >
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
                    <span
                      className={cm.cn('material-symbols-outlined text-on-surface-variant text-sm')}
                      aria-hidden="true"
                    >
                      chat
                    </span>
                    <span
                      className={cm.cn(
                        cm.textSize('xs'),
                        'font-mono text-on-surface-variant truncate',
                      )}
                    >
                      Slack: #engineering-general
                    </span>
                  </div>
                  <span
                    className={cm.cn(
                      'bg-warning-light text-warning-text px-2 py-0.5 rounded text-[11px] font-medium tabular-nums font-mono flex items-center gap-1 shrink-0',
                    )}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-warning block"
                      aria-hidden="true"
                    />
                    82%
                  </span>
                </div>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(
                    'landing.demo.result2Body',
                    {},
                    {
                      defaultValue:
                        'Sarah Jenkins: Noticing some latency spikes on the user profile endpoint after the deployment. Mike T: Yeah, the caching layer isn\u2019t warming up fast enough. Let\u2019s adjust the TTL.',
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section
          className={cm.cn(
            cm.maxW('4xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            'pb-20 flex flex-col items-center',
          )}
        >
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('medium'),
              'text-on-surface-variant uppercase tracking-wider mb-8 text-center',
            )}
          >
            {t(
              'landing.trust.heading',
              { count: '200' },
              { defaultValue: 'Trusted by {{count}}+ engineering and research teams' },
            )}
          </p>
          <div className={cm.cn(cm.flex({ justify: 'center', wrap: 'wrap', gap: 'xl' }))}>
            {TRUST_MARKS.map((mark) => (
              <span
                key={mark}
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'text-on-surface-variant',
                )}
              >
                {mark}
              </span>
            ))}
          </div>
        </section>

        {/* Dialogue with the archive — chat + citations split */}
        <section className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('px', 6), 'pb-20')}>
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight mb-12 text-center',
            )}
          >
            {t('landing.dialogue.heading', {}, { defaultValue: 'Dialogue with the Archive' })}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-12 items-start')}>
            {/* Chat interface */}
            <div
              className={cm.cn(
                'lg:col-span-7 bg-surface-container-low rounded-xl p-6 shadow-lg shadow-on-surface/5 border border-outline-variant/15 flex flex-col',
              )}
              data-mol-id="chat-demo"
            >
              <div className={cm.cn(cm.flex1, cm.flex({ direction: 'col', gap: 'lg' }))}>
                {/* User message */}
                <div className={cm.cn(cm.flex({ justify: 'end' }))}>
                  <div className="bg-surface-container-lowest px-5 py-4 rounded-xl rounded-tr-sm shadow-sm border border-outline-variant/15 max-w-[85%]">
                    <p className={cm.cn(cm.textSize('sm'))}>
                      {t(
                        'landing.chat.question',
                        {},
                        {
                          defaultValue:
                            'Summarize the Q3 product roadmap decisions regarding the mobile app redesign.',
                        },
                      )}
                    </p>
                  </div>
                </div>
                {/* Assistant response */}
                <div className={cm.cn(cm.flex({ justify: 'start' }))}>
                  <div className="bg-primary-fixed/20 px-5 py-4 rounded-xl rounded-tl-sm shadow-sm max-w-[90%]">
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'mb-3')}>
                      <span
                        className={cm.cn('material-symbols-outlined text-primary text-sm')}
                        aria-hidden="true"
                      >
                        auto_awesome
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          cm.fontWeight('medium'),
                          'text-primary uppercase tracking-wider',
                        )}
                      >
                        {APP_NAME}
                      </span>
                    </div>
                    <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed mb-3')}>
                      {t(
                        'landing.chat.answer1',
                        {},
                        {
                          defaultValue:
                            'Based on the Q3 planning documents and related slack discussions, the mobile app redesign will focus primarily on the navigation structure and offline capabilities.',
                        },
                      )}
                    </p>
                    <p className={cm.cn(cm.textSize('sm'), 'leading-relaxed')}>
                      {t(
                        'landing.chat.answer2Lead',
                        {},
                        {
                          defaultValue:
                            'The team decided to deprioritize the dark mode implementation',
                        },
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-on-surface bg-primary/10 mx-1 align-middle">
                        <span className="w-3 h-3 rounded-full bg-primary flex items-center justify-center text-white text-[8px]">
                          1
                        </span>
                      </span>
                      {t(
                        'landing.chat.answer2Middle',
                        {},
                        { defaultValue: 'in favor of stabilizing the offline sync engine' },
                      )}
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium text-on-surface bg-primary/10 mx-1 align-middle">
                        <span className="w-3 h-3 rounded-full bg-primary flex items-center justify-center text-white text-[8px]">
                          2
                        </span>
                      </span>
                      {t(
                        'landing.chat.answer2Tail',
                        {},
                        { defaultValue: 'which was deemed critical for enterprise users.' },
                      )}
                    </p>
                  </div>
                </div>
              </div>
              {/* Input area */}
              <div
                className={cm.cn(
                  cm.sp('mt', 4),
                  'bg-surface-container-lowest rounded-xl p-2 shadow-sm border border-outline-variant/15 flex items-center',
                )}
              >
                <input
                  type="text"
                  placeholder={t(
                    'landing.chat.placeholder',
                    {},
                    { defaultValue: 'Follow up question...' },
                  )}
                  className={cm.cn(
                    cm.flex1,
                    cm.textSize('sm'),
                    'bg-transparent border-none outline-none p-3 text-on-surface placeholder:text-on-surface-variant',
                  )}
                  aria-label={t(
                    'landing.chat.placeholder',
                    {},
                    { defaultValue: 'Follow up question...' },
                  )}
                />
                <button
                  type="button"
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.flex({ align: 'center', justify: 'center' }),
                    'rounded-lg bg-surface-container text-on-surface hover:bg-surface-variant transition-colors',
                  )}
                  aria-label={t('landing.chat.send', {}, { defaultValue: 'Send' })}
                >
                  <span className={cm.cn('material-symbols-outlined text-sm')} aria-hidden="true">
                    send
                  </span>
                </button>
              </div>
            </div>

            {/* Citation panel */}
            <div
              className={cm.cn(
                'lg:col-span-5 bg-surface-container rounded-xl p-6 border border-outline-variant/15',
              )}
              data-mol-id="citation-demo"
            >
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('mb', 6),
                  'border-b border-outline-variant/40 pb-4',
                )}
              >
                <span
                  className={cm.cn('material-symbols-outlined text-on-surface-variant text-sm')}
                  aria-hidden="true"
                >
                  library_books
                </span>
                <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {t('landing.citations.heading', {}, { defaultValue: 'Source Citations' })}
                </h3>
              </div>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xl' }))}>
                {/* Source 1 */}
                <div className="relative pl-6">
                  <div
                    className="absolute left-2 top-2 bottom-0 w-px bg-outline-variant/40"
                    aria-hidden="true"
                  />
                  <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold z-10">
                    1
                  </div>
                  <div className="bg-surface-container-lowest rounded-lg p-4 shadow-sm border border-outline-variant/15">
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('mb', 2),
                        'gap-2',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono text-on-surface-variant truncate',
                        )}
                      >
                        Q3_Planning_Minutes.pdf
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono tabular-nums text-success-text bg-success-light px-2 py-0.5 rounded shrink-0',
                        )}
                      >
                        {t(
                          'landing.citations.relevance',
                          { score: '0.94' },
                          { defaultValue: 'Relevance: {{score}}' },
                        )}
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        'bg-[var(--color-code-block)] text-[var(--color-code-text)] font-mono text-xs p-3 rounded-md mt-2 leading-relaxed',
                      )}
                    >
                      {t(
                        'landing.citations.source1Quote',
                        {},
                        {
                          defaultValue:
                            '"Vote: Unanimous agreement to push Dark Mode to Q4. Engineering resources (2 FTEs) to be reallocated to the SQLite sync issues identified in last month\'s post-mortem."',
                        },
                      )}
                    </div>
                  </div>
                </div>
                {/* Source 2 */}
                <div className="relative pl-6">
                  <div
                    className="absolute left-2 top-2 bottom-0 w-px bg-outline-variant/40"
                    aria-hidden="true"
                  />
                  <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold z-10">
                    2
                  </div>
                  <div className="bg-surface-container-lowest rounded-lg p-4 shadow-sm border border-outline-variant/15">
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('mb', 2),
                        'gap-2',
                      )}
                    >
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono text-on-surface-variant truncate',
                        )}
                      >
                        Jira: ENT-4092
                      </span>
                      <span
                        className={cm.cn(
                          cm.textSize('xs'),
                          'font-mono tabular-nums text-success-text bg-success-light px-2 py-0.5 rounded shrink-0',
                        )}
                      >
                        {t(
                          'landing.citations.relevance',
                          { score: '0.88' },
                          { defaultValue: 'Relevance: {{score}}' },
                        )}
                      </span>
                    </div>
                    <div
                      className={cm.cn(
                        'bg-[var(--color-code-block)] text-[var(--color-code-text)] font-mono text-xs p-3 rounded-md mt-2 leading-relaxed',
                      )}
                    >
                      <span className="text-primary-fixed-dim">
                        {t(
                          'landing.citations.source2Status',
                          {},
                          { defaultValue: 'Status: IN PROGRESS' },
                        )}
                      </span>
                      <br />
                      <span className="text-on-surface-variant">
                        {t('landing.citations.source2Label', {}, { defaultValue: 'Description:' })}
                      </span>{' '}
                      {t(
                        'landing.citations.source2Quote',
                        {},
                        {
                          defaultValue:
                            'Refactor offline sync engine for mobile clients. Blocking enterprise rollout. Priority: CRITICAL.',
                        },
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature grid (app-specific — kept; the design covers the demo surfaces) */}
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

        {/* Final CTA */}
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
                cm.fontWeight('semibold'),
                'rounded-full text-white hover:opacity-90 transition-opacity inline-flex items-center gap-2 shadow-md shadow-primary/30',
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

      {/* Footer — light tonal surface, columns */}
      <footer
        className={cm.cn(cm.sp('py', 12), 'bg-surface-container w-full')}
        data-mol-id="landing-footer"
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.grid({ gap: 'xl' }),
            'grid-cols-2 md:grid-cols-4',
          )}
        >
          <div className="col-span-2 md:col-span-2 flex flex-col gap-2">
            <span
              className={cm.cn(
                cm.textSize('lg'),
                cm.fontWeight('bold'),
                'tracking-tighter text-primary',
              )}
            >
              {APP_NAME}
            </span>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'landing.copyright',
                { year: new Date().getFullYear(), app: APP_NAME },
                { defaultValue: '© {{year}} {{app}}' },
              )}
              {' — Built with '}
              <a
                href="https://molecule.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline font-medium"
              >
                Molecule.dev
              </a>
            </p>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
              to="/#features"
            >
              {t('nav.features', {}, { defaultValue: 'Features' })}
            </Link>
            <Link
              className={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
              to="/about"
            >
              {t('nav.about', {}, { defaultValue: 'About' })}
            </Link>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'items-start')}>
            <LegalModalLinks
              linkClassName={cm.cn(
                cm.textSize('sm'),
                'text-on-surface-variant hover:text-primary transition-colors',
              )}
              appName={APP_NAME}
              loadContent={loadContent}
              privacyLabel={t(
                'landing.footer.privacyPolicy',
                {},
                { defaultValue: 'Privacy Policy' },
              )}
              termsLabel={t(
                'landing.footer.termsOfService',
                {},
                { defaultValue: 'Terms of Service' },
              )}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
export { Landing as LandingPage }
