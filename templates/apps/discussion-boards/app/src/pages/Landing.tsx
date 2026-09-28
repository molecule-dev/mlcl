import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { CategoryCard } from '../components/CategoryCard.js'
import { Footer } from '../components/Footer.js'
import { ThemeToggle } from '../components/ThemeToggle.js'
import { ThreadRow } from '../components/ThreadRow.js'

const SAMPLE_CATEGORIES = [
  {
    slug: 'philosophy',
    name: 'Philosophy & Ethics',
    description:
      'Long-running threads on the examined life — Stoicism, virtue ethics, applied logic.',
    icon: 'menu_book',
    color: 'var(--mol-color-primary)',
    threadCount: 1428,
    postCount: 18432,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    lastThreadTitle: 'Is "the obstacle is the way" actually Stoic? — A close reading',
    status: 'live' as const,
  },
  {
    slug: 'product-craft',
    name: 'Product Craft',
    description:
      'Working on something? Share, critique, learn. PRDs, post-mortems, design reviews.',
    icon: 'design_services',
    color: 'var(--mol-color-secondary)',
    threadCount: 962,
    postCount: 11204,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    lastThreadTitle: 'Shipping a v1 with two-thirds the features — postmortem from a small team',
    status: 'pinned' as const,
  },
  {
    slug: 'community',
    name: 'Community Hall',
    description:
      'Introductions, weekly threads, town halls. Lower-stakes, higher-warmth conversations.',
    icon: 'forum',
    color: 'var(--mol-color-success)',
    threadCount: 504,
    postCount: 6890,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastThreadTitle: 'Weekly check-in — what are you reading this week?',
    status: 'live' as const,
  },
]

