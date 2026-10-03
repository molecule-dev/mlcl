import { Link } from 'react-router'

import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

interface SectionCopy {
  key: string
  defaultValue: string
}

/** The design's four philosophy pillars. */
const PHILOSOPHY: Array<{ key: string; icon: string } & SectionCopy> = [
  {
    key: 'quiet',
    icon: 'spa',
    defaultValue:
      'No banner ads, no affiliate pop-ups, and zero vendor lead-brokering. Your wedding dashboard and bespoke guest portals are entirely pure, tranquil, and centered exclusively on your celebration.',
  },
  {
    key: 'dignity',
    icon: 'how_to_reg',
    defaultValue:
      'Never force your elderly relatives or busy friends to create an account, verify a captcha, or remember a password. A simple code or smart link grants access to an intuitive, personalized RSVP envelope.',
  },
  {
    key: 'geometry',
    icon: 'architecture',
    defaultValue:
      'Our seating studio treats your reception venue as an architectural canvas. Live synchronized meal preferences, dietary restriction flags, and one-click catering printouts ensure your dinner service runs in absolute harmony.',
  },
  {
    key: 'keepsake',
    icon: 'auto_stories',
    defaultValue:
      'Once your golden hour send-off concludes, your workspace doesn’t expire or get deleted. It stays yours — a pristine, private archive of notes, seating layouts, and timeless memories for decades to come.',
  },
]

/** The design's founding team ("Meet the Atelier"). */
const TEAM: Array<{ key: string; role: string; bio: string; motto: string }> = [
  {
    key: 'clara',
    role: 'Co-Founder & Creative Director',
    bio: 'Former editorial director for European couture monographs. Clara obsesses over typography kerning, linen paper weights, and eliminating digital friction from sacred life milestones.',
    motto: 'Every detail should feel as tender as a handwritten note.',
  },
  {
    key: 'julian',
    role: 'Co-Founder & Systems Architect',
    bio: 'Previously designed resilient distributed databases for mission-critical medical services. Julian architected Everly’s spatial seating engine and privacy-first data model.',
    motto: 'True luxury is invisible software that never stumbles.',
  },
  {
    key: 'camilla',
    role: 'Head of Concierge & Logistics',
    bio: 'Over a decade orchestrating high-end bespoke celebrations across Lake Como and Provence. Camilla ensures our workflows reflect real-world caterer and florist realities.',
    motto: 'Hospitality starts the moment the guest opens the invitation.',
  },
]

interface Feature {
  id: string
  key: string
  defaultValue: string
}

