import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { CampaignProgressBar } from './CampaignProgressBar.js'

export interface CampaignCardData {
  id: string
  title: string
  category: string
  cover_image_url: string
  creator_name: string
  creator_avatar_url?: string | null
  pledged_cents: number
  goal_cents: number
  backer_count: number
  days_left: number
}

interface CampaignCardProps {
  campaign: CampaignCardData
}

const CATEGORY_TINT: Record<string, string> = {
  tech: 'bg-primary text-white',
  design: 'bg-tertiary text-white',
  film: 'bg-secondary text-white',
  games: 'bg-accent-700 text-white',
  music: 'bg-warning text-on-warning-container',
  food: 'bg-success text-white',
  art: 'bg-tertiary text-white',
}

function fmtUsd(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString()}`
}

/**
 * Campaign card — 16:9 cover image with category badge overlay, creator
 * avatar row, color-shifting progress bar, and pledged/backers/days_left
 * stat triad. Lifts on hover.
 *
 * Pattern translated from blog/ArticleListItem + the polished campaign
 * card recipe in §1.3 of POLISHED-PATTERN-CATALOG.
 */
export function CampaignCard({ campaign }: CampaignCardProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tint = CATEGORY_TINT[campaign.category.toLowerCase()] ?? 'bg-primary text-white'
  const fundedAtLeast = campaign.pledged_cents >= campaign.goal_cents

  return (
    <Link
      to={`/campaign/${campaign.id}`}
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        'group bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300',
      )}
      data-mol-id={`campaign-card-${campaign.id}`}
    >
      <div
        className={cm.cn(
          cm.w('full'),
          'relative aspect-video bg-surface-container overflow-hidden',
        )}
      >
        {campaign.cover_image_url ? (
          <img
            alt={campaign.title}
            src={campaign.cover_image_url}
            className={cm.cn(
              cm.w('full'),
              cm.h('full'),
              'object-cover group-hover:scale-105 transition-transform duration-500',
            )}
          />
        ) : (
          <div
            className={cm.cn(cm.w('full'), cm.h('full'), 'flex items-center justify-center')}
            style={{
              background:
                'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-primary-light) 100%)',
            }}
          >
            <span className="material-symbols-outlined text-white/50 text-5xl" aria-hidden="true">
              image
            </span>
          </div>
        )}
        <span
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.roundedFull,
            'absolute top-4 left-4 uppercase tracking-widest shadow-md',
            tint,
          )}
        >
          {campaign.category}
        </span>
      </div>

      <div className={cm.cn(cm.flex({ direction: 'col' }), cm.sp('p', 6), cm.flex1)}>
        <h3
          className={cm.cn(
            cm.textSize('xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'text-on-surface line-clamp-2 leading-tight group-hover:text-primary transition-colors',
          )}
        >
          {campaign.title}
        </h3>

        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mb', 6))}>
          <div
            className={cm.cn(
              cm.w(6),
              cm.h(6),
              cm.roundedFull,
              'overflow-hidden bg-surface-container',
            )}
          >
            {campaign.creator_avatar_url ? (
              <img
                alt={campaign.creator_name}
                src={campaign.creator_avatar_url}
                className={cm.cn(cm.w('full'), cm.h('full'), 'object-cover')}
              />
            ) : (
              <div
                className={cm.cn(
                  cm.w('full'),
                  cm.h('full'),
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.textSize('xs'),
                )}
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                  color: 'white',
                }}
              >
                {campaign.creator_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), 'text-on-surface-variant')}
          >
            {t(
              'campaignCard.byCreator',
              { name: campaign.creator_name },
              { defaultValue: 'by {{name}}' },
            )}
          </span>
        </div>

        <div className={cm.cn(cm.stack(4), 'mt-auto')}>
          <CampaignProgressBar
            pledgedCents={campaign.pledged_cents}
            goalCents={campaign.goal_cents}
            size="compact"
          />

          <div
            className={cm.cn(
              cm.flex({ align: 'baseline', justify: 'between' }),
              cm.sp('pt', 4),
              'border-t border-outline-variant',
            )}
          >
            <div>
              <p
                className={cm.cn(
                  cm.textSize('xl'),
                  cm.fontWeight('bold'),
                  'text-primary tabular-nums',
                )}
              >
                {fmtUsd(campaign.pledged_cents)}
              </p>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {fundedAtLeast
                  ? t('campaignCard.raised', {}, { defaultValue: 'Raised' })
                  : t('campaignCard.pledged', {}, { defaultValue: 'Pledged' })}
              </p>
            </div>
            <div className={cm.cn(cm.flex({ direction: 'col', align: 'end' }), cm.textSize('xs'))}>
              <span className={cm.cn(cm.fontWeight('bold'), 'text-on-surface tabular-nums')}>
                {t(
                  'campaignCard.backers',
                  { count: campaign.backer_count },
                  {
                    defaultValue: campaign.backer_count === 1 ? '1 backer' : '{{count}} backers',
                  },
                )}
              </span>
              <span className="text-on-surface-variant tabular-nums">
                {campaign.days_left > 0
                  ? t(
                      'campaignCard.daysLeft',
                      { count: campaign.days_left },
                      {
                        defaultValue:
                          campaign.days_left === 1 ? '1 day left' : '{{count}} days left',
                      },
                    )
                  : t('campaignCard.ended', {}, { defaultValue: 'Ended' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default CampaignCard
