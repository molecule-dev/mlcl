/**
 * Brand panel for the auth shell — left-side teal gradient card with
 * decorative blurred orbs, brand wordmark, headline, and stylized people-card
 * mocks. Used by Login / Signup / ForgotPassword / ResetPassword as the
 * §13.3 Decorated-Card brand panel.
 *
 * Translated from applicant-tracking's LoginBrandPanel.tsx — same anatomy
 * with HR-themed people mocks instead of pipeline stages.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'

export function LoginBrandPanel() {
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
        <p className={cm.cn('text-3xl font-black tracking-tighter')}>{APP_NAME}</p>
      </div>

      <div
        className={cm.cn('relative z-10', cm.flex({ direction: 'col', align: 'start', gap: 'lg' }))}
      >
        <h2 className={cm.cn('text-5xl font-extrabold leading-[1.05] tracking-tight')}>
          {t('loginBrandPanel.headline', {}, { defaultValue: 'A calmer place' })}
          <br />
          {t(
            'loginBrandPanel.headlineLine2',
            { tagline: APP_TAGLINE },
            { defaultValue: 'for people work.' },
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
                'Employees, PTO, org chart, and documents — one source of truth. Built for People teams who care about clarity, fairness, and human warmth.',
            },
          )}
        </p>

        <div className={cm.cn(cm.sp('mt', 4), 'flex w-full max-w-sm flex-col gap-4 opacity-95')}>
          <PersonMockCard
            initial="M"
            name="Maya Chen"
            jobTitle="Senior Backend Engineer"
            badge={t('status.active', {}, { defaultValue: 'Active' })}
            badgeTone="solid"
          />
          <PersonMockCard
            initial="L"
            name="Lena Okafor"
            jobTitle="Frontend Engineer · onboarding"
            badge={t('loginBrandPanel.badge.probation', {}, { defaultValue: 'Day 73' })}
            badgeTone="muted"
            indent
          />
          <PersonMockCard
            initial="J"
            name="Jordan Patel"
            jobTitle="Product Designer"
            badge={t('loginBrandPanel.badge.onLeave', {}, { defaultValue: 'On leave' })}
            badgeTone="muted"
            indent2
          />
        </div>
      </div>

      <p className={cm.cn('relative z-10 text-sm font-medium text-on-primary/60')}>
        {t(
          'loginBrandPanel.copyright',
          { year, app: APP_NAME },
          { defaultValue: '© {{year}} {{app}} People Co. Built for People teams.' },
        )}
      </p>
    </aside>
  )
}

function PersonMockCard({
  initial,
  name,
  jobTitle,
  badge,
  badgeTone,
  indent,
  indent2,
}: {
  initial: string
  name: string
  jobTitle: string
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
        <p className={cm.cn('text-[11px] text-on-primary/70')}>{jobTitle}</p>
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
