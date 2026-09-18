/**
 * CommunitySidebar — 300px right rail for /feed, /c/:slug, /thread/:id.
 *
 * Stacks four sections separated by hairlines: About Community (subscriber
 * count, active dot, description, primary "Create Post" CTA), Rules
 * (numbered), Moderators (avatar + username), Trending (numbered titles
 * with vote count badge).
 *
 * Translated from personal-finance/QuickActionsCard.tsx (sectioned card)
 * fused with blog/DiscoverySidebar.tsx (numbered trending row pattern).
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface CommunityRule {
  id: string
  title: string
  description?: string
}

export interface CommunityModerator {
  username: string
  avatar?: string | null
  badge?: 'mod' | 'admin'
}

export interface TrendingItem {
  id: string
  title: string
  category?: string
  voteCount: number
}

interface CommunitySidebarProps {
  name: string
  description: string
  subscribers: number
  activeNow?: number
  rules?: CommunityRule[]
  moderators?: CommunityModerator[]
  trending?: TrendingItem[]
  composeHref?: string
  accentColor?: string
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

export function CommunitySidebar({
  name,
  description,
  subscribers,
  activeNow,
  rules = [],
  moderators = [],
  trending = [],
  composeHref = '/compose',
  accentColor,
}: CommunitySidebarProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const accent = accentColor ?? 'var(--color-primary, #0e7c6b)'

  return (
    <aside className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }), 'w-full')}>
      <section
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'sm' }),
          cm.sp('p', 5),
          'rounded-xl border border-outline-variant/40 bg-surface',
        )}
      >
        <h3
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-on-surface-variant',
          )}
        >
          {t('communitySidebar.aboutTitle', {}, { defaultValue: 'About Community' })}
        </h3>
        <p className={cm.cn(cm.fontWeight('semibold'), cm.textSize('lg'), 'text-on-surface')}>
          {t('communitySidebar.namePrefix', {}, { defaultValue: 'c/' })}
          {name}
        </p>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
          {description}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between' }),
            cm.sp('mt', 1),
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            'text-on-surface-variant',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col' }))}>
            <span className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
              {formatNumber(subscribers)}
            </span>
            <span className={cm.cn('uppercase tracking-widest text-[10px]')}>
              {t('nav.members', {}, { defaultValue: 'Members' })}
            </span>
          </div>
          <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }))}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.fontWeight('bold'),
                cm.textSize('lg'),
                'text-on-surface',
              )}
            >
              <span
                className={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, 'inline-block')}
                style={{ backgroundColor: 'var(--color-resolved, var(--color-resolved))' }}
                aria-hidden="true"
              />
              {formatNumber(activeNow ?? 0)}
            </span>
            <span className={cm.cn('uppercase tracking-widest text-[10px]')}>
              {t('communitySidebar.activeNow', {}, { defaultValue: 'Active now' })}
            </span>
          </div>
        </div>
        <Link
          to={composeHref}
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
            cm.fontWeight('semibold'),
            cm.sp('mt', 2),
            'rounded-full text-on-primary py-2.5 transition-transform hover:-translate-y-0.5',
          )}
          style={{ backgroundColor: accent }}
        >
          <span className={cm.cn('material-symbols-outlined', cm.textSize('base'))}>edit</span>
          {t('communitySidebar.createPost', {}, { defaultValue: 'Create post' })}
        </Link>
      </section>

      {rules.length > 0 && (
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('communitySidebar.rulesTitle', {}, { defaultValue: 'Community Rules' })}
          </h3>
          <ol
            className={cm.cn(
              cm.flex({ direction: 'col' }),
              cm.textSize('sm'),
              'divide-y divide-outline-variant/30',
            )}
          >
            {rules.map((rule, index) => (
              <li
                key={rule.id}
                className={cm.cn(cm.flex({ gap: 'sm' }), cm.sp('py', 2), 'text-on-surface')}
              >
                <span
                  className={cm.cn(cm.fontWeight('bold'), 'shrink-0 tabular-nums')}
                  style={{ color: accent }}
                >
                  {index + 1}.
                </span>
                <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                  <span className={cm.cn(cm.fontWeight('semibold'))}>{rule.title}</span>
                  {rule.description && (
                    <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                      {rule.description}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {moderators.length > 0 && (
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('communitySidebar.moderatorsTitle', {}, { defaultValue: 'Moderators' })}
          </h3>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'sm' }))}>
            {moderators.map((mod) => (
              <li key={mod.username} className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.roundedFull,
                    cm.w(6),
                    cm.h(6),
                    cm.fontWeight('bold'),
                    cm.textSize('xs'),
                  )}
                  style={{
                    backgroundColor: 'var(--color-moderator-light, var(--color-moderator-light))',
                    color: 'var(--color-moderator, var(--color-moderator))',
                  }}
                  aria-hidden="true"
                >
                  {mod.avatar ? (
                    <img
                      src={mod.avatar}
                      alt=""
                      className={cm.cn(cm.w('full'), cm.h('full'), cm.roundedFull, 'object-cover')}
                    />
                  ) : (
                    mod.username.slice(0, 1).toUpperCase()
                  )}
                </span>
                <Link
                  to={`/u/${mod.username}`}
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.textSize('sm'),
                    'text-on-surface hover:text-primary transition-colors',
                  )}
                >
                  {t('communitySidebar.modPrefix', {}, { defaultValue: 'u/' })}
                  {mod.username}
                </Link>
                {mod.badge && (
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'rounded-full px-2 py-0 text-[9px] uppercase tracking-widest',
                    )}
                    style={{
                      backgroundColor: 'var(--color-moderator-light, var(--color-moderator-light))',
                      color: 'var(--color-moderator, var(--color-moderator))',
                    }}
                  >
                    {mod.badge}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {trending.length > 0 && (
        <section
          className={cm.cn(
            cm.flex({ direction: 'col', gap: 'sm' }),
            cm.sp('p', 5),
            'rounded-xl border border-outline-variant/40 bg-surface',
          )}
        >
          <h3
            className={cm.cn(
              cm.fontWeight('bold'),
              'text-[11px] uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('communitySidebar.trendingTitle', {}, { defaultValue: 'Trending' })}
          </h3>
          <ol
            className={cm.cn(cm.flex({ direction: 'col' }), 'divide-y divide-outline-variant/30')}
          >
            {trending.map((item, index) => (
              <li key={item.id}>
                <Link
                  to={`/thread/${item.id}`}
                  className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), cm.sp('py', 2), 'group')}
                >
                  <span
                    className={cm.cn(
                      cm.fontWeight('bold'),
                      'text-2xl font-headline tabular-nums shrink-0 leading-none w-6 text-right',
                    )}
                    style={{
                      color: 'var(--color-outline-variant, var(--mol-color-border-secondary))',
                    }}
                  >
                    {index + 1}
                  </span>
                  <div
                    className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), cm.flex1, 'min-w-0')}
                  >
                    <span
                      className={cm.cn(
                        cm.fontWeight('semibold'),
                        cm.textSize('sm'),
                        'text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-snug',
                      )}
                    >
                      {item.title}
                    </span>
                    <span
                      className={cm.cn(
                        cm.flex({ align: 'center', gap: 'xs' }),
                        cm.textSize('xs'),
                        'text-on-surface-variant',
                      )}
                    >
                      {item.category && (
                        <>
                          <span className={cm.cn(cm.fontWeight('medium'))}>
                            {t('communitySidebar.categoryPrefix', {}, { defaultValue: 'c/' })}
                            {item.category}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                        <span className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}>
                          arrow_upward
                        </span>
                        {item.voteCount}
                      </span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </aside>
  )
}

export default CommunitySidebar
