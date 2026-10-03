import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface Pillar {
  key: string
  icon: string
  title: string
  body: string
}

/** The four privacy pillars from the design — copy kept factual to what
 *  this app actually does. */
const PILLARS: Pillar[] = [
  {
    key: 'zero',
    icon: 'campaign',
    title: 'Zero Advertising & Zero Brokerage',
    body: 'We never sell, monetize, or broker guest emails, phone numbers, or mailing addresses. Ever. Your guest list is sacred family history, not market intelligence.',
  },
  {
    key: 'protection',
    icon: 'shield_lock',
    title: 'End-to-End Guest Protection',
    body: 'Traffic runs over TLS in transit, passwords are stored as salted hashes (never in plain text), and your guests’ dietary notes, addresses, and private notes are visible only to you and anyone you invite into your planning workspace.',
  },
  {
    key: 'export',
    icon: 'download',
    title: 'Unconditional Data Export',
    body: 'Your registry, guest address book, seating arrangements, budget records, and vendor list are yours. Request a machine-readable copy at any time and we will provide it — no fee, no interrogation.',
  },
  {
    key: 'vault',
    icon: 'inventory_2',
    title: 'The Sovereign Keepsake Vault',
    body: 'Once your wedding concludes, your suite does not expire or get deleted. It stays yours as a private archive of notes, menus, and seating layouts — with no advertising, ever.',
  },
]

interface Section {
  key: string
  title: string
  body?: string
  bullets?: Array<{ key: string; text: string }>
}

/** The design's numbered policy sections, stated plainly and factually. */
const SECTIONS: Section[] = [
  {
    key: 'pledge',
    title: '1. The {{app}} Privacy Pledge',
    body: 'Your celebration belongs to you. {{app}} exists to serve your wedding — never to mine it. This page explains, in plain English, what we collect, why, and the controls you hold.',
  },
  {
    key: 'collect',
    title: '2. Information We Collect (Couples vs. Guests)',
    body: 'We collect only what planning a wedding here requires — nothing scraped, nothing purchased, nothing inferred for advertisers.',
  },
  {
    key: 'use',
    title: '3. How We Use Wedding Data & Vendor Access',
    body: 'Your data is used to run your planner: rendering your dashboard, tallying RSVPs, and seating your guests. Vendors never receive accounts or logins — a “vendor” here is a contact entry you manage. We do not sell or share your data with vendors, and vendor access to event details happens only through channels you control (your invitations, your PDFs, your emails).',
  },
  {
    key: 'guest',
    title: '4. Guest Passkey & RSVP Privacy',
    body: 'Guests never create accounts or passwords. A guest opens your invitation link, identifies themselves by name, and answers once. We store their response (attending, meal choice, plus-ones, notes) so your tally is accurate. Guests can ask you — or us — to remove their response at any time.',
  },
  {
    key: 'vendor',
    title: '5. Vendor & Financial Transaction Privacy',
    body: 'Budget amounts and vendor names live in your planner for your eyes alone. Paid plans are processed by our payment provider (Stripe); we never see or store raw credit-card numbers. We take no commissions, referral fees, or kickbacks from anyone you hire.',
  },
  {
    key: 'sub',
    title: '6. Third-Party Sub-processors & Cloud Infrastructure',
    body: 'We run on a small set of established infrastructure providers (application hosting, a managed PostgreSQL database, transactional email delivery, and payment processing). Each is bound by contract to process data only on our instructions. We do not embed advertising or retargeting scripts from any third party.',
  },
  {
    key: 'cookies',
    title: '7. Cookies & Third-Party Retargeting',
    body: 'We set one essential cookie: your signed-in session. There are no ad-network pixels, no cross-site trackers, no retargeting. Your guests will not visit your wedding page only to be followed across the web with intrusive advertisements.',
  },
  {
    key: 'archival',
    title: '8. Archival, Keepsake Lock & Complete Erasure',
    body: 'Your workspace stays available after the wedding for as long as you keep it. When you want everything gone — before or after the celebration — ask us and we will permanently delete your suite, including every guest record and response, from backups within 30 days.',
  },
  {
    key: 'rights',
    title: '9. Your Statutory Rights (GDPR, CCPA & Global)',
    body: 'Wherever you live, you may ask for a copy of your data, correct it, export it, or have it erased, and you may object to processing. We honor these rights for couples and guests alike, worldwide — you should not need a lawyer to exercise them.',
  },
  {
    key: 'contact',
    title: '10. Contacting Our Data Protection Atelier',
    body: 'Privacy questions, data requests, and deletion requests go to a real person. Write to us from your account settings or reply to any email we have sent you; we answer within 30 days at the latest, usually much sooner.',
  },
]

