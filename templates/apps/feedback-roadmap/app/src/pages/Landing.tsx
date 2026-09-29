/**
 * Landing — SignalLoop public marketing home.
 *
 * Stitch design: centered hero (announcement pill, email capture, trust
 * markers) → live feature-request preview (real API posts when the board
 * has them; the design's demo cards otherwise) → public roadmap kanban →
 * velocity pillars → wall of love → dark CTA band. Signed-in visitors are
 * routed straight to the boards.
 */
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { useAuth, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { Footer } from '../components/Footer.js'
import { PostCard } from '../components/PostCard.js'
import type { ApiPost } from '../utils/posts.js'

/** Decorative demo request card — the design's live-preview grid. */
interface DemoRequest {
  votes: number
  voted?: boolean
  statusKey: string
  status: string
  statusTone: 'primary' | 'progress' | 'review' | 'shipped'
  category: string
  title: string
  body: string
  initials: string
  avatarTone: 'primary' | 'secondary' | 'variant'
  author: string
  company: string
  comments: number
}

const DEMO_REQUESTS: DemoRequest[] = [
  {
    votes: 342,
    statusKey: 'r1.status',
    status: 'In Progress: ETA Q2 2025',
    statusTone: 'progress',
    category: 'Integrations',
    title: 'Native Slack notifications for status updates',
    body: 'Deliver immediate alert mentions in private enterprise Slack channels whenever a customer-subscribed ticket shifts from Planned to Shipped.',
    initials: 'DL',
    avatarTone: 'primary',
    author: 'David Lin',
    company: 'Stripe',
    comments: 28,
  },
  {
    votes: 289,
    statusKey: 'r2.status',
    status: 'Planned: High Priority',
    statusTone: 'primary',
    category: 'Security',
    title: 'Granular role-based access control (RBAC)',
    body: 'Custom authorization matrices allowing Product Ops to view ARR weights while restricting external guests to public upvoting only.',
    initials: 'SK',
    avatarTone: 'secondary',
    author: 'Sarah Koenig',
    company: 'Vercel',
    comments: 19,
  },
  {
    votes: 214,
    statusKey: 'r3.status',
    status: 'In Review',
    statusTone: 'review',
    category: 'Reporting',
    title: 'Export feedback analytics to CSV & Snowflake',
    body: 'Scheduled pipeline syncing raw upvote logs, customer enterprise tiers, and feature request tags directly to our central data lakehouse.',
    initials: 'MR',
    avatarTone: 'variant',
    author: 'Marcus Ray',
    company: 'Datadog',
    comments: 14,
  },
  {
    votes: 198,
    voted: true,
    statusKey: 'r4.status',
    status: 'Shipped: v2.4 Released',
    statusTone: 'shipped',
    category: 'Automation',
    title: 'AI sentiment clustering on incoming tickets',
    body: 'Automatically identify duplicates across Intercom chats, Zendesk queries, and public boards to merge votes without manual triage.',
    initials: 'AJ',
    avatarTone: 'primary',
    author: 'Alex Jensen',
    company: 'Ramp',
    comments: 0,
  },
]

/** Static public-roadmap kanban — the design's accountability board. */
interface KanbanCard {
  meta: string
  weight: string
  weightTone: 'primary' | 'progress' | 'shipped'
  title: string
  body: string
  votes?: string
  foot?: string
  notesKey?: string
  notes?: string
}

interface KanbanColumn {
  key: string
  dot: string
  pulse?: boolean
  titleKey: string
  title: string
  countKey: string
  count: string
  cards: KanbanCard[]
}

const KANBAN: KanbanColumn[] = [
  {
    key: 'review',
    dot: 'var(--color-outline)',
    titleKey: 'landing.kanban.review.title',
    title: 'Under Review',
    countKey: 'landing.kanban.review.count',
    count: '8 items',
    cards: [
      {
        meta: '#ENG-1082',
        weight: '$42k ARR weight',
        weightTone: 'progress' as const,
        title: 'Custom domain CNAME for public portal',
        body: 'Allow white-label hosting under feedback.customerbrand.com with automated SSL certificates.',
        votes: '142 votes',
        foot: 'Triage in progress',
      },
      {
        meta: '#ENG-1094',
        weight: '$18k ARR weight',
        weightTone: 'progress' as const,
        title: 'SAML 2.0 / Okta enterprise identity sync',
        body: 'Auto-provision employee accounts with custom company department group mappings.',
        votes: '89 votes',
        foot: 'Spec review',
      },
    ],
  },
  {
    key: 'planned',
    dot: 'var(--color-primary)',
    pulse: true,
    titleKey: 'landing.kanban.planned.title',
    title: 'Planned & Committed',
    countKey: 'landing.kanban.planned.count',
    count: '14 items',
    cards: [
      {
        meta: 'Sprint 44',
        weight: '$120k ARR weight',
        weightTone: 'primary' as const,
        title: 'Two-way Jira Software bi-directional sync',
        body: 'Full issue state parity: when engineering closes an Epic in Jira, public status updates simultaneously.',
        votes: '465 votes',
        foot: 'Core Eng Team (4 assigned)',
      },
      {
        meta: 'Sprint 45',
        weight: '$64k ARR weight',
        weightTone: 'primary' as const,
        title: 'Customizable submission forms per category',
        body: 'Prompt users for technical log attachments when submitting API bugs, or target use-case descriptions.',
        votes: '312 votes',
        foot: 'Growth Team',
      },
    ],
  },
  {
    key: 'shipped',
    dot: 'var(--color-status-shipped)',
    titleKey: 'landing.kanban.shipped.title',
    title: 'Shipped to Production',
    countKey: 'landing.kanban.shipped.count',
    count: '47 released',
    cards: [
      {
        meta: 'Released yesterday',
        weight: '512 notified',
        weightTone: 'shipped' as const,
        title: 'One-click Linear issue conversion',
        body: 'Product teams can convert any public suggestion into a Linear issue without leaving the board.',
        notesKey: 'landing.kanban.notes24',
        notes: 'View Release Notes #24',
      },
      {
        meta: 'Released Mar 12',
        weight: '380 notified',
        weightTone: 'shipped' as const,
        title: 'Automated spam & duplicate detection',
        body: 'Embeddings analyze incoming suggestions and prompt users to upvote similar preexisting tickets.',
        notesKey: 'landing.kanban.notes23',
        notes: 'View Release Notes #23',
      },
    ],
  },
]

const TRUST_MARKERS = [
  {
    icon: 'verified',
    key: 'landing.trust.companies',
    text: 'Trusted by 450+ high-growth tech companies',
  },
  { icon: 'check_circle', key: 'landing.trust.noCard', text: 'No credit card required' },
  { icon: 'bolt', key: 'landing.trust.setup', text: 'Instant 3-minute setup' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { isAuthenticated, state } = useAuth()
  const [topPosts, setTopPosts] = useState<ApiPost[]>([])

  useEffect(() => {
    let cancelled = false
    const http = getHttpClient()
    void http
      .get<{ data?: ApiPost[] }>('/api/posts?sort=top&limit=3')
      .then((res) => {
        if (!cancelled && Array.isArray(res?.data?.data)) setTopPosts(res.data.data)
      })
      .catch(() => {
        /* marketing page degrades to the static sections */
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Authenticated users browsing to / should land on the live boards, not
  // the marketing page.
  if (state.initialized && isAuthenticated) {
    return <Navigate to="/boards" replace />
  }

  const demoCard = (r: DemoRequest, idx: number) => {
    const toneStyle: React.CSSProperties =
      r.statusTone === 'primary'
        ? {
            color: 'var(--color-primary)',
            backgroundColor: 'var(--color-status-planned-light)',
            borderColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)',
          }
        : r.statusTone === 'progress'
          ? {
              color: 'var(--color-status-inprogress)',
              backgroundColor: 'var(--color-status-inprogress-light)',
              borderColor: 'color-mix(in srgb, var(--color-status-inprogress) 25%, transparent)',
            }
          : r.statusTone === 'shipped'
            ? {
                color: 'var(--color-status-shipped)',
                backgroundColor: 'var(--color-status-shipped-light)',
                borderColor: 'color-mix(in srgb, var(--color-status-shipped) 30%, transparent)',
              }
            : {
                color: 'var(--color-on-surface-variant)',
                backgroundColor: 'var(--color-surface-container)',
                borderColor: 'var(--color-outline-variant)',
              }
    const avatarStyle: React.CSSProperties =
      r.avatarTone === 'primary'
        ? {
            backgroundColor: 'var(--color-primary-fixed)',
            color: 'var(--color-on-primary-fixed)',
          }
        : r.avatarTone === 'secondary'
          ? {
              backgroundColor: 'var(--color-secondary-container)',
              color: 'var(--color-on-secondary-fixed)',
            }
          : {
              backgroundColor: 'var(--color-surface-variant)',
              color: 'var(--color-on-surface-variant)',
            }
    return (
      <div
        key={r.title}
        className={cm.cn(
          cm.flex({ gap: 'md' }),
          cm.sp('p', 5),
          'rounded-xl border bg-surface-container-lowest shadow-sm hover:shadow-md transition-all',
        )}
        style={{ borderColor: 'var(--color-outline-variant)' }}
        data-mol-id="landing-demo-request"
      >
        {/* Upvote column (decorative) */}
        <div
          className={cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            'w-11 h-14 rounded-lg border shrink-0',
          )}
          style={
            r.voted
              ? {
                  borderColor: 'color-mix(in srgb, var(--color-status-shipped) 40%, transparent)',
                  backgroundColor:
                    'color-mix(in srgb, var(--color-status-shipped) 12%, transparent)',
                  color: 'var(--color-status-shipped)',
                }
              : {
                  borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)',
                  backgroundColor: 'var(--color-surface-container-low)',
                  color: 'var(--color-primary)',
                }
          }
          aria-hidden="true"
        >
          <span className="material-symbols-outlined text-[20px]">
            {r.voted ? 'check' : 'keyboard_arrow_up'}
          </span>
          <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{r.votes}</span>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
              'flex-wrap mb-2',
            )}
          >
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 2),
                cm.sp('py', 0.5),
                cm.textSize('xs'),
                cm.fontWeight('medium'),
                'rounded-lg border',
              )}
              style={toneStyle}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    r.statusTone === 'review'
                      ? 'var(--color-outline)'
                      : (toneStyle.color as string),
                }}
                aria-hidden="true"
              />
              {t(`landing.demo.${r.statusKey}`, {}, { defaultValue: r.status })}
            </span>
            <span
              className={cm.cn(
                cm.sp('px', 2),
                cm.sp('py', 0.5),
                cm.textSize('xs'),
                'rounded-lg border bg-surface text-on-surface-variant',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              {r.category}
            </span>
          </div>
          <h3
            className={cm.cn(
              cm.textSize('base'),
              cm.fontWeight('semibold'),
              'text-on-surface mb-1 truncate',
            )}
          >
            {t(`landing.demo.title${idx + 1}`, {}, { defaultValue: r.title })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-3 line-clamp-2')}>
            {r.body}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
              cm.textSize('xs'),
              cm.sp('pt', 3),
              'border-t',
            )}
            style={{
              borderColor: 'color-mix(in srgb, var(--color-outline-variant) 60%, transparent)',
            }}
          >
            <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'min-w-0')}>
              <span
                className={cm.cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                )}
                style={avatarStyle}
                aria-hidden="true"
              >
                {r.initials}
              </span>
              <span className={cm.cn(cm.fontWeight('medium'), 'text-on-surface truncate')}>
                {r.author}
              </span>
              <span className="text-on-surface-variant truncate">· {r.company}</span>
            </div>
            {r.voted ? (
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.fontWeight('semibold'),
                )}
                style={{ color: 'var(--color-status-shipped)' }}
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                  verified
                </span>
                {t('landing.demo.verifiedShipped', {}, { defaultValue: 'Verified Shipped' })}
              </span>
            ) : (
              <span
                className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                  chat_bubble
                </span>
                {r.comments} {t('landing.demo.comments', {}, { defaultValue: 'comments' })}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), 'bg-background')}>
      <header
        className={cm.cn('sticky top-0 z-50 border-b bg-surface-container-lowest shadow-sm')}
        style={{ borderColor: 'var(--color-outline-variant)' }}
      >
        <div
          className={cm.cn(
            'max-w-[1440px] mx-auto w-full',
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
          )}
        >
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
            <Link
              to="/"
              className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'whitespace-nowrap')}
            >
              <BrandWordmark as="span" />
            </Link>
            <span
              className={cm.cn(
                'hidden lg:inline-flex items-center px-2 py-0.5 rounded-lg border',
                cm.textSize('xs'),
                'text-on-surface-variant bg-surface-container',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              {t('landing.version', {}, { defaultValue: 'v2.4 LTS' })}
            </span>
          </div>
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              'hidden md:flex min-w-0 flex-wrap',
            )}
          >
            <a
              href="#features"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap',
              )}
            >
              {t('landing.navFeatures', {}, { defaultValue: 'Features' })}
            </a>
            <Link
              to="/roadmap"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap',
              )}
            >
              {t('landing.navRoadmap', {}, { defaultValue: 'Public Roadmap' })}
            </Link>
            <Link
              to="/changelog"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap',
              )}
            >
              {t('landing.navChangelog', {}, { defaultValue: 'Changelog' })}
            </Link>
            <a
              href="#wall-of-love"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap',
              )}
            >
              {t('landing.navWall', {}, { defaultValue: 'Wall of Love' })}
            </a>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                'text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap',
              )}
            >
              {t('nav.pricing', {}, { defaultValue: 'Pricing' })}
            </Link>
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'shrink-0')}>
            <Link
              to="/login"
              className={cm.cn(
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('px', 3),
                cm.sp('py', 1.5),
                'rounded-lg text-on-surface-variant hover:text-on-surface transition-colors whitespace-nowrap',
              )}
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
            </Link>
            <Link
              to="/signup"
              data-mol-id="landing-signup-cta"
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('sm'),
                cm.fontWeight('medium'),
                cm.sp('px', 4),
                cm.sp('py', 1.5),
                'rounded-lg bg-primary text-on-primary shadow-sm hover:bg-primary-active transition-colors whitespace-nowrap',
              )}
            >
              {t('landing.navTrial', {}, { defaultValue: 'Start Free Trial' })}
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className={cm.cn(cm.flex1)}>
        {/* Hero — centered announcement, headline, email capture, trust markers */}
        <section
          className={cm.cn('relative overflow-hidden border-b', cm.sp('pt', 12), cm.sp('pb', 16))}
          style={{ borderColor: 'var(--color-outline-variant)' }}
        >
          <div className={cm.cn('max-w-[1440px]', cm.mxAuto, cm.sp('px', 6))}>
            <div
              className={cm.cn(
                'max-w-3xl mx-auto text-center flex flex-col items-center',
                cm.sp('pt', 4),
              )}
            >
              <a
                href="#features"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'rounded-full border shadow-sm mb-6 hover:border-primary transition-colors tracking-wide',
                )}
                style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  borderColor: 'var(--color-outline-variant)',
                  color: 'var(--color-primary)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                  aria-hidden="true"
                />
                {t(
                  'landing.heroAnnouncement',
                  {},
                  { defaultValue: 'NEW: Bi-directional Linear & GitHub issue sync is live' },
                )}
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
                  arrow_forward
                </span>
              </a>
              <h1
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  'text-4xl md:text-5xl tracking-tight text-on-background mb-6 text-balance',
                )}
              >
                {t(
                  'landing.heroHeadline',
                  { tagline: APP_TAGLINE },
                  { defaultValue: '{{tagline}}.' },
                )}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-surface-variant max-w-2xl text-balance mb-8',
                )}
              >
                {t(
                  'landing.heroLede',
                  { appName: APP_NAME },
                  {
                    defaultValue:
                      'Turn scattered customer requests into prioritized roadmaps and verified changelogs. Give your users a voice and your product team absolute clarity.',
                  },
                )}
              </p>
              {/* Email capture */}
              <div
                className={cm.cn(
                  cm.flex({ direction: 'col', gap: 'xs' }),
                  'sm:flex-row w-full max-w-md mb-4',
                )}
              >
                <div className="relative flex-1">
                  <span
                    className={cm.cn('absolute left-3 top-1/2 -translate-y-1/2')}
                    style={{ color: 'var(--color-outline)' }}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                  </span>
                  <input
                    type="email"
                    className={cm.cn(
                      'w-full pl-9 pr-3 py-2.5 rounded-lg border bg-surface-container-lowest text-on-surface',
                      cm.textSize('sm'),
                    )}
                    style={{ borderColor: 'var(--color-outline-variant)' }}
                    placeholder={t(
                      'landing.emailPlaceholder',
                      {},
                      { defaultValue: 'Enter work email address...' },
                    )}
                    aria-label={t(
                      'landing.emailPlaceholder',
                      {},
                      { defaultValue: 'Enter work email address...' },
                    )}
                  />
                </div>
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('px', 5),
                    cm.sp('py', 2.5),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg bg-primary text-on-primary shadow-sm whitespace-nowrap hover:bg-primary-active transition-colors',
                  )}
                >
                  {t('landing.heroCtaPrimary', {}, { defaultValue: 'Start Free Trial (14 days)' })}
                </Link>
              </div>
              {/* Secondary link */}
              <Link
                to="/boards"
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('medium'),
                  'mb-10 hover:underline',
                )}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('landing.heroCtaSecondary', {}, { defaultValue: 'Explore Public Demo Roadmap' })}
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              {/* Trust markers */}
              <div
                className={cm.cn(
                  cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'lg' }),
                  cm.textSize('xs'),
                  'w-full pt-6 border-t',
                )}
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-outline-variant) 60%, transparent)',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                {TRUST_MARKERS.map((m) => (
                  <span key={m.key} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                    <span
                      className="material-symbols-outlined text-[16px]"
                      style={{ color: 'var(--color-status-shipped)' }}
                      aria-hidden="true"
                    >
                      {m.icon}
                    </span>
                    {t(m.key, {}, { defaultValue: m.text })}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Live preview — community feature requests */}
        <section
          id="features"
          className={cm.cn('border-b bg-surface', cm.sp('py', 16), cm.sp('px', 6))}
          style={{ borderColor: 'var(--color-outline-variant)' }}
        >
          <div className={cm.cn('max-w-[1440px]', cm.mxAuto)}>
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between', gap: 'md' }),
                'md:flex-row md:items-end mb-8 pb-4 border-b',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              <div>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'uppercase tracking-wider mb-2',
                  )}
                  style={{ color: 'var(--color-primary)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-ping"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    aria-hidden="true"
                  />
                  {t('landing.previewEyebrow', {}, { defaultValue: 'Live System Sync' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('2xl'),
                    cm.fontWeight('semibold'),
                    'text-on-surface tracking-tight',
                  )}
                >
                  {t('landing.previewTitle', {}, { defaultValue: 'Community Feature Requests' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-1')}>
                  {topPosts.length > 0
                    ? t(
                        'landing.previewSubtitleLive',
                        {},
                        {
                          defaultValue:
                            'Real requests from this workspace — sign in to add your vote.',
                        },
                      )
                    : t(
                        'landing.previewSubtitle',
                        {},
                        {
                          defaultValue:
                            'Real-time portal as experienced by end-users and product team.',
                        },
                      )}
                </p>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'mt-4 md:mt-0')}>
                <span
                  className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant whitespace-nowrap')}
                >
                  {t('landing.previewSync', {}, { defaultValue: 'Sync:' })}{' '}
                  <strong style={{ color: 'var(--color-status-shipped)' }}>
                    {t('landing.previewSyncTarget', {}, { defaultValue: 'Connected to Linear' })}
                  </strong>
                </span>
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-status-shipped)' }}
                  aria-hidden="true"
                />
              </div>
            </div>
            {/* Search & filter controls (decorative preview chrome) */}
            <div
              className={cm.cn(
                cm.flex({ direction: 'col', justify: 'between', gap: 'md' }),
                'md:flex-row md:items-center rounded-xl border p-3 mb-6 shadow-sm bg-surface-container-lowest',
              )}
              style={{ borderColor: 'var(--color-outline-variant)' }}
            >
              <div className="relative w-full md:w-96">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-outline)' }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[18px]">search</span>
                </span>
                <input
                  className={cm.cn(
                    'w-full pl-9 pr-3 py-2 rounded-lg border bg-surface text-on-surface',
                    cm.textSize('sm'),
                  )}
                  style={{ borderColor: 'var(--color-outline-variant)' }}
                  placeholder={t(
                    'landing.previewSearch',
                    {},
                    { defaultValue: 'Search 1,420 open requests...' },
                  )}
                  aria-label={t(
                    'landing.previewSearch',
                    {},
                    { defaultValue: 'Search 1,420 open requests...' },
                  )}
                />
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('p', 1),
                  'rounded-lg border bg-surface-container overflow-x-auto',
                )}
                style={{ borderColor: 'var(--color-outline-variant)' }}
                aria-hidden="true"
              >
                {['Trending', 'Most Upvoted', 'Recently Added'].map((f, i) => (
                  <span
                    key={f}
                    className={cm.cn(
                      cm.sp('px', 3),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('medium'),
                      'rounded-lg whitespace-nowrap',
                    )}
                    style={
                      i === 0
                        ? {
                            backgroundColor: 'var(--color-surface-container-lowest)',
                            color: 'var(--color-primary)',
                            boxShadow: 'var(--shadow-sm)',
                          }
                        : { color: 'var(--color-on-surface-variant)' }
                    }
                  >
                    {t(`landing.previewFilter.${f.replace(/\W+/g, '')}`, {}, { defaultValue: f })}
                  </span>
                ))}
              </div>
            </div>
            {/* Live posts when the board has them; the design's demo grid otherwise */}
            {topPosts.length > 0 ? (
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
                {topPosts.map((post) => (
                  <PostCard key={post.id} post={post} href="/signup" />
                ))}
              </div>
            ) : (
              <div className={cm.cn('grid gap-4 grid-cols-1 md:grid-cols-2')}>
                {DEMO_REQUESTS.map((r, i) => demoCard(r, i))}
              </div>
            )}
          </div>
        </section>

        {/* Accountability board — public roadmap kanban */}
        <section
          id="roadmap"
          className={cm.cn('border-b bg-surface-container-low', cm.sp('py', 16), cm.sp('px', 6))}
          style={{ borderColor: 'var(--color-outline-variant)' }}
        >
          <div className={cm.cn('max-w-[1440px]', cm.mxAuto)}>
            <div className={cm.cn('text-center max-w-2xl mx-auto mb-10')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider block mb-2',
                )}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('landing.kanbanEyebrow', {}, { defaultValue: 'Accountability Board' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('semibold'),
                  'text-on-background tracking-tight mb-3',
                )}
              >
                {t('landing.kanbanTitle', {}, { defaultValue: 'Real-Time Public Pipeline' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'landing.kanbanSubtitle',
                  {},
                  {
                    defaultValue:
                      'Closing the loop: Users get auto-notified the exact minute their requested feature ships. Zero roadmap speculation.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('grid gap-6 grid-cols-1 lg:grid-cols-3')}>
              {KANBAN.map((col) => (
                <div
                  key={col.key}
                  className={cm.cn(
                    'rounded-xl border bg-surface-container flex flex-col',
                    cm.sp('p', 4),
                  )}
                  style={{ borderColor: 'var(--color-outline-variant)' }}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                      'pb-3 mb-4 border-b',
                    )}
                    style={{ borderColor: 'var(--color-outline-variant)' }}
                  >
                    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                      <span
                        className={'w-2.5 h-2.5 rounded-full' + (col.pulse ? ' animate-pulse' : '')}
                        style={{ backgroundColor: col.dot }}
                        aria-hidden="true"
                      />
                      <h3
                        className={cm.cn(
                          cm.textSize('base'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {t(col.titleKey, {}, { defaultValue: col.title })}
                      </h3>
                    </div>
                    <span
                      className={cm.cn(
                        cm.sp('px', 2),
                        cm.sp('py', 0.5),
                        cm.textSize('xs'),
                        cm.fontWeight('medium'),
                        'rounded-full border bg-surface text-on-surface-variant whitespace-nowrap',
                      )}
                      style={{ borderColor: 'var(--color-outline-variant)' }}
                    >
                      {t(col.countKey, {}, { defaultValue: col.count })}
                    </span>
                  </div>
                  <div className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'flex-1')}>
                    {col.cards.map((card) => (
                      <div
                        key={card.title}
                        className={cm.cn(
                          'bg-surface-container-lowest rounded-lg border shadow-sm',
                          cm.sp('p', 4),
                        )}
                        style={{ borderColor: 'var(--color-outline-variant)' }}
                      >
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                            cm.textSize('xs'),
                            'mb-2',
                          )}
                          style={{ color: 'var(--color-outline)' }}
                        >
                          <span className="whitespace-nowrap">{card.meta}</span>
                          <span
                            className={cm.cn(cm.fontWeight('semibold'), 'whitespace-nowrap')}
                            style={{
                              color:
                                card.weightTone === 'primary'
                                  ? 'var(--color-primary)'
                                  : card.weightTone === 'shipped'
                                    ? 'var(--color-status-shipped)'
                                    : 'var(--color-status-inprogress)',
                            }}
                          >
                            {card.weight}
                          </span>
                        </div>
                        <h4
                          className={cm.cn(
                            cm.textSize('base'),
                            cm.fontWeight('semibold'),
                            'text-on-surface mb-2',
                          )}
                        >
                          {t(`landing.kanban.${card.title}`, {}, { defaultValue: card.title })}
                        </h4>
                        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-3')}>
                          {card.body}
                        </p>
                        <div
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between', gap: 'xs' }),
                            cm.textSize('xs'),
                            cm.sp('pt', 2),
                            'border-t',
                          )}
                          style={{
                            borderColor:
                              'color-mix(in srgb, var(--color-outline-variant) 60%, transparent)',
                            color: 'var(--color-on-surface-variant)',
                          }}
                        >
                          {card.notes ? (
                            <Link
                              to="/changelog"
                              className={cm.cn(
                                cm.flex({ align: 'center', gap: 'xs' }),
                                cm.fontWeight('semibold'),
                                'hover:underline',
                              )}
                              style={{ color: 'var(--color-primary)' }}
                            >
                              {t(card.notesKey ?? '', {}, { defaultValue: card.notes ?? '' })}
                              <span
                                className="material-symbols-outlined text-[13px]"
                                aria-hidden="true"
                              >
                                arrow_forward
                              </span>
                            </Link>
                          ) : (
                            <>
                              <span
                                className={cm.cn(
                                  cm.flex({ align: 'center', gap: 'xs' }),
                                  cm.fontWeight('semibold'),
                                )}
                                style={{ color: 'var(--color-primary)' }}
                              >
                                <span
                                  className="material-symbols-outlined text-[14px]"
                                  aria-hidden="true"
                                >
                                  arrow_upward
                                </span>
                                {card.votes}
                              </span>
                              <span className="truncate">{card.foot}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Velocity pillars */}
        <section
          className={cm.cn('border-b bg-surface-container-lowest', cm.sp('py', 16), cm.sp('px', 6))}
          style={{ borderColor: 'var(--color-outline-variant)' }}
        >
          <div className={cm.cn('max-w-[1440px]', cm.mxAuto)}>
            <div className={cm.cn('text-center max-w-2xl mx-auto mb-14')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider block mb-2',
                )}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('landing.pillarsEyebrow', {}, { defaultValue: 'Engineered for Velocity' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('semibold'),
                  'text-on-background tracking-tight mb-3',
                )}
              >
                {t(
                  'landing.pillarsTitle',
                  {},
                  { defaultValue: 'Designed for precision product teams' },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'landing.pillarsSubtitle',
                  {},
                  {
                    defaultValue:
                      'Three pillars to replace chaotic spreadsheet backlogs with verifiable execution.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('grid gap-8 grid-cols-1 md:grid-cols-3')}>
              {[
                {
                  icon: 'inbox',
                  titleKey: 'landing.pillar1.title',
                  title: '1. Collect & Consolidate',
                  bodyKey: 'landing.pillar1.body',
                  body: 'Capture input right where customers speak. Centralize signals from Discord, Zendesk, Intercom, and customer success calls into one sanitized backlog.',
                  panel: (
                    <div
                      className={cm.cn(
                        cm.sp('p', 3),
                        'rounded-lg border bg-surface-container-lowest',
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                      style={{ borderColor: 'var(--color-outline-variant)' }}
                    >
                      {[
                        { k: 'Slack Bot Integration', v: 'Active · 99.98%' },
                        { k: 'Zendesk Webhook', v: 'Active · Real-time' },
                        { k: 'Intercom API', v: 'Active · Synced' },
                      ].map((row, i) => (
                        <div
                          key={row.k}
                          className={cm.cn(
                            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                            i > 0 ? cm.sp('mt', 2) : '',
                          )}
                        >
                          <span className="truncate">{row.k}</span>
                          <span
                            className={cm.cn(cm.fontWeight('semibold'), 'whitespace-nowrap')}
                            style={{ color: 'var(--color-status-shipped)' }}
                          >
                            {row.v}
                          </span>
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  icon: 'analytics',
                  titleKey: 'landing.pillar2.title',
                  title: '2. Prioritize by Impact',
                  bodyKey: 'landing.pillar2.body',
                  body: 'Filter requests by revenue, enterprise tier, and account age. Never let loud churn risks hijack high-LTV customer commitments again.',
                  panel: (
                    <div
                      className={cm.cn(
                        cm.sp('p', 3),
                        'rounded-lg border bg-surface-container-lowest',
                        cm.textSize('xs'),
                      )}
                      style={{ borderColor: 'var(--color-outline-variant)' }}
                    >
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                          'text-on-surface',
                        )}
                      >
                        <span className={cm.cn(cm.fontWeight('medium'), 'truncate')}>
                          {t(
                            'landing.pillar2.cohort',
                            {},
                            { defaultValue: 'Enterprise Cohort ($50k+)' },
                          )}
                        </span>
                        <span
                          className={cm.cn(cm.fontWeight('semibold'), 'whitespace-nowrap')}
                          style={{ color: 'var(--color-primary)' }}
                        >
                          {t('landing.pillar2.arr', {}, { defaultValue: '$380,000 ARR' })}
                        </span>
                      </div>
                      <div
                        className={cm.cn(
                          'w-full rounded-full h-2 overflow-hidden bg-surface-container',
                          cm.sp('mt', 2),
                        )}
                        aria-hidden="true"
                      >
                        <div
                          className="h-2 rounded-full"
                          style={{ width: '78%', backgroundColor: 'var(--color-primary)' }}
                        />
                      </div>
                      <div
                        className={cm.cn(
                          cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
                          cm.textSize('xs'),
                          cm.sp('mt', 1),
                        )}
                        style={{ color: 'var(--color-outline)' }}
                      >
                        <span>
                          {t('landing.pillar2.owners', {}, { defaultValue: '32 Account Owners' })}
                        </span>
                        <span>
                          {t('landing.pillar2.alignment', {}, { defaultValue: '78% Alignment' })}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  icon: 'campaign',
                  titleKey: 'landing.pillar3.title',
                  title: '3. Close the Feedback Loop',
                  bodyKey: 'landing.pillar3.body',
                  body: `Ship and celebrate. When engineers push to production, ${APP_NAME} dispatches personalized release notifications to every single customer who upvoted.`,
                  panel: (
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'sm' }),
                        cm.sp('p', 3),
                        'rounded-lg border bg-surface-container-lowest',
                        cm.textSize('xs'),
                      )}
                      style={{ borderColor: 'var(--color-outline-variant)' }}
                    >
                      <span
                        className={cm.cn(
                          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        )}
                        style={{
                          backgroundColor: 'var(--color-secondary-container)',
                          color: 'var(--color-status-shipped)',
                        }}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined text-[18px]">send</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cm.cn(
                            cm.fontWeight('semibold'),
                            'text-on-surface block truncate',
                          )}
                        >
                          {t(
                            'landing.pillar3.trigger',
                            {},
                            { defaultValue: 'Auto-Dispatch Triggered' },
                          )}
                        </span>
                        <span className="text-on-surface-variant block truncate">
                          {t(
                            'landing.pillar3.dispatched',
                            {},
                            { defaultValue: '420 personalized emails sent in 1.4s' },
                          )}
                        </span>
                      </span>
                    </div>
                  ),
                },
              ].map((p) => (
                <div
                  key={p.titleKey}
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
                    cm.sp('p', 6),
                    'rounded-xl border bg-surface-container-low',
                  )}
                  style={{ borderColor: 'var(--color-outline-variant)' }}
                >
                  <div>
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'center' }),
                        cm.w(10),
                        cm.h(10),
                        'rounded-lg border bg-surface-container-lowest shadow-sm mb-5',
                      )}
                      style={{ borderColor: 'var(--color-outline-variant)' }}
                      aria-hidden="true"
                    >
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        {p.icon}
                      </span>
                    </div>
                    <h3
                      className={cm.cn(
                        cm.textSize('lg'),
                        cm.fontWeight('semibold'),
                        'text-on-surface mb-2',
                      )}
                    >
                      {t(p.titleKey, {}, { defaultValue: p.title })}
                    </h3>
                    <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mb-6')}>
                      {t(p.bodyKey, {}, { defaultValue: p.body })}
                    </p>
                  </div>
                  {p.panel}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Wall of love */}
        <section
          id="wall-of-love"
          className={cm.cn('border-b bg-surface', cm.sp('py', 16), cm.sp('px', 6))}
          style={{ borderColor: 'var(--color-outline-variant)' }}
        >
          <div className={cm.cn('max-w-[1440px]', cm.mxAuto)}>
            <div className={cm.cn('text-center max-w-2xl mx-auto mb-12')}>
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'uppercase tracking-wider block mb-2',
                )}
                style={{ color: 'var(--color-primary)' }}
              >
                {t('landing.wallEyebrow', {}, { defaultValue: 'Wall of Love' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('semibold'),
                  'text-on-background tracking-tight mb-2',
                )}
              >
                {t('landing.wallTitle', {}, { defaultValue: 'Proven by builders at scale' })}
              </h2>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(
                  'landing.wallSubtitle',
                  {},
                  {
                    defaultValue:
                      'See how high-velocity engineering and product teams stay aligned with customer reality.',
                  },
                )}
              </p>
            </div>
            <div className={cm.cn('grid gap-6 grid-cols-1 md:grid-cols-3')}>
              {[
                {
                  quote:
                    'Before SignalLoop, our backlog was a 3,000-row graveyard. Now, every single customer request has a dollar figure and an accountable sprint status. Our users actually trust our roadmap.',
                  initials: 'EK',
                  avatar: {
                    backgroundColor: 'var(--color-primary-fixed)',
                    color: 'var(--color-on-primary-fixed)',
                  },
                  name: 'Elena Rostova',
                  role: 'VP of Product at HyperFlow',
                },
                {
                  quote:
                    'The automated release notes alone saved our support team 20 hours a week. Customers who upvoted a ticket 6 months ago get an email the minute we deploy. It feels like magic to them.',
                  initials: 'TC',
                  avatar: {
                    backgroundColor: 'var(--color-secondary-container)',
                    color: 'var(--color-on-secondary-fixed)',
                  },
                  name: 'Tomás Chen',
                  role: 'Co-founder & CEO at CloudKite',
                },
                {
                  quote:
                    'Bi-directional Linear sync is flawlessly executed. We don’t ask engineers to context-switch into a separate feedback app. They close an issue on Linear, and SignalLoop handles the rest.',
                  initials: 'MN',
                  avatar: {
                    backgroundColor: 'var(--color-surface-variant)',
                    color: 'var(--color-on-surface)',
                  },
                  name: 'Markus Nielson',
                  role: 'Lead Architect at BaseStack',
                },
              ].map((tst, i) => (
                <div
                  key={tst.name}
                  className={cm.cn(
                    cm.flex({ direction: 'col', justify: 'between', gap: 'lg' }),
                    cm.sp('p', 6),
                    'rounded-xl border bg-surface-container-lowest shadow-sm',
                  )}
                  style={{ borderColor: 'var(--color-outline-variant)' }}
                >
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface leading-relaxed')}>
                    {t(
                      `landing.wall.quote${i + 1}`,
                      { appName: APP_NAME },
                      { defaultValue: tst.quote },
                    )}
                  </p>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'sm' }),
                      cm.sp('pt', 4),
                      'border-t',
                    )}
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--color-outline-variant) 60%, transparent)',
                    }}
                  >
                    <span
                      className={cm.cn(
                        'w-10 h-10 rounded-full font-semibold flex items-center justify-center text-sm shrink-0',
                      )}
                      style={tst.avatar}
                      aria-hidden="true"
                    >
                      {tst.initials}
                    </span>
                    <div className="min-w-0">
                      <div
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('semibold'),
                          'text-on-surface',
                        )}
                      >
                        {t(`landing.wall.name${i + 1}`, {}, { defaultValue: tst.name })}
                      </div>
                      <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant truncate')}>
                        {t(`landing.wall.role${i + 1}`, {}, { defaultValue: tst.role })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* High-impact final CTA — inverse band */}
        <section className={cm.cn('bg-surface-container-lowest', cm.sp('py', 16), cm.sp('px', 6))}>
          <div className={cm.cn('max-w-[1440px]', cm.mxAuto)}>
            <div
              className={cm.cn(
                'rounded-2xl relative overflow-hidden shadow-xl',
                cm.sp('p', 8),
                'md:p-14',
              )}
              style={{
                backgroundColor: 'var(--color-inverse-surface)',
                color: 'var(--color-inverse-on-surface)',
              }}
            >
              <div className={cm.cn('max-w-2xl relative z-10')}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    'inline-flex px-3 py-1 rounded-full border mb-6',
                    cm.textSize('xs'),
                    cm.fontWeight('semibold'),
                    'tracking-wide',
                  )}
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--color-inverse-on-surface) 10%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--color-inverse-on-surface) 20%, transparent)',
                    color: 'var(--color-inverse-primary)',
                  }}
                >
                  {t('landing.ctaBadge', {}, { defaultValue: 'No fluff. Total transparency.' })}
                </span>
                <h2
                  className={cm.cn(
                    cm.textSize('4xl'),
                    cm.fontWeight('semibold'),
                    'tracking-tight text-white mb-4',
                  )}
                >
                  {t(
                    'landing.ctaHeadline',
                    {},
                    { defaultValue: 'Stop guessing. Start building what moves the needle.' },
                  )}
                </h2>
                <p className={cm.cn(cm.textSize('lg'), 'opacity-80 mb-8')}>
                  {t(
                    'landing.ctaBody',
                    {},
                    {
                      defaultValue:
                        'Join hundreds of product-driven teams who prioritize with data and ship with customer alignment.',
                    },
                  )}
                </p>
                <div
                  className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }), 'sm:flex-row mb-6')}
                >
                  <input
                    type="email"
                    className={cm.cn(
                      'px-4 py-2.5 rounded-lg border bg-white/10 text-white sm:w-80',
                      cm.textSize('sm'),
                    )}
                    style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                    placeholder={t(
                      'landing.ctaEmailPlaceholder',
                      {},
                      { defaultValue: 'Enter your work email...' },
                    )}
                    aria-label={t(
                      'landing.ctaEmailPlaceholder',
                      {},
                      { defaultValue: 'Enter your work email...' },
                    )}
                  />
                  <Link
                    to="/signup"
                    data-mol-id="landing-cta-signup"
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                      cm.sp('px', 6),
                      cm.sp('py', 2.5),
                      cm.textSize('sm'),
                      cm.fontWeight('medium'),
                      'rounded-lg shadow-md whitespace-nowrap transition-colors',
                    )}
                    style={{ backgroundColor: 'var(--color-primary)', color: '#ffffff' }}
                  >
                    {t('landing.navTrial', {}, { defaultValue: 'Start Free Trial' })}
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  </Link>
                </div>
                <div
                  className={cm.cn(
                    cm.flex({ wrap: 'wrap', align: 'center', gap: 'lg' }),
                    cm.textSize('xs'),
                    'opacity-80',
                  )}
                >
                  {[
                    { key: 'landing.cta.check1', text: 'Import backlog in 3 mins' },
                    { key: 'landing.cta.check2', text: 'Free 14-day trial' },
                    { key: 'landing.cta.check3', text: 'Cancel anytime' },
                  ].map((c) => (
                    <span key={c.key} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                      <span
                        className="material-symbols-outlined text-[15px]"
                        style={{ color: 'var(--color-status-shipped)' }}
                        aria-hidden="true"
                      >
                        check_circle
                      </span>
                      {t(c.key, {}, { defaultValue: c.text })}
                    </span>
                  ))}
                </div>
              </div>
              {/* Watermark */}
              <div
                className={cm.cn(
                  'absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none hidden md:flex items-center justify-center',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-[320px] text-white">
                  all_inclusive
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Landing
