import { useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageRow, type PageRowEntry } from '../components/PageRow.js'

interface Badge {
  id: string
  label: string
  icon: string
  earnedAt: string
}

interface ProfileData {
  id: string
  name: string
  initials: string
  role: string
  bio: string
  joinedAt: string
  pagesAuthored: number
  pagesEdited: number
  commentsLeft: number
  badges: Badge[]
  recentContributions: PageRowEntry[]
  ownedPages: PageRowEntry[]
}

// TODO: replace with /api/users/:id once backend lands
const SAMPLE_PROFILE: ProfileData = {
  id: 'alex-lin',
  name: 'Alex Lin',
  initials: 'AL',
  role: 'Engineering · Owner',
  bio: 'Platform tech lead. Lives at the boundary of database and API. Writes the kind of architecture pages other engineers actually read.',
  joinedAt: 'Joined March 2024',
  pagesAuthored: 142,
  pagesEdited: 318,
  commentsLeft: 247,
  badges: [
    { id: 'b1', label: 'First page', icon: 'edit_note', earnedAt: 'Mar 2024' },
    { id: 'b2', label: '100 edits', icon: 'history_edu', earnedAt: 'Sep 2024' },
    { id: 'b3', label: 'Cairn keeper', icon: 'shield', earnedAt: 'Jan 2026' },
    { id: 'b4', label: 'Reviewer', icon: 'reviews', earnedAt: 'Apr 2026' },
  ],
  recentContributions: [
    {
      id: 'arch-overview',
      title: 'Architecture overview — 2026',
      breadcrumb: ['Engineering', 'Reference'],
      authorInitials: 'AL',
      lastEdited: '2 hours ago',
      status: 'published',
      icon: 'description',
    },
    {
      id: 'rfc-template',
      title: 'RFC template — 0001',
      breadcrumb: ['Engineering', 'Templates'],
      authorInitials: 'AL',
      lastEdited: 'Yesterday',
      status: 'published',
      icon: 'article',
    },
    {
      id: 'oncall',
      title: 'Oncall handbook',
      breadcrumb: ['Engineering', 'Operations'],
      authorInitials: 'AL',
      lastEdited: 'Last week',
      status: 'published',
      icon: 'support_agent',
    },
  ],
  ownedPages: [
    {
      id: 'arch-overview',
      title: 'Architecture overview — 2026',
      breadcrumb: ['Engineering', 'Reference'],
      authorInitials: 'AL',
      lastEdited: '2 hours ago',
      status: 'published',
      icon: 'description',
    },
    {
      id: 'rfc-0014',
      title: 'RFC-0014 — Auth gateway sharding',
      breadcrumb: ['Engineering', 'RFCs'],
      authorInitials: 'AL',
      lastEdited: '3 days ago',
      status: 'draft',
      icon: 'policy',
    },
  ],
}

export function Profile() {
  const cm = getClassMap()
  const { t } = useTranslation()
  useParams<{ id: string }>()
  const profile = SAMPLE_PROFILE

  return (
    <div className={cm.stack(8)}>
      {/* Hero header */}
      <div
        className={cm.cn(
          cm.sp('p', 8),
          'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-secondary text-white',
        )}
      >
        <div
          className={cm.cn(
            'pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-surface/15 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'relative z-10 flex-wrap')}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              'h-20 w-20 shrink-0 rounded-full bg-surface/15 backdrop-blur-md text-3xl font-extrabold',
            )}
            aria-hidden="true"
          >
            {profile.initials}
          </span>
          <div className={cm.stack(1)}>
            <span
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-white/80',
              )}
            >
              {profile.role}
            </span>
            <h1 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight')}>
              {profile.name}
            </h1>
            <p className={cm.cn(cm.textSize('sm'), 'text-white/85 max-w-2xl leading-relaxed')}>
              {profile.bio}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-white/70')}>{profile.joinedAt}</p>
          </div>
        </div>
      </div>

      {/* KPI triad */}
      <div className={cm.cn('grid gap-4 md:grid-cols-3')}>
        {[
          { key: 'pagesAuthored', label: 'Pages authored', value: profile.pagesAuthored },
          { key: 'pagesEdited', label: 'Pages edited', value: profile.pagesEdited },
          { key: 'commentsLeft', label: 'Comments left', value: profile.commentsLeft },
        ].map((k) => (
          <div
            key={k.key}
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-xl bg-surface-container-lowest border-l-4 border-secondary shadow-sm',
            )}
          >
            <p
              className={cm.cn(
                cm.textSize('xs'),
                'font-black uppercase tracking-widest text-on-surface-variant',
              )}
            >
              {t(`profile.kpi.${k.key}`, {}, { defaultValue: k.label })}
            </p>
            <p className={cm.cn('text-3xl font-extrabold text-on-surface tracking-tight')}>
              {k.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <section className={cm.stack(3)}>
        <h2
          className={cm.cn(
            cm.textSize('xs'),
            'font-black uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('profile.badges.title', {}, { defaultValue: 'Badges' })}
        </h2>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), 'flex-wrap')}>
          {profile.badges.map((b) => (
            <span
              key={b.id}
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 4),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'h-9 rounded-full bg-tertiary-container/50 text-on-tertiary-container border border-tertiary/30',
              )}
            >
              <span className={cm.cn('material-symbols-outlined text-[16px]')} aria-hidden="true">
                {b.icon}
              </span>
              {b.label}
              <span className={cm.cn('text-on-surface-variant')}>· {b.earnedAt}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Two-column lists */}
      <div
        className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'lg:flex-row lg:items-start')}
      >
        <section className={cm.cn(cm.stack(4), 'flex-1 min-w-0')}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('profile.recent.title', {}, { defaultValue: 'Recent contributions' })}
          </h2>
          <ul className={cm.stack(3)}>
            {profile.recentContributions.map((p) => (
              <li key={p.id}>
                <PageRow entry={p} />
              </li>
            ))}
          </ul>
        </section>
        <section className={cm.cn(cm.stack(4), 'flex-1 min-w-0')}>
          <h2 className={cm.cn(cm.textSize('xl'), 'font-extrabold tracking-tight text-on-surface')}>
            {t('profile.owned.title', {}, { defaultValue: 'Owned pages' })}
          </h2>
          <ul className={cm.stack(3)}>
            {profile.ownedPages.map((p) => (
              <li key={p.id}>
                <PageRow entry={p} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
