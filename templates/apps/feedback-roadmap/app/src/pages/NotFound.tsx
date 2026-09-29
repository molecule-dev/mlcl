/**
 * NotFound — catch-all 404 / dead link page.
 *
 * Design shape: an apologetic hero ("this signal got dropped") plus the four
 * recommended live destinations — roadmap, boards, changelog, submit — so a
 * dead link still routes the visitor somewhere useful.
 */
import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { BrandWordmark } from '../components/BrandWordmark.js'

interface Destination {
  to: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
  molId: string
}

const DESTINATIONS: Destination[] = [
  {
    to: '/roadmap',
    icon: 'route',
    titleKey: 'notFound.destRoadmap',
    titleDefault: 'Public Roadmap',
    bodyKey: 'notFound.destRoadmapBody',
    bodyDefault: 'Planned initiatives, in-progress sprints, real-time backlog sync.',
    molId: 'notfound-dest-roadmap',
  },
  {
    to: '/boards',
    icon: 'forum',
    titleKey: 'notFound.destBoards',
    titleDefault: 'Feedback Boards',
    bodyKey: 'notFound.destBoardsBody',
    bodyDefault: 'Open community ideas across active domains, with upvoting.',
    molId: 'notfound-dest-boards',
  },
  {
    to: '/changelog',
    icon: 'inventory_2',
    titleKey: 'notFound.destChangelog',
    titleDefault: 'Product Changelog',
    bodyKey: 'notFound.destChangelogBody',
    bodyDefault: 'Verifiable releases closing loops directly with customer teams.',
    molId: 'notfound-dest-changelog',
  },
  {
    to: '/submit',
    icon: 'add_circle',
    titleKey: 'notFound.destSubmit',
    titleDefault: 'Submit Issue or Idea',
    bodyKey: 'notFound.destSubmitBody',
    bodyDefault: 'If you expected an active initiative here, submit a quick triage ping.',
    molId: 'notfound-dest-submit',
  },
]

export function NotFound() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.minH('screen'),
        cm.sp('px', 6),
        cm.sp('py', 12),
        'bg-background text-center',
      )}
    >
      <div
        className={cm.cn(
          cm.flex({ direction: 'col', align: 'center', gap: 'md' }),
          cm.sp('p', 10),
          'relative max-w-xl rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary to-primary-container text-white',
        )}
      >
        <div
          className={cm.cn(
            cm.w(60),
            cm.h(60),
            cm.roundedFull,
            'absolute -right-20 -bottom-20 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <span
          className={cm.cn(
            cm.fontWeight('bold'),
            'text-[11px] uppercase tracking-widest text-primary-fixed/80 relative z-10',
          )}
        >
          {t('notFound.eyebrow', {}, { defaultValue: '404' })}
        </span>
        <h1
          className={cm.cn(
            cm.fontWeight('bold'),
            'relative z-10 text-4xl font-extrabold tracking-tight',
          )}
        >
          {t(
            'notFound.title',
            {},
            { defaultValue: '404 — This signal got dropped along the way.' },
          )}
        </h1>
        <p
          className={cm.cn(
            cm.textSize('base'),
            'relative z-10 leading-relaxed max-w-md text-primary-fixed/90',
          )}
        >
          {t(
            'notFound.body',
            {},
            {
              defaultValue:
                "The post, board, or changelog release you're trying to reach doesn't exist, has been merged into a canonical initiative, or was relocated during our latest sprint.",
            },
          )}
        </p>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            'relative z-10 flex-wrap justify-center',
          )}
        >
          <Link
            to="/boards"
            className={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('sm'),
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 5),
              cm.sp('py', 3),
              'rounded-full bg-surface text-primary hover:-translate-y-0.5 transition-transform',
            )}
          >
            <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
              home
            </span>
            {t('notFound.ctaFeed', {}, { defaultValue: 'Back to boards' })}
          </Link>
        </div>
      </div>

      <section
        aria-labelledby="notfound-destinations"
        className={cm.cn(
          cm.flex({ direction: 'col', gap: 'md' }),
          cm.sp('mt', 10),
          'max-w-3xl w-full',
        )}
      >
        <h2
          id="notfound-destinations"
          className={cm.cn(cm.fontWeight('bold'), cm.textSize('xl'), 'text-on-surface')}
        >
          {t('notFound.destinationsTitle', {}, { defaultValue: 'Recommended Live Destinations' })}
        </h2>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          {t(
            'notFound.destinationsBody',
            {},
            {
              defaultValue:
                'Navigate to high-density hubs to locate planned, active, or delivered features.',
            },
          )}
        </p>
        <div className={cm.cn('grid gap-4 grid-cols-1 sm:grid-cols-2')}>
          {DESTINATIONS.map((dest) => (
            <Link
              key={dest.to}
              to={dest.to}
              data-mol-id={dest.molId}
              className={cm.cn(
                cm.flex({ direction: 'col', gap: 'xs' }),
                cm.sp('p', 5),
                'rounded-xl border border-outline-variant/40 bg-surface text-left hover:border-primary/40 hover:-translate-y-0.5 transition-all',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }))}>
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(9),
                    cm.h(9),
                    'rounded-lg',
                  )}
                  style={{
                    backgroundColor: 'var(--color-primary-container)',
                    color: 'var(--color-primary)',
                  }}
                  aria-hidden="true"
                >
                  <span className={cm.cn('material-symbols-outlined', cm.textSize('lg'))}>
                    {dest.icon}
                  </span>
                </span>
                <span
                  className={cm.cn('material-symbols-outlined text-base text-on-surface-variant')}
                  aria-hidden="true"
                >
                  arrow_outward
                </span>
              </div>
              <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('base'), 'text-on-surface')}>
                {t(dest.titleKey, {}, { defaultValue: dest.titleDefault })}
              </h3>
              <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                {t(dest.bodyKey, {}, { defaultValue: dest.bodyDefault })}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className={cm.cn(cm.flex({ justify: 'center' }), cm.sp('mt', 8))}>
        <BrandWordmark as="span" size="sm" footer withTagline />
      </div>
    </div>
  )
}

export default NotFound