const FEATURES: Feature[] = [
  {
    id: 'guests',
    key: 'about.feature.guests',
    defaultValue:
      'A guest list that thinks — sides, groups, contact details, meals, and plus-one allowances in one calm table.',
  },
  {
    id: 'rsvp',
    key: 'about.feature.rsvp',
    defaultValue:
      'RSVPs without the chase — share one code, guests confirm on a public page with no account, and your tally updates live.',
  },
  {
    id: 'budget',
    key: 'about.feature.budget',
    defaultValue:
      'Budget clarity — estimate every line from venue to stationery, log actuals as deposits land, and see the over/under at a glance.',
  },
  {
    id: 'vendors',
    key: 'about.feature.vendors',
    defaultValue:
      'A vendor pipeline — researching, contacted, booked, paid — so nothing falls through the cracks.',
  },
  {
    id: 'seating',
    key: 'about.feature.seating',
    defaultValue:
      'A seating chart that does the math — tables with capacities, an unseated pool, and over-capacity warnings before the reception does.',
  },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()
  const ctaTo = isAuthenticated ? '/dashboard' : '/signup'
  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<Header />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'Our story & philosophy' })}
      title={t(
        'about.pageTitle',
        {},
        {
          defaultValue:
            'Born from the quiet belief that wedding planning should feel like romance, not administrative chaos.',
        },
      )}
    >
      <div className={cm.cn(cm.stack(10))}>
        {/* Intro — why Everly exists */}
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                'We built {{app}} because modern weddings shouldn’t require fourteen chaotic spreadsheets, lost text threads, and frantic midnight panic. We believe couples deserve intentional calm, bespoke editorial design, and timeless craftsmanship for their most cherished day.',
            },
          )}
        </p>

        {/* Origin story (the design's "Sunday Morning Standard" section) */}
        <section data-mol-id="about-story" className={cm.cn(cm.stack(3))}>
          <p
            className={cm.cn('text-xs font-black uppercase tracking-widest')}
            style={{ color: 'var(--color-accent)' }}
          >
            {t('about.storyEyebrow', {}, { defaultValue: 'The origin story' })}
          </p>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t(
              'about.storyTitle',
              {},
              { defaultValue: 'The Sunday Morning Standard & The Tuscany Revelation' },
            )}
          </h2>
          <div className={cm.cn(cm.stack(3))}>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'about.storyBody1',
                {},
                {
                  defaultValue:
                    'In the late summer of 2021, our co-founders were preparing for a wedding nestled in the hills of Val d’Orcia, Tuscany. What was meant to be an ethereal period of anticipation quickly devolved into an ordeal of fluorescent spreadsheet rows, vendor kickbacks, and jarringly commercial wedding portals coated in casino-bright discount vouchers.',
                },
              )}
            </p>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'about.storyBody2',
                {},
                {
                  defaultValue:
                    'Every mainstream platform treated their guests as advertising commodities and their celebration as a lead-generation funnel. There was no poetry, no tactile reverence, and zero appreciation for typographic grace.',
                },
              )}
            </p>
            <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'about.storyBody3',
                { app: APP_NAME },
                {
                  defaultValue:
                    'Over espresso on a sun-bleached terrace, we sketched the founding question: what if wedding software held the same unhurried aesthetic and physical dignity as a heavy letterpress card printed on handmade cotton stock? {{app}} was founded to be an intentional digital atelier — where seating arrangements resemble architectural diagrams, guest RSVPs feel like opening a warm wax-sealed missive, and couples are freed from commercial clamor.',
                },
              )}
            </p>
          </div>
          <blockquote
            className={cm.cn(cm.sp('p', 5), 'rounded-2xl bg-surface-container-low border-l-4')}
            style={{ borderInlineStartColor: 'var(--color-primary)' }}
          >
            <p className={cm.cn(cm.prose, cm.fontWeight('semibold'))}>
              {t(
                'about.storyQuote',
                {},
                { defaultValue: '“Planning should be as memorable as the vows themselves.”' },
              )}
            </p>
            <footer className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-2')}>
              {t(
                'about.storyQuotePlace',
                {},
                {
                  defaultValue:
                    'Val d’Orcia, Italy — where the first lines of Everly were conceived',
                },
              )}
            </footer>
          </blockquote>
        </section>

        {/* The four philosophy pillars */}
        <section data-mol-id="about-philosophy" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t(
              'about.philosophyTitle',
              { app: APP_NAME },
              { defaultValue: 'Four Pillars of the {{app}} Philosophy' },
            )}
          </h2>
          <ul className={cm.cn('grid gap-5 sm:grid-cols-2')}>
            {PHILOSOPHY.map((pillar) => (
              <li
                key={pillar.key}
                data-mol-id={`about-pillar-${pillar.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-11 h-11 rounded-xl bg-primary-fixed/40 text-primary mb-3',
                  )}
                >
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">
                    {pillar.icon}
                  </span>
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'mb-2')}>
                  {t(
                    `about.pillar.${pillar.key}.title`,
                    {},
                    {
                      defaultValue:
                        pillar.key === 'quiet'
                          ? 'Quiet Luxury & Zero Commercial Noise'
                          : pillar.key === 'dignity'
                            ? 'Guest Dignity & Frictionless RSVP'
                            : pillar.key === 'geometry'
                              ? 'Harmonious Spatial Geometry'
                              : 'The Sovereign Digital Keepsake',
                    },
                  )}
                </h3>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`about.pillar.${pillar.key}.body`, {}, { defaultValue: pillar.defaultValue })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* What you get — the concrete tool tour (extra app content) */}
        <section data-mol-id="about-features" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
          </h2>
          <ul className={cm.cn(cm.stack(2), 'list-disc pl-6 text-on-surface-variant')}>
            {FEATURES.map((f) => (
              <li key={f.id} className={cm.cn(cm.prose)}>
                {t(f.key, {}, { defaultValue: f.defaultValue })}
              </li>
            ))}
          </ul>
        </section>

        {/* The team */}
        <section data-mol-id="about-team" className={cm.cn(cm.stack(4))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('about.teamTitle', {}, { defaultValue: 'Meet the Atelier' })}
          </h2>
          <ul className={cm.cn('grid gap-5 md:grid-cols-3')}>
            {TEAM.map((member) => (
              <li
                key={member.key}
                data-mol-id={`about-team-${member.key}`}
                className={cm.cn(
                  cm.sp('p', 6),
                  'rounded-2xl bg-surface-container-lowest border border-outline-variant/40 shadow-sm',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    'w-14 h-14 rounded-full bg-secondary-container text-secondary text-base font-bold mb-3',
                  )}
                  aria-hidden="true"
                >
                  {member.key === 'clara' ? 'CV' : member.key === 'julian' ? 'JH' : 'CM'}
                </span>
                <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t(
                    `about.team.${member.key}.name`,
                    {},
                    {
                      defaultValue:
                        member.key === 'clara'
                          ? 'Clara Vance'
                          : member.key === 'julian'
                            ? 'Julian Hastings'
                            : 'Camilla Moretti',
                    },
                  )}
                </h3>
                <p
                  className={cm.cn(cm.textSize('xs'), 'font-black uppercase tracking-widest mt-1')}
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t(`about.team.${member.key}.role`, {}, { defaultValue: member.role })}
                </p>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant mt-2')}>
                  {t(`about.team.${member.key}.bio`, {}, { defaultValue: member.bio })}
                </p>
                <p className={cm.cn(cm.textSize('sm'), 'font-medium mt-3')}>
                  {t(`about.team.${member.key}.motto`, {}, { defaultValue: `“${member.motto}”` })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Privacy & sustainable craft commitments */}
        <section data-mol-id="about-craft" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t(
              'about.craftTitle',
              {},
              { defaultValue: 'Uncompromising Privacy & Sustainable Craft' },
            )}
          </h2>
          <ul className={cm.cn(cm.stack(3))}>
            {(
              [
                {
                  key: 'privacy',
                  defaultValue:
                    'All guest telephone numbers, dietary medical flags, and personal physical addresses are safeguarded with end-to-end hardware-level isolation.',
                },
                {
                  key: 'nosale',
                  defaultValue:
                    'We will never sell, lease, or broker your guests’ contact details to vendor directories, insurance brokers, or external advertising networks.',
                },
                {
                  key: 'green',
                  defaultValue:
                    'Everly’s infrastructure runs exclusively on hydro and wind-powered digital centers, reducing the environmental footprint of paper-free coordination.',
                },
                {
                  key: 'export',
                  defaultValue:
                    'Export your complete wedding registry, guest address book, and seating arrangements to CSV, PDF, or raw JSON at any time with one click.',
                },
              ] as const
            ).map((item) => (
              <li key={item.key} className="flex items-start gap-2">
                <span
                  className="material-symbols-outlined text-xl shrink-0 mt-0.5"
                  style={{ color: 'var(--color-success)' }}
                  aria-hidden="true"
                >
                  eco
                </span>
                <span className={cm.cn(cm.prose, 'text-on-surface-variant')}>
                  {t(`about.craft.${item.key}`, {}, { defaultValue: item.defaultValue })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Get in touch (kept from the original page) */}
        <section data-mol-id="about-contact" className={cm.cn(cm.stack(2))}>
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
            {t('about.contactTitle', {}, { defaultValue: 'Get in touch' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.contactBody',
              { app: APP_NAME },
              {
                defaultValue:
                  'Questions or feedback? Reach the team from your account settings — every message goes to a real person who works on {{app}}.',
              },
            )}
          </p>
        </section>

        {/* Closing CTA */}
        <section
          data-mol-id="about-cta"
          className={cm.cn(
            cm.sp('p', 8),
            'rounded-3xl bg-surface-container-low border border-outline-variant/40 text-center',
          )}
        >
          <h2 className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'), 'mb-3')}>
            {t('about.ctaTitle', {}, { defaultValue: 'Your wedding deserves peace of mind.' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant mb-5')}>
            {t(
              'about.ctaBody',
              {},
              {
                defaultValue:
                  'Begin planning your serene celebration today. Experience what unhurried elegance feels like — no credit card required to start.',
              },
            )}
          </p>
          <Link
            to={ctaTo}
            data-mol-id="about-cta-button"
            className={cm.cn(
              'inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-white shadow-md',
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            }}
          >
            {isAuthenticated
              ? t('about.ctaOpen', {}, { defaultValue: 'Open your planner' })
              : t('about.ctaStart', {}, { defaultValue: 'Start planning free' })}
            <span className="material-symbols-outlined text-lg" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
          <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant mt-4')}>
            {t(
              'about.ctaFine',
              {},
              {
                defaultValue:
                  'Complimentary 14-day atelier access · No credit card · Unlimited guest lists',
              },
            )}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