export function Privacy() {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <ContentPageShell
      dataMolId="page-privacy"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('privacy.eyebrow', {}, { defaultValue: 'Privacy' })}
      title={t(
        'privacy.title',
        {},
        {
          defaultValue: 'Your celebration belongs to you. Not advertisers, brokers, or algorithms.',
        },
      )}
      subtitle={t(
        'privacy.subtitle',
        { app: APP_NAME },
        {
          defaultValue:
            'At {{app}}, we believe your wedding details, guest contact books, and intimate dietary notes deserve unhurried peace of mind. Here is our plain-English commitment to keeping your wedding serene and protected.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        {/* The four pillars */}
        <section data-mol-id="privacy-pillars" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t(
              'privacy.pillarsTitle',
              {},
              { defaultValue: 'Our four sacred pillars of protection' },
            )}
          </h2>
          <ul className={cm.cn('grid gap-5 sm:grid-cols-2')}>
            {PILLARS.map((pillar) => (
              <li
                key={pillar.key}
                data-mol-id={`privacy-pillar-${pillar.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-11 h-11 rounded-xl bg-secondary-container/50 text-secondary mb-3',
                  )}
                >
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">
                    {pillar.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-2')}>
                  {t(`privacy.pillar.${pillar.key}.title`, {}, { defaultValue: pillar.title })}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`privacy.pillar.${pillar.key}.body`, {}, { defaultValue: pillar.body })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Numbered sections */}
        <div className={cm.cn(cm.stack(8))}>
          {SECTIONS.map((section) => (
            <section
              key={section.key}
              data-mol-id={`privacy-${section.key}`}
              className={cm.cn(cm.stack(3))}
            >
              <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                {t(
                  `privacy.section.${section.key}.title`,
                  { app: APP_NAME },
                  { defaultValue: section.title },
                )}
              </h2>
              {section.body ? (
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(
                    `privacy.section.${section.key}.body`,
                    { app: APP_NAME },
                    { defaultValue: section.body },
                  )}
                </p>
              ) : null}
              {section.key === 'collect' ? (
                <div className={cm.cn('grid gap-5 md:grid-cols-2')}>
                  <div
                    className={cm.cn(
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface-container-low border border-outline-variant/40',
                    )}
                  >
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-2')}>
                      {t(
                        'privacy.section.collect.couplesTitle',
                        {},
                        { defaultValue: 'Data provided by couples' },
                      )}
                    </h3>
                    <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
                      {(
                        [
                          'Identity: your name, email address, and a securely hashed password.',
                          'Event parameters: wedding date, venue, and your RSVP code.',
                          'Planner content: guests, budget lines, tasks, seating, and vendor entries you add.',
                        ] as const
                      ).map((item) => (
                        <li key={item} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                          {t(
                            'privacy.section.collect.couplesItem',
                            { item },
                            { defaultValue: item },
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div
                    className={cm.cn(
                      cm.sp('p', 5),
                      'rounded-2xl bg-surface-container-low border border-outline-variant/40',
                    )}
                  >
                    <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-2')}>
                      {t(
                        'privacy.section.collect.guestsTitle',
                        {},
                        { defaultValue: 'Data provided by guests' },
                      )}
                    </h3>
                    <ul className={cm.cn(cm.stack(2), 'list-disc pl-6')}>
                      {(
                        [
                          'RSVP declarations: attendance status and event-specific selections.',
                          'Dietary & accessibility: meal choice, allergen flags, and notes you choose to leave.',
                          'No account required: guests never install software or create platform credentials.',
                        ] as const
                      ).map((item) => (
                        <li key={item} className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                          {t(
                            'privacy.section.collect.guestsItem',
                            { item },
                            { defaultValue: item },
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
              {section.key === 'rights' ? (
                <div
                  className={cm.cn(
                    cm.sp('p', 5),
                    'rounded-2xl bg-surface-container-low border border-outline-variant/40',
                  )}
                >
                  <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-2')}>
                    {t(
                      'privacy.section.rights.controlTitle',
                      {},
                      { defaultValue: 'The couple’s sovereign control center' },
                    )}
                  </h3>
                  <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                    {t(
                      'privacy.section.rights.controlBody',
                      {},
                      {
                        defaultValue:
                          'Every membership includes sovereign controls built right into your settings: edit or correct your profile, change your password, cancel your plan, or write to us to export or erase the suite outright. You retain command over what is shared and when.',
                      },
                    )}
                  </p>
                </div>
              ) : null}
            </section>
          ))}
        </div>

        {/* Closing */}
        <section
          data-mol-id="privacy-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-3xl bg-surface-container-low border border-outline-variant/40 text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'mb-3')}>
            {t(
              'privacy.ctaTitle',
              {},
              { defaultValue: 'Ready to archive or take your memories with you?' },
            )}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant mb-5')}>
            {t(
              'privacy.ctaBody',
              {},
              {
                defaultValue:
                  'Ask us any time for a complete copy of your suite — guest list, seat plans, and menu preferences — or to erase it entirely. Both are one message away.',
              },
            )}
          </p>
          <Link
            to="/"
            data-mol-id="privacy-cta-button"
            className={cm.cn(
              'inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white shadow-md',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            }}
          >
            {t('privacy.ctaButton', {}, { defaultValue: 'Back to your celebration' })}
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default Privacy
export { Privacy as PrivacyPage }
