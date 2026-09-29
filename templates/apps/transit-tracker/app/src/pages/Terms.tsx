import { LegalContentPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNav } from '../components/LandingTopNav.js'
import { loadContent } from '../config.js'

interface ClauseSummary {
  id: string
  icon: string
  titleKey: string
  titleDefault: string
  bodyKey: string
  bodyDefault: string
}

/** The design's carriage-clause index — a plain-language map onto the full
 * legal document above, kept factual to what the service actually does. */
const CLAUSES: ClauseSummary[] = [
  {
    id: 'scope',
    icon: 'gavel',
    titleKey: 'terms.clauses.scope.title',
    titleDefault: 'Scope of service & municipal jurisdiction',
    bodyKey: 'terms.clauses.scope.body',
    bodyDefault:
      "The app is a rider companion to the published transit network; the operating authority's rules govern carriage itself, and the service is offered under municipal jurisdiction.",
  },
  {
    id: 'fares',
    icon: 'confirmation_number',
    titleKey: 'terms.clauses.fares.title',
    titleDefault: 'Fare payment, turnstiles & SmartPass media',
    bodyKey: 'terms.clauses.fares.body',
    bodyDefault:
      'Fares are paid to the authority through its own media and turnstiles; the app plans and tracks your trips but never holds your fare media or payment credentials.',
  },
  {
    id: 'openData',
    icon: 'dataset',
    titleKey: 'terms.clauses.openData.title',
    titleDefault: 'Deterministic telemetry & GTFS open data license',
    bodyKey: 'terms.clauses.openData.body',
    bodyDefault:
      'Schedules, positions, and advisories come from feeds published under the GTFS open-data license, rendered exactly as published — boards never invent a departure.',
  },
  {
    id: 'conduct',
    icon: 'policy',
    titleKey: 'terms.clauses.conduct.title',
    titleDefault: 'Station code of conduct, bicycles & safety',
    bodyKey: 'terms.clauses.conduct.body',
    bodyDefault:
      "Conduct aboard vehicles and in stations — including bicycle and mobility-device rules — is set by the operator for everyone's safety and applies while you travel.",
  },
  {
    id: 'accountability',
    icon: 'account_balance',
    titleKey: 'terms.clauses.accountability.title',
    titleDefault: 'Statutory accountability, cash access & audit',
    bodyKey: 'terms.clauses.accountability.body',
    bodyDefault:
      "The network remains accountable to its statutory riders' charter: cash fare access is preserved and service data stays open to public audit.",
  },
  {
    id: 'ombudsman',
    icon: 'support_agent',
    titleKey: 'terms.clauses.ombudsman.title',
    titleDefault: 'Civic ombudsman, citations & appeals',
    bodyKey: 'terms.clauses.ombudsman.body',
    bodyDefault:
      'Disputes about citations or carriage can be escalated to the civic ombudsman; app accounts can be deleted at any time from Settings without losing that right.',
  },
]

/**
 * Standalone terms page: the bonded legal document (same copy as the footer
 * modal), followed by the Stitch design's plain-language clause index for
 * the carriage-specific sections.
 */
export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <>
      <LegalContentPage
        kind="terms"
        appName={APP_NAME}
        loadContent={loadContent}
        header={<LandingTopNav />}
      />

      {/* Plain-language clause index (design supplement) — under the legal
          document, above the footer. */}
      <section
        data-mol-id="terms-clause-index"
        className={cm.cn(cm.mxAuto, 'max-w-3xl', cm.sp('px', 6), cm.sp('pb', 20))}
      >
        <h2
          className={cm.cn(
            cm.textSize('2xl'),
            cm.fontWeight('bold'),
            cm.sp('mb', 3),
            'tracking-tight',
          )}
        >
          {t('terms.clausesHeading', {}, { defaultValue: 'Terms of carriage, in plain language' })}
        </h2>
        <p className={cm.cn(cm.textSize('base'), 'text-on-surface-variant leading-relaxed')}>
          {t(
            'terms.clausesIntro',
            { app: APP_NAME },
            {
              defaultValue:
                'The full agreement above is the binding text. This index maps its carriage-specific themes — how {{app}} relates to the transit network you ride — one card each.',
            },
          )}
        </p>
        <ul className={cm.cn('grid grid-cols-1 sm:grid-cols-2 gap-4', cm.sp('mt', 6))}>
          {CLAUSES.map((clause) => (
            <li
              key={clause.id}
              data-mol-id={`terms-clause-${clause.id}`}
              className={cm.cn(
                cm.sp('p', 5),
                'bg-surface-container-low rounded-2xl ring-1 ring-outline-variant/40',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.w(10),
                  cm.h(10),
                  'rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20',
                )}
                aria-hidden="true"
              >
                <span className="material-symbols-outlined text-xl">{clause.icon}</span>
              </span>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), cm.sp('mt', 3))}>
                {t(clause.titleKey, {}, { defaultValue: clause.titleDefault })}
              </h3>
              <p
                className={cm.cn(
                  cm.textSize('sm'),
                  cm.sp('mt', 1),
                  'text-on-surface-variant leading-relaxed',
                )}
              >
                {t(clause.bodyKey, {}, { defaultValue: clause.bodyDefault })}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <LandingFooter />
    </>
  )
}

export default Terms
export { Terms as TermsPage }
