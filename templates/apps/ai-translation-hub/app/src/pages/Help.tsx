import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

export function Help() {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-background text-on-surface',
      )}
    >
      <Header />
      <main
        data-mol-id="page-help"
        className={cm.cn(
          cm.container({ size: 'md' }),
          cm.sp('py', 12),
          cm.flex({ direction: 'col', gap: 'lg' }),
          cm.flex1,
        )}
      >
        <header>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('help.eyebrow', {}, { defaultValue: 'Help center' })}
          </p>
          <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mt', 2))}>
            {t('help.title', { app: APP_NAME }, { defaultValue: `How ${APP_NAME} works` })}
          </h1>
          <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
            {t(
              'help.subtitle',
              {},
              {
                defaultValue:
                  'Pick a section, or sign in to chat with us from the in-app composer.',
              },
            )}
          </p>
        </header>

        <section className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-surface-container bg-surface-container-lowest',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('help.start.title', {}, { defaultValue: 'Start translating in 5 minutes' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'help.start.body',
                { app: APP_NAME },
                {
                  defaultValue: `Create a new project, upload a .docx, .json, or .po, choose your target locales, and ${APP_NAME} pre-fills every segment with Claude + DeepL suggestions.`,
                },
              )}
            </p>
            <Link
              to="/projects/new"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('mt', 3),
                'inline-flex items-center gap-1 text-primary hover:underline',
              )}
              data-mol-id="help-link-new-project"
            >
              {t('help.start.cta', {}, { defaultValue: 'Create your first project →' })}
            </Link>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-surface-container bg-surface-container-lowest',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('help.glossary.title', {}, { defaultValue: 'Lock terminology with a glossary' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'help.glossary.body',
                {},
                {
                  defaultValue:
                    'Add approved source/target term pairs in the Glossary tab. Translate and Review will warn whenever a segment diverges.',
                },
              )}
            </p>
            <Link
              to="/glossary"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('mt', 3),
                'inline-flex items-center gap-1 text-primary hover:underline',
              )}
              data-mol-id="help-link-glossary"
            >
              {t('help.glossary.cta', {}, { defaultValue: 'Open glossary →' })}
            </Link>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-surface-container bg-surface-container-lowest',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('help.team.title', {}, { defaultValue: 'Invite reviewers' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'help.team.body',
                {},
                {
                  defaultValue:
                    'Workspace owners can add translators, reviewers, and viewers from the Team tab. Roles control who can approve segments versus suggest edits.',
                },
              )}
            </p>
            <Link
              to="/team"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('mt', 3),
                'inline-flex items-center gap-1 text-primary hover:underline',
              )}
              data-mol-id="help-link-team"
            >
              {t('help.team.cta', {}, { defaultValue: 'Manage team →' })}
            </Link>
          </article>

          <article
            className={cm.cn(
              cm.sp('p', 5),
              'rounded-2xl border border-surface-container bg-surface-container-lowest',
            )}
          >
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('help.billing.title', {}, { defaultValue: 'Billing and word usage' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), cm.sp('mt', 2), 'text-on-surface-variant')}>
              {t(
                'help.billing.body',
                {},
                {
                  defaultValue:
                    'Plans are word-metered and renew monthly. Upgrade or cancel from Billing — Stripe handles the checkout and webhook flips the active plan.',
                },
              )}
            </p>
            <Link
              to="/pricing"
              className={cm.cn(
                cm.fontWeight('semibold'),
                cm.textSize('sm'),
                cm.sp('mt', 3),
                'inline-flex items-center gap-1 text-primary hover:underline',
              )}
              data-mol-id="help-link-pricing"
            >
              {t('help.billing.cta', {}, { defaultValue: 'See pricing →' })}
            </Link>
          </article>
        </section>

        <footer className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
          <Link to="/" className={cm.cn(cm.fontWeight('semibold'), 'text-primary hover:underline')}>
            {t('auth.backToHomeArrow', {}, { defaultValue: '← Back to home' })}
          </Link>
        </footer>
      </main>
      <Footer />
    </div>
  )
}

export default Help
export { Help as HelpPage }
