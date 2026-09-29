import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { Link } from 'react-router'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()

  // The real capabilities an expanded plan unlocks — never fictional perks.
  const horizons = [
    {
      key: 'profiles',
      icon: 'account_tree',
      title: t(
        'planUpdated.horizon.profiles',
        {},
        { defaultValue: 'Room for thousands of ancestral profiles' },
      ),
      body: t(
        'planUpdated.horizon.profilesBody',
        {},
        {
          defaultValue:
            'Paid archives carry far deeper trees than the Seedling tier — grow through centuries without pruning.',
        },
      ),
    },
    {
      key: 'features',
      icon: 'auto_awesome',
      title: t('planUpdated.horizon.features', {}, { defaultValue: 'Advanced archival features' }),
      body: t(
        'planUpdated.horizon.featuresBody',
        {},
        {
          defaultValue: 'The full toolkit — every advanced feature the archive offers, unlocked.',
        },
      ),
    },
    {
      key: 'export',
      icon: 'download',
      title: t('planUpdated.horizon.export', {}, { defaultValue: 'Complete data export' }),
      body: t(
        'planUpdated.horizon.exportBody',
        {},
        {
          defaultValue:
            'Download every person and relationship at any time — your archive is never held hostage.',
        },
      ),
    },
  ]

  const receiptDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const nextActions = [
    {
      key: 'tree',
      to: '/tree',
      icon: 'park',
      label: t('planUpdated.action.tree', {}, { defaultValue: 'Return to your tree' }),
    },
    {
      key: 'person',
      to: '/people/new',
      icon: 'person_add',
      label: t(
        'planUpdated.action.person',
        {},
        { defaultValue: 'Record a new soul into the ledger' },
      ),
    },
    {
      key: 'settings',
      to: '/settings',
      icon: 'settings',
      label: t(
        'planUpdated.action.settings',
        {},
        { defaultValue: 'Review export & custody controls' },
      ),
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-plan-updated"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('settings.billing', {}, { defaultValue: 'Billing' })}
      title={t('planUpdated.message', {}, { defaultValue: 'Your Archival Sanctuary is Expanded.' })}
      subtitle={t('planUpdated.thankYou', {}, { defaultValue: 'Thank you!' })}
    >
      <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
        <PlanUpdatedPage />

        {/* Custodial Pact Receipt */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="plan-updated-receipt"
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('planUpdated.receiptTitle', {}, { defaultValue: 'Custodial Pact Receipt' })}
          </h2>
          <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
            {t(
              'planUpdated.receiptLine',
              { date: receiptDate },
              {
                defaultValue:
                  'Confirmed {{date}} — your expanded sanctuary is active on every device you sign into.',
              },
            )}
          </p>
        </section>

        {/* Newly Unlocked Archival Horizons */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="plan-updated-horizons"
        >
          <h2
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 4),
            )}
          >
            {t(
              'planUpdated.horizonsTitle',
              {},
              { defaultValue: 'Newly Unlocked Archival Horizons' },
            )}
          </h2>
          <ul className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
            {horizons.map((h) => (
              <li key={h.key} className={cm.cn(cm.flex({ align: 'start', gap: 'sm' }))}>
                <div
                  className={cm.cn(
                    cm.w(9),
                    cm.h(9),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    'shrink-0',
                  )}
                  style={{
                    backgroundColor: 'var(--color-tree-root-bg)',
                    color: 'var(--color-tree-root)',
                  }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[18px]">{h.icon}</span>
                </div>
                <div className="min-w-0">
                  <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                    {h.title}
                  </h3>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>{h.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Recommended Next Actions */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="plan-updated-actions"
        >
          <h3
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
              cm.sp('mb', 3),
            )}
          >
            {t('planUpdated.actionsTitle', {}, { defaultValue: 'Recommended Next Actions' })}
          </h3>
          <div className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'sm' }))}>
            {nextActions.map((a) => (
              <Link
                key={a.key}
                to={a.to}
                data-mol-id={`plan-updated-action-${a.key}`}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  'rounded-lg border border-outline-variant/50 hover:bg-surface-container transition-colors',
                )}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  {a.icon}
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Custody covenant trust band */}
        <section
          className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
          data-mol-id="plan-updated-covenant"
        >
          <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'planUpdated.covenantTitle',
              {},
              { defaultValue: 'The Branches Archival Promise & Custody Covenant' },
            )}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 2))}>
            {t(
              'planUpdated.covenantBody',
              {},
              {
                defaultValue:
                  'Your records stay private to your account, are never sold or indexed, and remain yours to export or delete at any time.',
              },
            )}{' '}
            <Link to="/privacy" className={cm.cn('font-bold text-primary hover:underline')}>
              {t('planUpdated.covenantLink', {}, { defaultValue: 'Read the covenant' })}
            </Link>
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default PlanUpdated
