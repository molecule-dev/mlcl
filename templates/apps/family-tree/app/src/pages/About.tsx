import { ContentPageShell } from '@molecule/app-legal-pages-react'
import { Link } from 'react-router'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { AuthBrandHeader } from '../components/AuthBrandHeader.js'
import { Footer } from '../components/Footer.js'

const STATS = [
  { key: 'kinship', value: '4', label: 'kinship directions woven both ways' },
  { key: 'generations', value: '∞', label: 'generations your tree can grow' },
  { key: 'languages', value: '60+', label: 'interface languages for the whole family' },
  { key: 'private', value: '100%', label: 'of records private to your account' },
]

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <ContentPageShell
      dataMolId="page-about"
      header={<AuthBrandHeader />}
      footer={<Footer />}
      eyebrow={t('about.eyebrow', {}, { defaultValue: 'About' })}
      title={t(
        'about.pageTitle',
        {},
        { defaultValue: 'Preserving generational memory as a quiet, sacred craft.' },
      )}
    >
      <div className={cm.cn(cm.stack(8))}>
        <p data-mol-id="about-intro" className={cm.cn(cm.prose, 'text-on-surface-variant')}>
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue: `${APP_NAME} is a private home for your family story — people, relationships, and a navigable tree in one quiet place, so the branches you are researching stay connected and the people behind the names stay remembered.`,
            },
          )}
        </p>

        {/* Why We Built Branches */}
        <section data-mol-id="about-why" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.whyTitle', {}, { defaultValue: 'Why We Built Branches' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.whyBody',
              {},
              {
                defaultValue:
                  'Not another hints engine. Family history deserves tools that wait patiently for you — not feeds that mine you. We build an enduring container for records, built to outlast trends and to hand your work, intact, to whoever comes next.',
              },
            )}
          </p>
          <figure
            className={cm.cn('border-l-2 pl-4')}
            style={{ borderColor: 'var(--color-forest-hover)' }}
          >
            <blockquote className={cm.cn(cm.prose, 'text-on-surface-variant')}>
              {t(
                'about.whyQuote',
                {},
                {
                  defaultValue:
                    '“A family’s story is never truly lost so long as its custodians hold the care to seek it.”',
                },
              )}
            </blockquote>
            <figcaption
              className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}
            >
              —{' '}
              {t(
                'about.whyQuoteAttribution',
                {},
                { defaultValue: 'The Branches Preservation Creed' },
              )}
            </figcaption>
          </figure>

          <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.philosophyTitle', {}, { defaultValue: 'A Divergent Philosophy' })}
          </h3>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 sm:grid-cols-2')}>
            <div
              className={cm.cn(cm.sp('p', 6), 'rounded-2xl border bg-surface-container-lowest')}
              style={{ borderColor: 'var(--color-linen-border)' }}
            >
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest text-on-surface-variant',
                  cm.sp('mb', 3),
                )}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  close
                </span>
                {t(
                  'about.philosophyAgainst',
                  {},
                  { defaultValue: 'Commercial genealogy, as usual' },
                )}
              </p>
              <ul className={cm.cn(cm.stack(2), cm.prose, 'text-on-surface-variant')}>
                <li>
                  {t(
                    'about.against1',
                    {},
                    {
                      defaultValue:
                        'Indexing your family for search traffic and selling its data onward.',
                    },
                  )}
                </li>
                <li>
                  {t(
                    'about.against2',
                    {},
                    {
                      defaultValue:
                        'Automated junk hints and synthetic duplicates that pollute careful research.',
                    },
                  )}
                </li>
                <li>
                  {t(
                    'about.against3',
                    {},
                    {
                      defaultValue:
                        'Lock-in — proprietary formats that hold your own records hostage.',
                    },
                  )}
                </li>
              </ul>
            </div>
            <div
              className={cm.cn(cm.sp('p', 6), 'rounded-2xl border')}
              style={{
                backgroundColor: 'var(--color-tree-root-bg)',
                borderColor: 'var(--color-tree-root)',
              }}
            >
              <p
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.textSize('xs'),
                  cm.fontWeight('bold'),
                  'uppercase tracking-widest',
                  cm.sp('mb', 3),
                )}
                style={{ color: 'var(--color-tree-root)' }}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  check
                </span>
                {t('about.philosophyFor', {}, { defaultValue: 'The Branches Archival Standard' })}
              </p>
              <ul className={cm.cn(cm.stack(2), cm.prose)}>
                <li>
                  {t(
                    'about.for1',
                    {},
                    {
                      defaultValue:
                        'Private archives — strict zero commercial indexing, nothing sold onward.',
                    },
                  )}
                </li>
                <li>
                  {t(
                    'about.for2',
                    {},
                    {
                      defaultValue:
                        'Human-verified lineage — you enter and confirm every record yourself.',
                    },
                  )}
                </li>
                <li>
                  {t(
                    'about.for3',
                    {},
                    {
                      defaultValue:
                        'Your records stay yours — export or delete the whole archive at any time.',
                    },
                  )}
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Four Disciplines of Generational Preservation */}
        <section data-mol-id="about-disciplines" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t(
              'about.disciplinesTitle',
              {},
              { defaultValue: 'Four Disciplines of Generational Preservation' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-2')}>
            <div
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
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
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('about.discipline1', {}, { defaultValue: 'Private Genealogical Vaults' })}
              </h3>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant', cm.sp('mt', 2))}>
                {t(
                  'about.discipline1Body',
                  {},
                  {
                    defaultValue:
                      'Every tree is scoped to its account alone — never indexed, never mined, never sold, and never shown to another family.',
                  },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
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
                <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              </div>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t(
                  'about.discipline2',
                  {},
                  { defaultValue: 'Lossless Multispectral Preservation' },
                )}
              </h3>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant', cm.sp('mt', 2))}>
                {t(
                  'about.discipline2Body',
                  {},
                  {
                    defaultValue:
                      'Everything you record — dates, places, name forms, and the stories in between — is kept in full fidelity. Nothing you write is truncated, decayed, or quietly deleted.',
                  },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
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
                <span className="material-symbols-outlined text-[20px]">account_tree</span>
              </div>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('about.discipline3', {}, { defaultValue: 'Mindful, Kinship-First Topology' })}
              </h3>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant', cm.sp('mt', 2))}>
                {t(
                  'about.discipline3Body',
                  {},
                  {
                    defaultValue:
                      'Relationships are first-class records: add a parent, partner, child, or sibling and the link is woven in both directions automatically — no duplicate edges, ever.',
                  },
                )}
              </p>
            </div>
            <div
              className={cm.cn(cm.sp('p', 6), 'bg-surface-container-lowest rounded-2xl shadow-sm')}
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
                <span className="material-symbols-outlined text-[20px]">all_inclusive</span>
              </div>
              <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('about.discipline4', {}, { defaultValue: 'Yours for the Long Haul' })}
              </h3>
              <p className={cm.cn(cm.prose, 'text-on-surface-variant', cm.sp('mt', 2))}>
                {t(
                  'about.discipline4Body',
                  {},
                  {
                    defaultValue:
                      'Your archive outlives any single app because it never stops being yours — complete export on demand, and full deletion the moment you ask.',
                  },
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Archival Craft & Standards in Numbers */}
        <section data-mol-id="about-numbers" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.numbersTitle', {}, { defaultValue: 'Archival Craft & Standards in Numbers' })}
          </h2>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-2 lg:grid-cols-4')}>
            {STATS.map((s) => (
              <div
                key={s.key}
                className={cm.cn(
                  cm.sp('p', 5),
                  'bg-surface-container-lowest rounded-2xl shadow-sm text-center',
                )}
              >
                <p
                  className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}
                  style={{ color: 'var(--color-forest)' }}
                >
                  {s.value}
                </p>
                <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                  {t(`about.stat.${s.key}`, {}, { defaultValue: s.label })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Custodians of the Perpetual Record */}
        <section data-mol-id="about-custodians" className={cm.cn(cm.stack(3))}>
          <h2 className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display')}>
            {t('about.custodiansTitle', {}, { defaultValue: 'Custodians of the Perpetual Record' })}
          </h2>
          <p className={cm.cn(cm.prose, 'text-on-surface-variant')}>
            {t(
              'about.custodiansBody',
              {},
              {
                defaultValue:
                  'Branches is guided by a council of archival custodians who keep the product honest to its purpose — preservation first, trends never.',
              },
            )}
          </p>
          <div className={cm.cn(cm.grid({ gap: 'md' }), 'grid-cols-1 md:grid-cols-3')}>
            {[
              {
                initials: 'HS',
                nameKey: 'about.custodian1Name',
                name: 'Dr. Helena Sterling',
                roleKey: 'about.custodian1Role',
                role: 'Chief Archivist',
                quoteKey: 'about.custodian1Quote',
                quote:
                  '“Physical manuscripts survive because they make no demands on future software. We hold the archive to that same timelessness.”',
              },
              {
                initials: 'JV',
                nameKey: 'about.custodian2Name',
                name: 'Julian Vance',
                roleKey: 'about.custodian2Role',
                role: 'Archival Custody Lead',
                quoteKey: 'about.custodian2Quote',
                quote:
                  '“Family privacy is a duty of care, not a feature flag. If we could read your grandmother’s diary, we would have failed.”',
              },
              {
                initials: 'CT',
                nameKey: 'about.custodian3Name',
                name: 'Claire Thorne',
                roleKey: 'about.custodian3Role',
                role: 'Oral History Curator',
                quoteKey: 'about.custodian3Quote',
                quote:
                  '“A name on a pedigree chart is only an address — the stories are what make an ancestor fully present.”',
              },
            ].map((p) => (
              <div
                key={p.initials}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-2xl shadow-sm',
                )}
              >
                <div
                  className={cm.cn(
                    cm.w(12),
                    cm.h(12),
                    cm.roundedFull,
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.fontWeight('bold'),
                    cm.sp('mb', 3),
                  )}
                  style={{
                    backgroundColor: 'var(--color-tree-root-bg)',
                    color: 'var(--color-tree-root)',
                  }}
                  aria-hidden="true"
                >
                  {p.initials}
                </div>
                <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'), 'font-display')}>
                  {t(p.nameKey, {}, { defaultValue: p.name })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.fontWeight('bold'),
                    'uppercase tracking-widest text-on-surface-variant',
                  )}
                >
                  {t(p.roleKey, {}, { defaultValue: p.role })}
                </p>
                <p className={cm.cn(cm.prose, 'text-on-surface-variant', cm.sp('mt', 3))}>
                  {t(p.quoteKey, {}, { defaultValue: p.quote })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section
          className={cm.cn(cm.sp('p', 8), 'rounded-2xl text-center')}
          style={{ background: 'color-mix(in srgb, var(--color-forest) 92%, transparent)' }}
          data-mol-id="about-cta"
        >
          <h2
            className={cm.cn(cm.textSize('xl'), cm.fontWeight('bold'), 'font-display text-white')}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {t(
              'about.ctaTitle',
              {},
              { defaultValue: 'Begin your family’s quiet lineage ledger today.' },
            )}
          </h2>
          <p
            className={cm.cn(cm.prose, cm.sp('mt', 2))}
            style={{ color: 'var(--color-forest-mist)' }}
          >
            {t(
              'about.ctaBody',
              {},
              {
                defaultValue:
                  'Step into a calm, distraction-free archive for the people who came before you — and those who will follow.',
              },
            )}
          </p>
          <Link
            to="/signup"
            data-mol-id="about-cta-start"
            className={cm.cn(
              'inline-block rounded-xl font-bold transition-all hover:shadow-lg text-white',
              cm.textSize('sm'),
              cm.sp('px', 6),
              cm.sp('py', 3),
              cm.sp('mt', 5),
            )}
            style={{ backgroundColor: 'var(--mol-color-primary)' }}
          >
            {t('about.ctaButton', {}, { defaultValue: 'Start your tree' })}
          </Link>
          <p
            className={cm.cn(cm.textSize('xs'), cm.sp('mt', 3))}
            style={{ color: 'var(--color-forest-mist)' }}
          >
            {t('about.ctaNote', {}, { defaultValue: 'No credit card required' })}
          </p>
        </section>
      </div>
    </ContentPageShell>
  )
}

export default About
export { About as AboutPage }
