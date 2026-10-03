import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/**
 * The privacy covenant — the design's archival privacy page with copy that
 * states exactly what this archive does and does not do. Where the design
 * promises capabilities the product does not implement (zero-knowledge
 * client-side encryption, a 100-year escrow service), the section states
 * the real practice instead; those divergences are recorded in
 * `design-coverage.json`.
 */

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const sections = [
    { id: 'covenant', key: 'privacy.nav.covenant', def: 'The Core Archival Covenant' },
    { id: 'custody', key: 'privacy.nav.custody', def: 'What We Custody & Why' },
    { id: 'bio', key: 'privacy.nav.bio', def: 'Biometrics, DNA & Oral Audio Policy' },
    {
      id: 'infrastructure',
      key: 'privacy.nav.infrastructure',
      def: 'Subprocessors & Hosting Infrastructure',
    },
    { id: 'controls', key: 'privacy.nav.controls', def: 'Kinship Circle Permission Controls' },
    { id: 'export', key: 'privacy.nav.export', def: 'Export Rights & Portability' },
    { id: 'fade', key: 'privacy.nav.fade', def: 'Right to Complete Deletion (“Right to Fade”)' },
    { id: 'stewards', key: 'privacy.nav.stewards', def: 'Contact Our Data Stewards' },
  ]

  const h2 = (text: string, anchor?: string) => (
    <h2 id={anchor} className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
      {text}
    </h2>
  )

  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('privacy.eyebrow', {}, { defaultValue: 'Privacy' })}
      title={t(
        'privacy.title',
        {},
        { defaultValue: 'Your lineage is a sacred heirloom, never a commodity.' },
      )}
      subtitle={t(
        'privacy.updated',
        {},
        { defaultValue: 'How your archive custodies family records — in plain terms.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {/* Covenant Sections — on-page index */}
        <section data-mol-id="privacy-sections" className={cm.cn(cm.stack(2))}>
          {h2(t('privacy.sectionsTitle', {}, { defaultValue: 'Covenant Sections' }), 'sections')}
          <ul className={cm.cn(cm.grid({ gap: 'sm' }), 'grid-cols-1 sm:grid-cols-2 list-none p-0')}>
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={cm.cn(
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'text-primary hover:underline',
                  )}
                >
                  {t(s.key, {}, { defaultValue: s.def })}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section data-mol-id="privacy-covenant" className={cm.cn(cm.stack(2))}>
          {h2(
            t('privacy.covenantTitle', {}, { defaultValue: 'The Core Archival Covenant' }),
            'covenant',
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.covenantIntro',
              { app: APP_NAME },
              {
                defaultValue: `${APP_NAME} keeps a private archive of the family records you enter. The covenant is short and absolute:`,
              },
            )}
          </p>
          <ul className={cm.cn(cm.stack(2), cm.prose, 'text-on-surface-variant', 'list-disc pl-6')}>
            <li>
              {t(
                'privacy.covenant1',
                {},
                {
                  defaultValue:
                    'Your records are private to your account — never indexed, never sold, never shared as data.',
                },
              )}
            </li>
            <li>
              {t(
                'privacy.covenant2',
                {},
                { defaultValue: 'You own your records; the archive only hosts them for you.' },
              )}
            </li>
            <li>
              {t(
                'privacy.covenant3',
                {},
                { defaultValue: 'You can export everything, and delete everything, at any time.' },
              )}
            </li>
            <li>
              {t(
                'privacy.covenant4',
                {},
                { defaultValue: 'Your content is never used to train AI models.' },
              )}
            </li>
          </ul>
        </section>

        <section data-mol-id="privacy-custody" className={cm.cn(cm.stack(2))}>
          {h2(t('privacy.custodyTitle', {}, { defaultValue: 'What We Custody & Why' }), 'custody')}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.custodyBody',
              {},
              {
                defaultValue:
                  'The archive stores only what you enter to build your tree: person records (names, name forms, gender, dates, places, and your notes), the relationships between them, and your account record (display name, email, a securely hashed passphrase) with the session and device list needed to keep that account secure. Nothing else is collected — no trackers follow you around the archive.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="privacy-bio" className={cm.cn(cm.stack(2))}>
          {h2(
            t('privacy.bioTitle', {}, { defaultValue: 'Biometrics, DNA & Oral Audio Policy' }),
            'bio',
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.bioBody',
              {},
              {
                defaultValue:
                  'This archive is deliberately text-only. We do not collect biometric samples, DNA test data, or audio/video recordings, and we never broker such data. Please keep photographs of documents and links to outside archives in your research notes rather than uploading the media itself.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="privacy-infrastructure" className={cm.cn(cm.stack(2))}>
          {h2(
            t(
              'privacy.infrastructureTitle',
              {},
              { defaultValue: 'Subprocessors & Hosting Infrastructure' },
            ),
            'infrastructure',
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.infrastructureBody',
              {},
              {
                defaultValue:
                  'Your archive runs on managed cloud infrastructure. Passphrases are stored only as bcrypt hashes, sessions ride signed httpOnly tokens, and transport is encrypted. The small set of providers needed to operate the service (hosting, email delivery for account messages, and payment processing for paid tiers) act only on our instruction to run the archive — none of them receives your records for their own purposes, and we do not sell data to advertising or analytics brokers.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="privacy-controls" className={cm.cn(cm.stack(2))}>
          {h2(
            t('privacy.controlsTitle', {}, { defaultValue: 'Kinship Circle Permission Controls' }),
            'controls',
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.controlsBody',
              {},
              {
                defaultValue:
                  'Today the archive is yours alone: there are no public profiles, no shared editing, and no guest view — the strongest permission control is that nothing leaves your account. Your live controls are two-factor authentication, per-device session sign-out, and complete deletion. If shared kinship circles ever ship, they will be strictly opt-in and revocable.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="privacy-export" className={cm.cn(cm.stack(2))}>
          {h2(
            t('privacy.exportTitle', {}, { defaultValue: 'Export Rights & Portability' }),
            'export',
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.exportBody',
              {},
              {
                defaultValue:
                  'Your tree is portable on demand: Settings → export downloads every person and relationship as structured JSON (included with paid tiers). Export never alters your records, and the archive is never held hostage — what you built leaves with you.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="privacy-fade" className={cm.cn(cm.stack(2))}>
          {h2(
            t(
              'privacy.fadeTitle',
              {},
              { defaultValue: 'Right to Complete Deletion (“Right to Fade”)' },
            ),
            'fade',
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.fadeBody',
              {},
              {
                defaultValue:
                  'Deleting your account fades every person, relationship, and note from the archive for good — there is no shadow copy and no restore period. Export first if anyone else in the family will want the research.',
              },
            )}
          </p>
        </section>

        <section data-mol-id="privacy-stewards" className={cm.cn(cm.stack(2))}>
          {h2(
            t('privacy.stewardsTitle', {}, { defaultValue: 'Contact Our Data Stewards' }),
            'stewards',
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'privacy.stewardsBody',
              {},
              {
                defaultValue:
                  'Questions about this covenant or the records we hold for you reach real people, not a queue: write to us from the address on the About page, and a steward will answer.',
              },
            )}
          </p>
        </section>

        <section
          className={cm.cn(cm.sp('p', 8), 'rounded-2xl text-center')}
          style={{ background: 'color-mix(in srgb, var(--color-forest) 92%, transparent)' }}
          data-mol-id="privacy-cta"
        >
          <h2
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display text-white')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t(
              'privacy.ctaTitle',
              {},
              {
                defaultValue:
                  'Entrust your ancestry to a sanctuary that honors your family’s dignity.',
              },
            )}
          </h2>
          <Link
            to="/signup"
            data-mol-id="privacy-cta-start"
            className={cm.cn(
              'inline-block rounded-xl font-bold transition-all hover:shadow-lg text-white',
              cm.textSize('sm'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 5),
            )}
            style={{ backgroundColor: 'var(--mol-color-primary)' }}
          >
            {t('privacy.ctaButton', {}, { defaultValue: 'Begin your archive' })}
          </Link>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
