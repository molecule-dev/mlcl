/**
 * Auth brand panel — left half of decorated split-card layout. Indigo→cyan
 * gradient mesh, neural-orb decoration, app brand mark, eyebrow tagline,
 * and an embedded sample meeting tile that mirrors the in-app hero card.
 *
 * Translated from §13.3 (Decorated-Card with Brand Panel) and the
 * §13.4 corner-orb / neural-mesh / sample-card overlay recipes used by
 * crm, helpdesk, property-listing, ai-chatbot-builder.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

import { BrandWordmark } from './BrandWordmark.js'

export function AuthBrandPanel() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <aside
      className={cm.cn(
        cm.flex({ direction: 'col', justify: 'between' }),
        cm.sp('p', 12),
        'relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-secondary text-on-primary',
      )}
    >
      <div className={cm.cn('relative z-10', cm.stack(6))}>
        <div className={cm.stack(2)}>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-primary/70',
            )}
          >
            {t('auth.eyebrow', { appName: APP_NAME }, { defaultValue: '{{appName}}' })}
          </p>
          <BrandWordmark as="span" invert />
        </div>
        <h2 className={cm.cn('text-4xl font-extrabold leading-[1.1] tracking-tight max-w-md')}>
          {t('app.tagline', {}, { defaultValue: 'Where teams come alive' })}
        </h2>
        <p className={cm.cn(cm.textSize('base'), 'text-on-primary/80 max-w-md leading-relaxed')}>
          {t(
            'landing.subtitle',
            {},
            {
              defaultValue:
                'Crisp video, pristine audio, and live collaboration surfaces — chat, screen share, and recordings — for every standup, client call, and workshop.',
            },
          )}
        </p>
      </div>
      <div
        className={cm.cn(
          'relative z-10',
          cm.sp('p', 5),
          'bg-surface/15 backdrop-blur-md rounded-2xl border border-surface/20',
        )}
      >
        <div className={cm.flex({ align: 'center', gap: 3 })}>
          <div className={'w-2 h-2 rounded-full bg-success animate-pulse'} />
          <span
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-primary/80',
            )}
          >
            {t('meeting.inMeeting', {}, { defaultValue: 'In meeting' })}
          </span>
        </div>
        <h3 className={cm.cn(cm.sp('mt', 2), cm.textSize('lg'), cm.fontWeight('semibold'))}>
          {t(
            'landing.sampleTitle',
            { appName: APP_NAME },
            { defaultValue: 'Today at {{appName}}' },
          )}
        </h3>
        <p className={cm.cn(cm.sp('mt', 1), cm.textSize('xs'), 'text-on-primary/70')}>
          {t('meetingHeroCard.attendees', { count: 8 }, { defaultValue: '{{count}} attendees' })}
        </p>
        <div className={cm.cn(cm.sp('mt', 4), 'flex -space-x-2')}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={
                'w-8 h-8 rounded-full border-2 border-surface/30 bg-surface/20 flex items-center justify-center text-xs font-bold'
              }
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
      </div>
      <div
        className={
          'absolute -right-32 -top-32 w-80 h-80 rounded-full bg-secondary/40 blur-3xl pointer-events-none'
        }
      />
      <div
        className={
          'absolute -left-20 bottom-0 w-72 h-72 rounded-full bg-surface/10 blur-3xl pointer-events-none'
        }
      />
      <div
        className={
          'absolute right-12 bottom-1/3 w-32 h-32 rounded-full bg-surface/15 blur-2xl pointer-events-none'
        }
      />
    </aside>
  )
}
