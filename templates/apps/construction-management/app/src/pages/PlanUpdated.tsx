import { useEffect } from 'react'

import { ContentPageShell, PlanUpdatedPage } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Returned-from-Stripe confirmation page. Wraps the canonical
 * `@molecule/app-legal-pages-react` `PlanUpdatedPage` with our app-specific
 * keys + defaults so the wording can be localized per-app without forking
 * the shared component, then answers the super's real next question — what
 * changed and what happens to the jobsites already on the account.
 *
 * @returns The rendered plan-updated page.
 */
export function PlanUpdated() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const heading = t('planUpdated.heading', {}, { defaultValue: 'Your plan has been updated' })

  useEffect(() => {
    document.title = heading
  }, [heading])

  const nextSteps = [
    {
      icon: 'rocket_launch',
      key: 'planRevision.steps.limits.title',
      def: 'New limits are live now',
      bodyKey: 'planRevision.steps.limits.body',
      bodyDef:
        'Project, RFI, and punch caps apply immediately — no re-deploy, no per-user charges for your trade subcontractors.',
    },
    {
      icon: 'domain',
      key: 'planRevision.steps.projects.title',
      def: 'Existing jobsites untouched',
      bodyKey: 'planRevision.steps.projects.body',
      bodyDef:
        'Every project keeps its daily logs, punch items, RFI threads, and trade directory exactly as they were when the plan changed.',
    },
    {
      icon: 'home_work',
      key: 'planRevision.steps.trailer.title',
      def: 'The trailer keeps working',
      bodyKey: 'planRevision.steps.trailer.body',
      bodyDef:
        'Offline caches on field tablets stay valid; devices reconcile normally the next time they reach the jobsite network.',
    },
  ]

  return (
    // No shell `title`/`subtitle`: PlanUpdatedPage renders its own heading
    // pair (message + thank-you) — passing them here too put the same
    // confirmation on screen twice and broke getByText strict mode.
    <ContentPageShell dataMolId="page-plan-updated" bare containerSize="md">
      <div className="space-y-10">
        <PlanUpdatedPage
          messageKey="planUpdated.heading"
          messageDefault={heading}
          thankYouKey="planUpdated.subheading"
          thankYouDefault="Thank you!"
          actionKey="planUpdated.returnButton"
          actionDefault="Return home"
        />

        {/* What the plan revision means for the jobsites already running */}
        <section
          data-mol-id="plan-updated-next"
          className={cm.cn(cm.card(), cm.sp('p', 6), 'space-y-4')}
        >
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'tracking-tight')}>
            {t(
              'planRevision.heading',
              {},
              { defaultValue: 'Plan revision conformed across your jobsites' },
            )}
          </h2>
          <ul className="space-y-4">
            {nextSteps.map((step) => (
              <li key={step.key} className={cm.flex({ gap: 'md', align: 'start' })}>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-container text-on-primary-container shrink-0"
                >
                  <span
                    className={cm.cn('material-symbols-outlined', cm.textSize('sm'))}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {step.icon}
                  </span>
                </span>
                <div>
                  <p className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
                    {t(step.key, {}, { defaultValue: step.def })}
                  </p>
                  <p
                    className={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), 'text-on-surface-variant')}
                  >
                    {t(step.bodyKey, {}, { defaultValue: step.bodyDef })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default PlanUpdated
