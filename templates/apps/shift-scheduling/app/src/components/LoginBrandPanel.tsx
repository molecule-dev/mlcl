/**
 * Brand panel for the auth shell — left-side indigo gradient card with
 * decorative blurred orbs, brand wordmark, headline, and stylized shift-card
 * mocks. Used by Login / Signup / ForgotPassword / ResetPassword as the
 * §13.3 Decorated-Card brand panel.
 *
 * Translated from hr-management's LoginBrandPanel.tsx — same anatomy with
 * shift-themed roster mocks instead of people-status cards.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

export interface BrandPanelFeature {
  icon: string
  title: string
  body: string
}

export function LoginBrandPanel({ features }: { features?: BrandPanelFeature[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <aside
      className={cm.cn(
        cm.sp('p', 12),
        'hidden lg:flex w-[42%] flex-col justify-between bg-gradient-to-br from-primary to-primary-container relative overflow-hidden text-on-primary',
      )}
      aria-hidden="true"
    >
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -top-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-surface/5 blur-3xl',
        )}
      />
      <div
        aria-hidden="true"
        className={cm.cn(
          'absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-secondary-fixed/15 blur-3xl',
        )}
      />

      <div className={cm.cn('relative z-10')}>
        <BrandWordmark as="span" size="lg" invert />
      </div>

      <div
        className={cm.cn('relative z-10', cm.flex({ direction: 'col', align: 'start', gap: 'lg' }))}
      >
        <h2 className={cm.cn('text-5xl font-extrabold leading-[1.05] tracking-tight')}>
          {t('loginBrandPanel.headline', {}, { defaultValue: 'Every shift,' })}
          <br />
          {t(
            'loginBrandPanel.headlineLine2',
            { tagline: APP_TAGLINE },
            { defaultValue: 'covered on time.' },
          )}
        </h2>

        <p
          className={cm.cn(cm.maxW('sm'), 'text-lg font-medium leading-relaxed text-on-primary/80')}
        >
          {t(
            'loginBrandPanel.subtext',
            {},
            {
              defaultValue:
                'Weekly rosters, availability, swap approvals, open shifts, and timesheets — one source of truth. Built for managers of hourly teams who care about fair, predictable schedules.',
            },
          )}
        </p>

        <div className={cm.cn(cm.sp('mt', 4), 'flex w-full max-w-sm flex-col gap-4 opacity-95')}>
          {features?.map((f) => (
            <div
              key={f.title}
              className={cm.cn(
                cm.sp('p', 4),
                'flex items-start gap-3 rounded-xl bg-surface/10 backdrop-blur-md border border-surface/10',
              )}
            >
              <span
                aria-hidden="true"
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  'h-10 w-10 shrink-0 rounded-lg bg-surface/20',
                )}
              >
                <span className={cm.cn('material-symbols-outlined text-[20px]')}>{f.icon}</span>
              </span>
              <span className={cm.cn('min-w-0 flex-1')}>
                <span className={cm.cn('block text-sm font-bold tracking-tight')}>{f.title}</span>
                <span className={cm.cn('block text-[11px] leading-relaxed text-on-primary/70')}>
                  {f.body}
                </span>
              </span>
            </div>
          ))}
          <ShiftMockCard
            initial="D"
            name="Dana W. · Shift Lead"
            time="Mon 06:00–14:00"
            badge={t('loginBrandPanel.badge.published', {}, { defaultValue: 'Published' })}
            badgeTone="solid"
          />
          <ShiftMockCard
            initial="P"
            name="Priya R. · Barista"
            time="Tue 07:00–15:00"
            badge={t('loginBrandPanel.badge.claimed', {}, { defaultValue: 'Claimed' })}
            badgeTone="muted"
            indent
          />
          <ShiftMockCard
            initial="?"
            name="Open shift · Cook"
            time="Fri 12:00–20:00"
            badge={t('loginBrandPanel.badge.open', {}, { defaultValue: 'Open' })}
            badgeTone="muted"
            indent2
          />
        </div>
      </div>

      <p className={cm.cn('relative z-10 text-sm font-medium text-on-primary/60')}>
        {t(
          'loginBrandPanel.copyright',
          { year, app: APP_NAME },
          { defaultValue: '© {{year}} {{app}} Scheduling Co. Built for hourly teams.' },
        )}
      </p>
    </aside>
  )
}

function ShiftMockCard({
  initial,
  name,
  time,
  badge,
  badgeTone,
  indent,
  indent2,
}: {
  initial: string
  name: string
  time: string
  badge: string
  badgeTone: 'muted' | 'solid'
  indent?: boolean
  indent2?: boolean
}) {
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.sp('p', 4),
        'flex items-center gap-4 rounded-xl bg-surface/10 backdrop-blur-md border border-surface/10',
        indent ? 'ml-6' : '',
        indent2 ? 'ml-12' : '',
      )}
    >
      <div
        className={cm.cn(
          'h-10 w-10 shrink-0 grid place-items-center rounded-full bg-surface/20 text-on-primary font-bold',
        )}
      >
        {initial}
      </div>
      <div className={cm.cn('min-w-0 flex-1')}>
        <p className={cm.cn('text-sm font-bold tracking-tight')}>{name}</p>
        <p className={cm.cn('text-[11px] text-on-primary/70')}>{time}</p>
      </div>
      <span
        className={cm.cn(
          cm.sp('px', 2),
          cm.sp('py', 1),
          'rounded-full text-[10px] font-black uppercase tracking-widest',
          badgeTone === 'solid'
            ? 'bg-secondary text-on-secondary'
            : 'bg-surface/20 text-on-primary',
        )}
      >
        {badge}
      </span>
    </div>
  )
}
