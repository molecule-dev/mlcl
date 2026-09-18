import { Link, useParams } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'

const NEXT_STEPS = [
  {
    icon: 'forum',
    key: 'message',
    defaultText: 'Send your host a quick note about loading dock access or special equipment.',
  },
  {
    icon: 'calendar_today',
    key: 'calendar',
    defaultText:
      'Add the booking to your calendar — {{appName}} sends a 24h reminder automatically.',
  },
  {
    icon: 'group',
    key: 'invite',
    defaultText: 'Share the venue address with your team or vendors when you are ready.',
  },
] as const

export function BookingConfirmation() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const code =
    (id ?? 'preview')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(-8) || 'ALCV9F4K'

  return (
    <div className={cm.cn(cm.maxW('4xl'), cm.sp('px', 6), cm.sp('py', 12), cm.mxAuto)}>
      <section
        className={cm.cn(
          cm.sp('p', 10),
          cm.textCenter,
          'relative overflow-hidden bg-gradient-to-br from-primary to-primary-container rounded-[2rem] text-on-primary',
        )}
      >
        <div
          className={cm.cn(
            cm.w(80),
            cm.h(80),
            cm.roundedFull,
            'absolute -right-24 -top-24 bg-surface/10 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div
          className={cm.cn(
            cm.w(64),
            cm.h(64),
            cm.roundedFull,
            'absolute -left-20 -bottom-20 bg-accent/30 blur-3xl',
          )}
          aria-hidden="true"
        />
        <div className="relative z-10">
          <span
            className={cm.cn(
              'inline-flex items-center justify-center w-20 h-20 rounded-full bg-surface/15 backdrop-blur-md ring-2 ring-white/30',
            )}
          >
            <span
              className="material-symbols-outlined text-5xl text-accent"
              aria-hidden="true"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              celebration
            </span>
          </span>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              cm.sp('mt', 6),
              'uppercase tracking-[0.25em] text-accent',
            )}
          >
            {t('bookingConfirmation.eyebrow', {}, { defaultValue: 'Booking confirmed' })}
          </p>
          <h1
            className={cm.cn(
              cm.textSize('5xl'),
              cm.fontWeight('extrabold'),
              cm.sp('mt', 4),
              'leading-[0.95]',
            )}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            {t('bookingConfirmation.heading', {}, { defaultValue: 'Your space is reserved.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('lg'),
              cm.sp('mt', 4),
              cm.maxW('xl'),
              cm.mxAuto,
              'text-on-primary/85',
            )}
          >
            {t(
              'bookingConfirmation.subheading',
              {},
              {
                defaultValue:
                  'A confirmation is on its way to your inbox. Your host will reach out with arrival details a day before the event.',
              },
            )}
          </p>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 6),
              'tracking-widest text-on-primary/80',
            )}
          >
            {t('bookingConfirmation.code', { code }, { defaultValue: 'CONFIRMATION #{{code}}' })}
          </p>
        </div>
      </section>

      <section className={cm.sp('mt', 10)}>
        <h2
          className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), cm.sp('mb', 4))}
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif', letterSpacing: '-0.02em' }}
        >
          {t('bookingConfirmation.nextSteps', {}, { defaultValue: 'A few next steps' })}
        </h2>
        <ol className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          {NEXT_STEPS.map((step, i) => (
            <li
              key={step.key}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-low rounded-2xl border border-outline-variant/40',
                cm.flex({ align: 'center', gap: 'md' }),
              )}
            >
              <span
                className={cm.cn(
                  'w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center',
                )}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {step.icon}
                </span>
              </span>
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }))}>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(
                    `bookingConfirmation.step.${i + 1}.label`,
                    {},
                    { defaultValue: `Step ${i + 1}` },
                  )}
                </p>
                <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                  {t(
                    `bookingConfirmation.step.${step.key}`,
                    { appName: APP_NAME },
                    { defaultValue: step.defaultText },
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div
        className={cm.cn(
          cm.sp('mt', 10),
          cm.flex({ align: 'center', gap: 'sm', justify: 'center', wrap: 'wrap' }),
        )}
      >
        <Link
          to="/reservations"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('bold'),
            'rounded-full bg-primary text-on-primary hover:bg-primary-container transition-colors',
          )}
        >
          {t('bookingConfirmation.viewBooking', {}, { defaultValue: 'View my reservations' })}
        </Link>
        <Link
          to="/search"
          className={cm.cn(
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.fontWeight('semibold'),
            'rounded-full border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary transition-colors',
          )}
        >
          {t('bookingConfirmation.browseMore', {}, { defaultValue: 'Browse more spaces' })}
        </Link>
      </div>
    </div>
  )
}
