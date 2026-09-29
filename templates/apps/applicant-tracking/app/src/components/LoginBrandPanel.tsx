/**
 * Brand panel for the auth shell — left-side indigo gradient card with
 * decorative blurred orbs, brand wordmark, headline, stylized pipeline-stage
 * mock cards, and a copyright line. Used by Login / Signup / ForgotPassword
 * / ResetPassword as the §13.3 Decorated-Card brand panel.
 *
 * Translated from crm's LoginBackground / property-listing's brand panel +
 * the original Stitch-generated indigo gradient panel for Shortlist.
 */
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from './BrandWordmark.js'

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
        <BrandWordmark as="span" size="lg" invert />
      </div>

      <div
        className={cm.cn('relative z-10', cm.flex({ direction: 'col', align: 'start', gap: 'lg' }))}
      >
        <h2 className={cm.cn('text-5xl font-extrabold leading-[1.05] tracking-tight')}>
          {t('loginBrandPanel.headline', {}, { defaultValue: 'Hire with' })}
          <br />
          {t(
            'loginBrandPanel.headlineLine2',
            { tagline: APP_TAGLINE },
            { defaultValue: 'clarity.' },
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
                'Drag candidates through Sourced → Screening → Interview → Offer → Hired. AI screens. Fairness pulse keeps every stage honest.',
            },
          )}
        </p>

        {/* Stylized pipeline-stage cards */}
        <div className={cm.cn(cm.sp('mt', 4), 'flex w-full max-w-sm flex-col gap-4 opacity-95')}>
          <PipelineMockCard
            icon="person_search"
            tone="muted"
            label={t('loginBrandPanel.stage.sourced', {}, { defaultValue: 'Sourced' })}
          />
          <PipelineMockCard
            icon="checklist"
            tone="muted"
            indent
            label={t('loginBrandPanel.stage.screening', {}, { defaultValue: 'Screening' })}
          />
          <PipelineMockCard
            icon="check_circle"
            tone="solid"
            indent2
            label={t('loginBrandPanel.stage.interview', {}, { defaultValue: 'Interview' })}
          />
        </div>
      </div>

      <p className={cm.cn('relative z-10 text-sm font-medium text-on-primary/60')}>
        {t(
          'loginBrandPanel.copyright',
          { year, app: APP_NAME },
          { defaultValue: '© {{year}} {{app}} Inc. Built for hiring teams.' },
        )}
      </p>
    </aside>
  )
}

function PipelineMockCard({
  icon,
  label,
  tone,
  indent,
  indent2,
}: {
  icon: string
  label: string
  tone: 'muted' | 'solid'
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
          'h-10 w-10 shrink-0 grid place-items-center rounded-full',
          tone === 'solid' ? 'bg-secondary text-on-secondary' : 'bg-surface/20 text-on-primary',
        )}
      >
        <span className={cm.cn('material-symbols-outlined text-[22px]')} aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className={cm.cn('min-w-0 flex-1')}>
        <p className={cm.cn('text-sm font-bold tracking-tight')}>{label}</p>
        <div className={cm.cn('mt-1 h-1.5 w-2/3 rounded-full bg-surface/35')} />
      </div>
    </div>
  )
}