const SAMPLE_THREADS = [
  {
    id: 't1',
    title: 'A practical taxonomy of moderation tools that respect dissent',
    excerpt:
      'After moderating four communities for a decade, here is the framework I keep coming back to — gradients of restraint, not deletion as default.',
    author: { username: 'helena.k', reputation: 4820 },
    category: { name: 'Community Hall', slug: 'community', color: 'var(--mol-color-success)' },
    replyCount: 184,
    viewCount: 22400,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    statuses: ['pinned' as const, 'hot' as const],
    votes: 412,
    isModeratorAuthor: true,
  },
  {
    id: 't2',
    title: 'Markdown is dead. Long live markdown — the case for a plainer common syntax',
    excerpt:
      'Why I stopped fighting the standardization wars and started writing the simplest doc I can pass to anyone.',
    author: { username: 'arch.r', reputation: 1240 },
    category: { name: 'Product Craft', slug: 'product-craft', color: 'var(--mol-color-secondary)' },
    replyCount: 92,
    viewCount: 9300,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    statuses: ['hot' as const],
    votes: 318,
  },
  {
    id: 't3',
    title: 'Closed: please move further conversation to the new threading guide',
    excerpt:
      'This thread reached its useful conclusion in week four. Linking out to the new master thread for ongoing discussion.',
    author: { username: 'mia.v', reputation: 2780 },
    category: {
      name: 'Philosophy & Ethics',
      slug: 'philosophy',
      color: 'var(--mol-color-primary)',
    },
    replyCount: 56,
    viewCount: 4012,
    lastActivityAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    statuses: ['locked' as const, 'resolved' as const],
    votes: 145,
  },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), 'min-h-screen bg-background')}>
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 6),
          cm.sp('py', 4),
          'sticky top-0 z-30 backdrop-blur-md bg-surface/80 border-b border-outline-variant/30',
        )}
      >
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            aria-hidden
            className={cm.cn(
              cm.w(8),
              cm.h(8),
              cm.flex({ align: 'center', justify: 'center' }),
              cm.fontWeight('bold'),
              cm.roundedFull,
              'bg-gradient-to-br from-primary to-secondary text-white text-sm shadow-md shadow-primary/30',
            )}
          >
            S
          </span>
          <span
            className={cm.cn(
              cm.textSize('lg'),
              cm.fontWeight('bold'),
              'text-on-surface tracking-tight',
            )}
          >
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'md' }))}>
          <a
            href="#categories"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.browse', {}, { defaultValue: 'Browse' })}
          </a>
          <a
            href="#values"
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
            )}
          >
            {t('landing.nav.values', { appName: APP_NAME }, { defaultValue: 'Why {{appName}}' })}
          </a>
          <ThemeToggle />
          {isAuthenticated ? (
            <Link
              to="/c"
              className={cm.cn(
                cm.sp('px', 4),
                cm.sp('py', 2),
                cm.fontWeight('medium'),
                cm.textSize('sm'),
                'rounded-lg bg-primary text-on-primary hover:bg-primary-dark transition-colors',
              )}
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'hidden md:inline text-on-surface-variant hover:text-primary transition-colors',
                )}
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.fontWeight('medium'),
                  cm.textSize('sm'),
                  'rounded-lg bg-primary text-on-primary hover:bg-primary-dark transition-colors',
                )}
              >
                {t('landing.nav.joinFree', {}, { defaultValue: 'Join free' })}
              </Link>
            </>
          )}
        </nav>
      </header>

      <main
        className={cm.cn(
          cm.flex1,
          cm.stack(16),
          cm.sp('px', 6),
          cm.sp('py', 12),
          'mx-auto w-full max-w-[1200px]',
        )}
      >
        <section
          className={cm.cn(cm.grid({ cols: 1, gap: 'lg' }), 'lg:grid-cols-12 items-stretch')}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', justify: 'center', gap: 'md' }),
              'lg:col-span-7',
            )}
          >
            <span
              className={cm.cn(
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.fontWeight('bold'),
                cm.roundedFull,
                'self-start text-[10px] uppercase tracking-[0.3em] bg-primary/10 text-primary border border-primary/15',
              )}
            >
              {t(
                'landing.hero.eyebrow',
                {},
                { defaultValue: 'A modern forum, classically inspired' },
              )}
            </span>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight text-on-surface',
              )}
            >
              {t('landing.hero.title', {}, { defaultValue: 'Where ideas' })}{' '}
              <span className="relative inline-block">
                <span className="relative z-10">
                  {t('landing.hero.titleHighlight', {}, { defaultValue: 'converge' })}
                </span>
                <span
                  aria-hidden
                  className={cm.cn('absolute bottom-2 left-0 w-full h-3 bg-secondary/30 -z-10')}
                />
              </span>
            </h1>
            <p
              className={cm.cn(
                cm.textSize('xl'),
                cm.maxW('lg'),
                'text-on-surface-variant leading-relaxed',
              )}
            >
              {t(
                'landing.hero.subtitle',
                {},
                {
                  defaultValue:
                    'A modern home for threaded conversations, reputation, and meaningful debate.',
                },
              )}
            </p>
            <div className={cm.cn(cm.flex({ gap: 'sm' }), 'flex-wrap')}>
              <Link
                to="/signup"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'inline-flex items-center gap-2 rounded-lg bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/25',
                )}
              >
                {t('landing.hero.primaryCta', {}, { defaultValue: 'Start a community' })}
                <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                  arrow_forward
                </span>
              </Link>
              <a
                href="#categories"
                className={cm.cn(
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.fontWeight('medium'),
                  'inline-flex items-center gap-2 rounded-lg text-primary hover:bg-primary-light transition-colors',
                )}
              >
                {t('landing.hero.secondaryCta', {}, { defaultValue: 'See it in action' })}
              </a>
            </div>
            <div className={cm.cn(cm.flex({ gap: 'lg' }), 'flex-wrap text-on-surface-variant')}>
              {[
                {
                  value: '12k',
                  labelKey: 'landing.hero.stat.communities',
                  defaultLabel: 'Communities',
                },
                {
                  value: '4.2M',
                  labelKey: 'landing.hero.stat.posts',
                  defaultLabel: 'Posts written',
                },
                {
                  value: '93%',
                  labelKey: 'landing.hero.stat.solveRate',
                  defaultLabel: 'Threads resolved',
                },
              ].map((stat) => (
                <div key={stat.labelKey}>
                  <p
                    className={cm.cn(
                      cm.textSize('2xl'),
                      cm.fontWeight('bold'),
                      'text-on-surface tabular-nums',
                    )}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                      'uppercase tracking-widest text-on-surface-variant',
                    )}
                  >
                    {t(stat.labelKey, {}, { defaultValue: stat.defaultLabel })}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className={cm.cn('relative lg:col-span-5')}>
            {/* Blurred brand halo behind the mock thread card. */}
            <div
              aria-hidden
              className={cm.cn(
                'absolute -inset-4 bg-gradient-to-tr from-primary/10 to-transparent rounded-2xl blur-2xl',
              )}
            />
            {/* Mock thread card — the "strongest argument surfaces" moment. */}
            <article
              className={cm.cn(
                cm.stack(6),
                cm.sp('p', 8),
                'relative overflow-hidden rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-[0_12px_32px_rgba(26,28,31,0.06)]',
              )}
            >
              {/* Column motif — vertical pinstripes along the right edge. */}
              <div
                aria-hidden
                className={cm.cn('absolute right-0 top-0 bottom-0 w-32 pointer-events-none')}
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(90deg, transparent 0, transparent 19px, color-mix(in srgb, var(--color-on-surface) 5%, transparent) 19px, color-mix(in srgb, var(--color-on-surface) 5%, transparent) 20px)',
                }}
              />
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'relative z-10')}>
                <span
                  aria-hidden
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    cm.fontWeight('bold'),
                    'bg-gradient-to-br from-primary to-secondary text-white text-sm',
                  )}
                >
                  A
                </span>
                <div className={cm.cn(cm.stack(0.5))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                      {t('landing.heroCard.author', {}, { defaultValue: 'Aurelius' })}
                    </span>
                    <span
                      className={cm.cn(
                        'bg-secondary/10 text-secondary text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full',
                      )}
                    >
                      {t('landing.heroCard.trusted', {}, { defaultValue: 'Trusted' })}
                    </span>
                  </div>
                  <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                    {t('landing.heroCard.time', {}, { defaultValue: '2 hours ago' })}
                  </span>
                </div>
              </div>
              <div className={cm.cn('relative z-10')}>
                <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }), cm.sp('mb', 3))}>
                  <span
                    className={cm.cn(
                      'bg-primary/10 text-primary text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full',
                    )}
                  >
                    {t('landing.heroCard.pinned', {}, { defaultValue: 'Pinned' })}
                  </span>
                  <h3
                    className={cm.cn(
                      cm.textSize('xl'),
                      cm.fontWeight('bold'),
                      'tracking-tight text-on-surface',
                    )}
                  >
                    {t(
                      'landing.heroCard.threadTitle',
                      {},
                      { defaultValue: 'The Architecture of Discourse' },
                    )}
                  </h3>
                </div>
                <p
                  className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}
                  style={{ fontFamily: 'var(--mol-font-serif, Georgia, serif)' }}
                >
                  {t(
                    'landing.heroCard.excerpt',
                    {},
                    {
                      defaultValue:
                        "True moderation isn't about silencing voices; it's about curating an environment where the strongest arguments surface naturally through consensus and structural integrity.",
                    },
                  )}
                </p>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'lg' }),
                  cm.sp('pt', 4),
                  'mt-2 border-t border-outline-variant/40 relative z-10',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden>
                    thumb_up
                  </span>
                  342
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden>
                    chat_bubble
                  </span>
                  89
                </span>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 2 }),
                    'ml-auto text-on-surface-variant',
                  )}
                >
                  <span className={cm.cn('material-symbols-outlined text-lg')} aria-hidden>
                    bookmark
                  </span>
                </span>
              </div>
            </article>
          </div>
        </section>

        <section id="categories" className={cm.cn(cm.stack(6))}>
          <div
            className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
          >
            <div className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-[0.3em] text-primary',
                )}
              >
                {t('landing.categories.eyebrow', {}, { defaultValue: 'Browse the agora' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.categories.title',
                  {},
                  { defaultValue: 'Where the long conversations live.' },
                )}
              </h2>
            </div>
            <p className={cm.cn(cm.textSize('sm'), cm.maxW('md'), 'text-on-surface-variant')}>
              {t(
                'landing.categories.subtitle',
                {},
                {
                  defaultValue:
                    'Each category has its own moderators, etiquette, and pace. Posts inherit the category color across the experience.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-2 xl:grid-cols-3')}>
            {SAMPLE_CATEGORIES.map((c) => (
              <CategoryCard key={c.slug} {...c} />
            ))}
          </div>
        </section>

        <section className={cm.cn(cm.stack(6))}>
          <div
            className={cm.cn(cm.flex({ align: 'end', justify: 'between', gap: 'md' }), 'flex-wrap')}
          >
            <div className={cm.stack(2)}>
              <span
                className={cm.cn(
                  cm.fontWeight('bold'),
                  'text-[10px] uppercase tracking-[0.3em] text-primary',
                )}
              >
                {t('landing.threads.eyebrow', {}, { defaultValue: 'Trending today' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('3xl'),
                  cm.fontWeight('bold'),
                  'tracking-tight text-on-surface',
                )}
              >
                {t(
                  'landing.threads.title',
                  {},
                  { defaultValue: 'Threads moving fastest right now.' },
                )}
              </h2>
            </div>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('bold'),
                'text-primary hover:text-primary-dark inline-flex items-center gap-1',
              )}
            >
              {t('landing.threads.viewAll', {}, { defaultValue: 'See the full agora' })}
              <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
                arrow_forward
              </span>
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.stack(0),
              'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 overflow-hidden',
            )}
          >
            {SAMPLE_THREADS.map((thread) => (
              <ThreadRow key={thread.id} {...thread} />
            ))}
          </div>
        </section>

        <section id="values" className={cm.cn(cm.grid({ cols: 1, gap: 'md' }), 'md:grid-cols-3')}>
          {[
            {
              icon: 'shield',
              titleKey: 'landing.values.moderation.title',
              defaultTitle: 'Considered moderation',
              bodyKey: 'landing.values.moderation.body',
              defaultBody:
                'Restraint over deletion. Mute, lock, hide, ban — every escalation logs an audit trail your community can review.',
            },
            {
              icon: 'menu_book',
              titleKey: 'landing.values.markdown.title',
              defaultTitle: 'Markdown that ages',
              defaultBody:
                'Posts render in Georgia for the long-form rhythm of book criticism. Code, quotes, and footnotes are first class.',
              bodyKey: 'landing.values.markdown.body',
            },
            {
              icon: 'military_tech',
              titleKey: 'landing.values.reputation.title',
              defaultTitle: 'Reputation that compounds',
              defaultBody:
                'Newcomer to Elder, your tier is earned over time across threads. Trust unlocks pinning, drafts, and DMs.',
              bodyKey: 'landing.values.reputation.body',
            },
          ].map((v) => (
            <article
              key={v.titleKey}
              className={cm.cn(
                cm.sp('p', 6),
                cm.stack(3),
                'rounded-2xl bg-surface-container-lowest border border-outline-variant/30 hover:-translate-y-0.5 transition-transform',
              )}
            >
              <div
                className={cm.cn(
                  cm.w(12),
                  cm.h(12),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  'bg-primary/10 text-primary',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden>
                  {v.icon}
                </span>
              </div>
              <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'text-on-surface')}>
                {t(v.titleKey, {}, { defaultValue: v.defaultTitle })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                {t(v.bodyKey, {}, { defaultValue: v.defaultBody })}
              </p>
            </article>
          ))}
        </section>

        <section
          className={cm.cn(
            cm.sp('p', 10),
            cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
            cm.textCenter,
            'rounded-[2rem] bg-gradient-to-br from-primary/10 via-surface to-secondary/10 border border-primary/15',
          )}
        >
          <h2
            className={cm.cn(
              cm.textSize('3xl'),
              cm.fontWeight('bold'),
              'tracking-tight text-on-surface',
            )}
          >
            {t(
              'landing.cta.title',
              {},
              { defaultValue: 'Bring your community somewhere it can think.' },
            )}
          </h2>
          <p className={cm.cn(cm.textSize('base'), cm.maxW('xl'), 'text-on-surface-variant')}>
            {t(
              'landing.cta.body',
              { appName: APP_NAME },
              {
                defaultValue:
                  'Free for the first 50 members. Bring your culture, your moderators, your tone — {{appName}} just gives the structure.',
              },
            )}
          </p>
          <Link
            to="/signup"
            className={cm.cn(
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.fontWeight('medium'),
              'inline-flex items-center gap-2 rounded-lg bg-primary text-on-primary hover:bg-primary-dark transition-colors shadow-md shadow-primary/25',
            )}
          >
            {t('landing.cta.button', {}, { defaultValue: 'Claim your community' })}
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden>
              arrow_forward
            </span>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
