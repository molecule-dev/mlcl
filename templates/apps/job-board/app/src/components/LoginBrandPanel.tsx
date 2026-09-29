/**
 * Brand panel for the Placement auth shell — left-side cyan→navy gradient
 * panel with decorative blurred orbs, brand wordmark, headline, stylized
 * mock job-listing rows, and a copyright line. Used by Login / Signup /
 * ForgotPassword / ResetPassword as the §13.3 Decorated-Card brand panel.
 *
 * Translated from applicant-tracking's LoginBrandPanel — same gradient +
 * mock-stage cards anatomy, with Placement's seeker/employer mock listings
 * instead of pipeline stages.
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
        'hidden lg:flex w-[42%] flex-col justify-between bg-gradient-to-br from-primary to-secondary relative overflow-hidden text-white',
      )}
      aria-hidden="true"
    >
      <div
        className={cm.cn(
          'absolute -top-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-surface/5 blur-3xl',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn(
          'absolute -bottom-32 -right-20 h-[28rem] w-[28rem] rounded-full bg-success/20 blur-3xl',
        )}
        aria-hidden="true"
      />

      <div className={cm.cn('relative z-10')}>
        <BrandWordmark as="span" size="lg" invert />
      </div>

      <div
        className={cm.cn('relative z-10', cm.flex({ direction: 'col', align: 'start', gap: 'lg' }))}
      >
        <h2 className={cm.cn('text-5xl font-extrabold leading-[1.05] tracking-tight')}>
          {t('loginBrandPanel.headline', {}, { defaultValue: 'Where talent meets' })}
          <br />
          {t(
            'loginBrandPanel.headlineLine2',
            { tagline: APP_TAGLINE },
            { defaultValue: 'momentum.' },
          )}
        </h2>

        <p className={cm.cn(cm.maxW('sm'), 'text-lg font-medium leading-relaxed text-white/80')}>
          {t(
            'loginBrandPanel.subtext',
            {},
            {
              defaultValue:
                'Search every open role across every team. Track applications from submitted to offer. Post once, reach the right candidates fast.',
            },
          )}
        </p>

        {/* Stylized mock job-listing rows */}
        <div className={cm.cn('mt-4 flex w-full max-w-sm flex-col gap-4 opacity-95')}>
          <MockListingRow
            tone="muted"
            initial="A"
            title={t(
              'loginBrandPanel.listing.engineer',
              {},
              { defaultValue: 'Senior Backend Engineer' },
            )}
            meta="Acuity · Remote · $160k–200k"
          />
          <MockListingRow
            tone="muted"
            initial="N"
            indent
            title={t('loginBrandPanel.listing.designer', {}, { defaultValue: 'Product Designer' })}
            meta="Northwind · NY · $130k–170k"
          />
          <MockListingRow
            tone="solid"
            initial="P"
            indent2
            title={t('loginBrandPanel.listing.recruiter', {}, { defaultValue: 'Talent Partner' })}
            meta="Polaris · Hybrid · $110k–140k"
          />
        </div>
      </div>

      <p className={cm.cn('relative z-10 text-sm font-medium text-white/60')}>
        {t(
          'loginBrandPanel.copyright',
          { year, app: APP_NAME },
          { defaultValue: '© {{year}} {{app}}. Built for hiring teams.' },
        )}
      </p>
    </aside>
  )
}

function MockListingRow({
  initial,
  title,
  meta,
  tone,
  indent,
  indent2,
}: {
  initial: string
  title: string
  meta: string
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
          'h-10 w-10 shrink-0 grid place-items-center rounded-lg font-bold',
          tone === 'solid' ? 'bg-success text-white' : 'bg-surface/20 text-white',
        )}
      >
        {initial}
      </div>
      <div className={cm.cn('min-w-0 flex-1')}>
        <p className={cm.cn('text-sm font-bold tracking-tight')}>{title}</p>
        <p className={cm.cn('text-[11px] font-medium text-white/70')}>{meta}</p>
      </div>
    </div>
  )
}
