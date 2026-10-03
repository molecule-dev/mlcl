import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

/**
 * Terms of Trust — the design's covenant structure with clauses that state
 * the actual service: you own your records, the archive never sells them,
 * export and deletion are always available, and there is no social layer.
 * Clauses the design promises but the product does not implement (a 100-year
 * perpetual escrow service, Swiss jurisdiction) are recorded as accepted
 * divergences in `design-coverage.json`.
 */

export function Terms() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const h2 = (text: string) => (
    <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>{text}</h2>
  )
  const h3 = (text: string) => (
    <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{text}</h3>
  )

  const promises = [
    {
      icon: 'verified_user',
      titleKey: 'terms.promise.dutyTitle',
      title: 'Fiduciary Data Duty',
      bodyKey: 'terms.promise.dutyBody',
      body: 'Your records are served, never sold — the archive acts as custodian of your research, not as a broker of it.',
    },
    {
      icon: 'gavel',
      titleKey: 'terms.promise.titleTitle',
      title: 'Absolute Intellectual Title',
      bodyKey: 'terms.promise.titleBody',
      body: 'You retain full ownership of everything you enter; the archive holds only the limited license needed to host and display it for you.',
    },
    {
      icon: 'save_alt',
      titleKey: 'terms.promise.portabilityTitle',
      title: 'Export & Portability Guarantee',
      bodyKey: 'terms.promise.portabilityBody',
      body: 'A complete, structured export of your tree is available on demand (paid tiers) — your research can leave whenever you choose.',
    },
    {
      icon: 'swap_horiz',
      titleKey: 'terms.promise.nonDestructiveTitle',
      title: 'Non-Destructive Portability',
      bodyKey: 'terms.promise.nonDestructiveBody',
      body: 'Exporting or deleting never alters, degrades, or truncates the records themselves — what you wrote is what moves.',
    },
  ]

  return (
    <ContentPageShell
      dataMolId="page-terms"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('terms.eyebrow', {}, { defaultValue: 'Terms' })}
      title={t(
        'terms.title',
        {},
        { defaultValue: 'Terms of Trust: A covenant between families and their custodians.' },
      )}
      subtitle={t(
        'terms.updated',
        {},
        { defaultValue: 'The promises, ownership terms, and conduct rules of your archive.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        {/* Four custodial promises */}
        <section data-mol-id="terms-promises">
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            {promises.map((p) => (
              <div
                key={p.titleKey}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(10),
                    cm.h(10),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.sp('mb', 3),
                  )}
                  style={{
                    backgroundColor: 'var(--color-vault-chip)',
                    color: 'var(--color-on-vault-chip)',
                  }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
                </div>
                {h3(t(p.titleKey, {}, { defaultValue: p.title }))}
                <p className={cm.cn(cm.prose, 'text-on-surface-variant', cm.sp('mt', 2))}>
                  {t(p.bodyKey, {}, { defaultValue: p.body })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* The Custodial Pact */}
        <section data-mol-id="terms-pact" className={cm.cn(cm.stack(2))}>
          {h2(
            t(
              'terms.pactTitle',
              {},
              { defaultValue: 'The Custodial Pact: Why We Are Not a Social Network' },
            ),
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.pactBody',
              {},
              {
                defaultValue:
                  'The archive has no feeds, no public profiles, no advertising, and no engagement metrics to farm. It exists to hold records, not attention — so nothing in the covenant encourages sharing, and every control runs toward privacy.',
              },
            )}
          </p>
          {h3(
            t(
              'terms.pactCompareTitle',
              {},
              { defaultValue: 'Commercial Genealogy Terms vs. Branches Archival Covenant' },
            ),
          )}
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            <div
              className={cm.cn(cm.sp('p', 5), 'rounded-2xl border bg-surface-container-lowest')}
              style={{ borderColor: 'var(--color-linen-border)' }}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                  cm.sp('mb', 2),
                )}
              >
                {t('terms.compareThem', {}, { defaultValue: 'Typical commercial genealogy' })}
              </p>
              <ul
                className={cm.cn(
                  cm.stack(2),
                  cm.prose,
                  'text-on-surface-variant',
                  'list-disc pl-6',
                )}
              >
                <li>
                  {t(
                    'terms.them1',
                    {},
                    { defaultValue: 'Your tree is indexed and mined for hints and traffic.' },
                  )}
                </li>
                <li>
                  {t(
                    'terms.them2',
                    {},
                    {
                      defaultValue: 'Broad licenses to reshape, reuse, and resell submitted data.',
                    },
                  )}
                </li>
                <li>
                  {t(
                    'terms.them3',
                    {},
                    { defaultValue: 'Proprietary lock-in; export is hard or paywalled.' },
                  )}
                </li>
              </ul>
            </div>
            <div
              className={cm.cn(cm.sp('p', 5), 'rounded-2xl border')}
              style={{
                backgroundColor: 'var(--color-tree-root-bg)',
                borderColor: 'var(--color-tree-root)',
              }}
            >
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest',
                  cm.sp('mb', 2),
                )}
                style={{ color: 'var(--color-tree-root)' }}
              >
                {t('terms.compareUs', {}, { defaultValue: 'The Branches covenant' })}
              </p>
              <ul className={cm.cn(cm.stack(2), cm.prose, 'list-disc pl-6')}>
                <li>
                  {t(
                    'terms.us1',
                    {},
                    {
                      defaultValue:
                        'Strict zero commercial indexing — records never leave your account.',
                    },
                  )}
                </li>
                <li>
                  {t(
                    'terms.us2',
                    {},
                    { defaultValue: 'You own the records; we host them and stop at hosting.' },
                  )}
                </li>
                <li>
                  {t(
                    'terms.us3',
                    {},
                    { defaultValue: 'Structured export on demand and complete deletion, always.' },
                  )}
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Ownership */}
        <section data-mol-id="terms-ownership" className={cm.cn(cm.stack(3))}>
          {h2(
            t(
              'terms.ownershipTitle',
              {},
              { defaultValue: 'Ownership of Family Records & Heirlooms' },
            ),
          )}
          <div className={cm.cn(cm.stack(2))}>
            {h3(t('terms.sovereignTitle', {}, { defaultValue: 'Member Sovereign Ownership' }))}
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'terms.sovereignBody',
                {},
                {
                  defaultValue:
                    'Every person, relationship, note, and date you enter remains yours. You grant the archive only the license required to store, back up, and display it within your private account — nothing more.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.stack(2))}>
            {h3(t('terms.publicDomainTitle', {}, { defaultValue: 'Public Domain Records' }))}
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'terms.publicDomainBody',
                {},
                {
                  defaultValue:
                    'Recording a fact that is already public — a census row, a parish register entry — does not remove it from the public domain, and does not transfer anyone’s rights to the archive. You remain responsible for what you enter and for respecting other people’s rights.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.stack(2))}>
            {h3(t('terms.inheritanceTitle', {}, { defaultValue: 'Generational Inheritance' }))}
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'terms.inheritanceBody',
                {},
                {
                  defaultValue:
                    'The tree is built to be handed on. A complete export carries the research intact to whoever comes next, and account access is yours to pass to a family member — succession by hand-off, with the archive never holding your records hostage.',
                },
              )}
            </p>
          </div>
        </section>

        {/* Conduct */}
        <section data-mol-id="terms-conduct" className={cm.cn(cm.stack(3))}>
          {h2(
            t(
              'terms.conductTitle',
              {},
              { defaultValue: 'Acceptable Conduct & Prohibited Exploitation' },
            ),
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.conductBody',
              {},
              {
                defaultValue:
                  'The archive exists for families documenting families. Using it as a data-harvesting substrate breaks the covenant and ends it.',
              },
            )}
          </p>
          <div className={cm.cn(cm.stack(2))}>
            {h3(
              t(
                'terms.dnaTitle',
                {},
                {
                  defaultValue: 'Strict Ban on DNA Brokerage & Bio-Data Commercialization',
                },
              ),
            )}
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'terms.dnaBody',
                {},
                {
                  defaultValue:
                    'The archive collects no biometric or DNA data and must never be used to store, infer, or broker it. Accounts exist for family history only — any bio-data commercialization is prohibited and will be removed.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.stack(2))}>
            {h3(
              t(
                'terms.scrapingTitle',
                {},
                { defaultValue: 'Automated Scraping & AI Bot Ingestion Bar' },
              ),
            )}
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'terms.scrapingBody',
                {},
                {
                  defaultValue:
                    'Automated scraping, bulk harvesting, and AI ingestion of the archive’s pages are barred. Account content is never used to train AI models, and no bot has any claim to it.',
                },
              )}
            </p>
          </div>
          <div className={cm.cn(cm.stack(2))}>
            {h3(
              t(
                'terms.maskingTitle',
                {},
                { defaultValue: 'Strict Living Relative Masking Protocols' },
              ),
            )}
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'terms.maskingBody',
                {},
                {
                  defaultValue:
                    'Records of living relatives are private to your account without exception — there is no public view to mask from, and you should enter living relatives’ details only with their knowledge and consent.',
                },
              )}
            </p>
          </div>
        </section>

        {/* Cryptographic custody */}
        <section data-mol-id="terms-keys" className={cm.cn(cm.stack(2))}>
          {h2(
            t(
              'terms.keysTitle',
              {},
              { defaultValue: 'Cryptographic Keys & Archival Duty of Care' },
            ),
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.keysBody',
              {},
              {
                defaultValue:
                  'Passphrases are stored only as bcrypt hashes, sessions ride signed httpOnly tokens, and every listed device can be signed out individually from Settings. Two-factor authentication (TOTP) is available and encouraged. The duty is shared: choose a long, unique passphrase and keep it safe — the archive cannot recover a passphrase you lose, only reset it through your email.',
              },
            )}
          </p>
        </section>

        {/* Service continuity / dissolution */}
        <section data-mol-id="terms-dissolution" className={cm.cn(cm.stack(2))}>
          {h2(
            t(
              'terms.dissolutionTitle',
              {},
              { defaultValue: 'Service Changes, Dissolution & Your Export Guarantees' },
            ),
          )}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.dissolutionBody',
              {},
              {
                defaultValue:
                  'If the service ever changes hands or winds up, the covenant travels with it: you receive advance notice by email, and complete export stays available until the lights go out. Your records were never the operator’s — dissolution ends the service, not your ownership.',
              },
            )}
          </p>
        </section>

        {/* Governing law */}
        <section data-mol-id="terms-law" className={cm.cn(cm.stack(2))}>
          {h2(t('terms.lawTitle', {}, { defaultValue: 'Governing Law & Jurisdiction' }))}
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'terms.lawBody',
              {},
              {
                defaultValue:
                  'These terms and any claim arising from the service are governed by applicable law, without regard to conflict-of-law provisions. The archival covenant above describes the service as built; where local consumer law grants you more, it prevails.',
              },
            )}
          </p>
        </section>

        <section
          className={cm.cn(cm.sp('p', 8), 'rounded-2xl text-center')}
          style={{ background: 'color-mix(in srgb, var(--color-forest) 92%, transparent)' }}
          data-mol-id="terms-cta"
        >
          <h2
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display text-white')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t(
              'terms.ctaTitle',
              {},
              {
                defaultValue:
                  'Entrust your ancestry to a sanctuary that honors your family’s dignity.',
              },
            )}
          </h2>
          <Link
            to="/signup"
            data-mol-id="terms-cta-start"
            className={cm.cn(
              'inline-block rounded-xl font-bold transition-all hover:shadow-lg text-white',
              cm.textSize('sm'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 5),
            )}
            style={{ backgroundColor: 'var(--mol-color-primary)' }}
          >
            {t('terms.ctaButton', {}, { defaultValue: 'Begin your archive' })}
          </Link>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Terms
export { Terms as TermsPage }
