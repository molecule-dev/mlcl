import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { MiniTreePreview } from '../components/MiniTreePreview.js'

/** Shared props for the decorative landing pillars/steps/features. */
interface LandingItem {
  icon: string
  titleKey: string
  title: string
  bodyKey: string
  body: string
  footKey?: string
  foot?: string
  footIcon?: string
}

const PILLARS: LandingItem[] = [
  {
    icon: 'visibility_off',
    titleKey: 'landing.pillars.indexing.title',
    title: 'Zero Public Indexing',
    bodyKey: 'landing.pillars.indexing.body',
    body: 'Strict search engine isolation. Your trees, photographs, and oral histories are never scraped, indexed by Google, or exposed to unauthorized web crawlers.',
    footKey: 'landing.pillars.indexing.foot',
    foot: 'Total indexing lockdown',
    footIcon: 'verified_user',
  },
  {
    icon: 'groups',
    titleKey: 'landing.pillars.circles.title',
    title: 'Strict Circle Permissions',
    bodyKey: 'landing.pillars.circles.body',
    body: 'Living member identity masking by default. Assign customized roles: view-only elder simplicity mode, contributor licenses for cousins, and archival custodianship.',
    footKey: 'landing.pillars.circles.foot',
    foot: 'Selective branch isolation',
    footIcon: 'admin_panel_settings',
  },
  {
    icon: 'inventory_2',
    titleKey: 'landing.pillars.heirlooms.title',
    title: 'Permanent Heirlooms',
    bodyKey: 'landing.pillars.heirlooms.body',
    body: 'Standard open GEDCOM 5.5.1 and 7.0 export anytime, lossless raw media preservation, and high-resolution vector PDF printing. Zero vendor lock-in.',
    footKey: 'landing.pillars.heirlooms.foot',
    foot: '100% data portability',
    footIcon: 'file_download',
  },
]

const STEPS: LandingItem[] = [
  {
    icon: 'add_circle',
    titleKey: 'landing.steps.know.title',
    title: 'Begin with who you know',
    bodyKey: 'landing.steps.know.body',
    body: 'Type your own name, parents, and grandparents. Our intuitive pedigree canvas constructs harmonious generation geometry in seconds without rigid form filling.',
    footKey: 'landing.steps.know.foot',
    foot: 'Instant Pedigree Creation',
  },
  {
    icon: 'mic',
    titleKey: 'landing.steps.voices.title',
    title: 'Gather voices, photos & heirlooms',
    bodyKey: 'landing.steps.voices.body',
    body: "Attach uncompressed attic photography, handwritten recipe scans, and record grandfather's voice directly into his person profile via Oral History Mode.",
    footKey: 'landing.steps.voices.foot',
    foot: 'Lossless Oral Story Studio',
  },
  {
    icon: 'diversity_3',
    titleKey: 'landing.steps.invite.title',
    title: 'Invite kin to weave the tapestry',
    bodyKey: 'landing.steps.invite.body',
    body: 'Share private Circle passes with siblings, aunts, and descendants. Family members can enrich stories without fear of altering foundational historical documents.',
    footKey: 'landing.steps.invite.foot',
    foot: 'Collaborative Private Circles',
  },
]

const BENTO: Array<LandingItem & { chip: string; chipKey: string; span2?: boolean }> = [
  {
    chipKey: 'landing.bento.audio.chip',
    chip: 'Audio Keepsake Studio',
    icon: 'graphic_eq',
    titleKey: 'landing.bento.audio.title',
    title: 'Record the voices before they fade',
    bodyKey: 'landing.bento.audio.body',
    body: 'Prompt elder family members with archival interview templates. Record audio directly into their personal timeline, automatically transcribed with synchronized timestamps.',
    span2: true,
  },
  {
    chipKey: 'landing.bento.kinship.chip',
    chip: 'Inclusive Kinship Engine',
    icon: 'hub',
    titleKey: 'landing.bento.kinship.title',
    title: 'Modern, Complex Families',
    bodyKey: 'landing.bento.kinship.body',
    body: 'Effortlessly represent adoptions, blended kin, multiple unions, foster lineages, and non-traditional parentage without geometric awkwardness or erased branches.',
  },
  {
    chipKey: 'landing.bento.chronology.chip',
    chip: 'Temporal Sync',
    icon: 'history_edu',
    titleKey: 'landing.bento.chronology.title',
    title: 'Living Chronology',
    bodyKey: 'landing.bento.chronology.body',
    body: "Contextual historical event overlays. See how the Spanish Flu, the Great Depression, or global migrations directly touched your ancestors' exact towns.",
  },
  {
    chipKey: 'landing.bento.prints.chip',
    chip: 'Generational Physical Artifacts',
    icon: 'menu_book',
    titleKey: 'landing.bento.prints.title',
    title: 'Acid-Free Heirloom Books & Panoramic Rolls',
    bodyKey: 'landing.bento.prints.body',
    body: 'Transform your digital canvas into archival-grade linen bound volumes. Printed with pigment inks on 100% cotton mould-made paper rated to endure 200+ years.',
    span2: true,
  },
]

const PRINT_TILES = [
  { icon: 'verified', key: 'landing.bento.prints.tile1', text: 'ISO 9706 Archival Paper' },
  {
    icon: 'format_color_fill',
    key: 'landing.bento.prints.tile2',
    text: 'Pigment-based Mineral Inks',
  },
  { icon: 'auto_stories', key: 'landing.bento.prints.tile3', text: 'Hand-stitched Smythe-sewn' },
]

const NAV_LINKS = [
  { href: '#lineage-canvas', key: 'landing.nav.canvas', label: 'Lineage Canvas' },
  { href: '#archives-records', key: 'landing.nav.archives', label: 'Archives & Records' },
  { href: '#preservation-journal', key: 'landing.nav.journal', label: 'Preservation Journal' },
  { href: '#family-circles', key: 'landing.nav.circles', label: 'Family Circles' },
]

const FOOTER_LINKS = [
  { href: '#archives-records', key: 'landing.footer.standards', label: 'Archival Standards' },
  { href: '#family-circles', key: 'landing.footer.security', label: 'Lineage Security' },
  {
    href: '#preservation-journal',
    key: 'landing.footer.provenance',
    label: 'Provenance & Sources',
  },
  { href: '#lineage-canvas', key: 'landing.footer.api', label: 'Family Tree API' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  const filled = { fontVariationSettings: "'FILL' 1" } as const
  const forestBtn = cm.cn(
    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
    cm.sp('px', 5),
    cm.sp('py', 3),
    cm.textSize('base'),
    cm.fontWeight('semibold'),
    'rounded-lg text-white shadow-sm hover:shadow-md transition-all',
  )
  const forestBtnStyle = {
    backgroundColor: 'var(--color-forest)',
  } as const

  return (
    <div className={cm.cn('mol-archival-paper min-h-screen text-on-surface relative')}>
      {/* TopNav — brand + tagline, section links, vault indicator */}
      <header
        className={cm.cn(
          'fixed top-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-b shadow-sm',
        )}
        style={{ borderColor: 'var(--color-linen-border)' }}
      >
        <div
          className={cm.cn(
            'max-w-7xl',
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
          )}
        >
          <BrandWordmark size="lg" withTagline />
          <nav
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'lg' }),
              'hidden lg:flex whitespace-nowrap',
            )}
          >
            {NAV_LINKS.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                className={cm.cn(
                  cm.textSize('sm'),
                  i === 0 ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  'pb-1 border-b-2 transition-colors',
                )}
                style={
                  i === 0
                    ? {
                        color: 'var(--mol-color-primary)',
                        borderColor: 'var(--color-forest-hover)',
                      }
                    : {
                        color: 'var(--mol-color-text-secondary)',
                        borderColor: 'transparent',
                      }
                }
              >
                {t(l.key, {}, { defaultValue: l.label })}
              </a>
            ))}
          </nav>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'md' }), 'shrink-0')}>
            <span
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.sp('px', 3),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded-full border hidden xl:flex whitespace-nowrap',
              )}
              style={{
                backgroundColor: 'var(--mol-color-background-secondary)',
                borderColor: 'var(--color-linen-border)',
              }}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ color: 'var(--color-forest-hover)' }}
                aria-hidden="true"
              >
                lock
              </span>
              <span>
                {t('landing.nav.vault', {}, { defaultValue: 'Encrypted & Private Vault' })}
              </span>
            </span>
            {isAuthenticated ? (
              <Link
                to="/tree"
                className={cm.cn(forestBtn, cm.textSize('sm'))}
                style={forestBtnStyle}
                data-mol-id="landing-go-to-tree"
              >
                {t('common.goToTree', {}, { defaultValue: 'Go to your tree' })}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'rounded-lg hover:bg-surface-container transition-colors whitespace-nowrap',
                  )}
                  data-mol-id="landing-sign-in"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign In' })}
                </Link>
                <Link
                  to="/signup"
                  className={cm.cn(forestBtn, cm.textSize('sm'))}
                  style={forestBtnStyle}
                  data-mol-id="landing-start-your-tree"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    park
                  </span>
                  {t('landing.hero.startTree', {}, { defaultValue: 'Start Your Tree' })}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero — centered text block over watermark rings, canvas dossier below */}
        <section className={cm.cn('relative overflow-hidden', 'pt-28 md:pt-36', cm.sp('pb', 20))}>
          {/* Archival watermark rings */}
          <div
            className={cm.cn(
              'absolute inset-0 pointer-events-none opacity-40 flex items-center justify-center',
            )}
            aria-hidden="true"
          >
            <div className="w-[800px] h-[800px] rounded-full border border-outline-variant/30" />
            <div className="absolute w-[600px] h-[600px] rounded-full border border-dashed border-primary/20" />
            <div className="absolute w-[400px] h-[400px] rounded-full border border-outline-variant/20" />
          </div>
          <div className={cm.cn('max-w-7xl relative z-10', cm.mxAuto, cm.sp('px', 6))}>
            <div className={cm.cn('max-w-3xl', cm.mxAuto, cm.textCenter)}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
                  'inline-flex px-3.5 py-1 rounded-full border shadow-sm',
                )}
                style={{
                  backgroundColor: 'var(--mol-color-background-tertiary)',
                  borderColor: 'var(--color-linen-border)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-forest-hover)' }}
                  aria-hidden="true"
                />
                <span
                  className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'tracking-wide')}
                >
                  {t(
                    'landing.hero.eyebrow',
                    {},
                    { defaultValue: 'Your family, connected • Archival Sanctuary' },
                  )}
                </span>
              </span>
              <h1
                className={cm.cn(
                  cm.sp('mt', 5),
                  cm.fontWeight('semibold'),
                  'text-4xl md:text-5xl tracking-tight leading-[1.1]',
                )}
                style={{
                  fontFamily: 'var(--font-headline)',
                  color: 'var(--mol-color-primary-dark)',
                }}
              >
                {t(
                  'landing.hero.title',
                  {},
                  { defaultValue: 'Every generation has a story. Connect yours with quiet care.' },
                )}
              </h1>
              <p
                className={cm.cn(
                  cm.textSize('lg'),
                  'text-on-surface-variant max-w-2xl mx-auto leading-relaxed',
                  cm.sp('mt', 5),
                )}
              >
                {t(
                  'landing.hero.subtitle',
                  {},
                  {
                    defaultValue:
                      'The calm genealogy sanctuary for family historians. Start with yourself and branch outward — without the clutter, noisy hints, or data-brokering of commercial warehouses.',
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
                  cm.sp('mt', 8),
                )}
              >
                <Link
                  to="/signup"
                  className={cm.cn(forestBtn)}
                  style={{ ...forestBtnStyle, boxShadow: 'var(--shadow-md)' }}
                  data-mol-id="landing-hero-cta"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    psychiatry
                  </span>
                  {t('landing.hero.primaryCta', {}, { defaultValue: 'Start Your Family Tree' })}
                </Link>
                <a
                  href="#lineage-canvas"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.textSize('base'),
                    cm.fontWeight('semibold'),
                    'rounded-lg bg-surface border transition-colors hover:bg-surface-container',
                  )}
                  style={{ borderColor: 'var(--color-forest-hover)' }}
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    account_tree
                  </span>
                  {t('landing.hero.secondaryCta', {}, { defaultValue: 'Explore Sample Lineage' })}
                </a>
              </div>
              {/* Trust subtext */}
              <div
                className={cm.cn(
                  cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'lg' }),
                  cm.textSize('xs'),
                  cm.sp('mt', 6),
                )}
              >
                <span
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                  style={{ color: 'var(--mol-color-text-tertiary)' }}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ color: 'var(--color-forest-hover)' }}
                    aria-hidden="true"
                  >
                    check_circle
                  </span>
                  {t(
                    'landing.hero.trust1',
                    {},
                    { defaultValue: 'Takes 2 minutes • No card required' },
                  )}
                </span>
                <span
                  className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}
                  style={{ color: 'var(--mol-color-text-secondary)' }}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    style={{ color: 'var(--color-forest-hover)', ...filled }}
                    aria-hidden="true"
                  >
                    shield
                  </span>
                  {t(
                    'landing.hero.trustedBy',
                    { count: '84,000' },
                    {
                      defaultValue:
                        'Over {{count}} heirloom trees nurtured and protected privately',
                    },
                  )}
                </span>
              </div>
            </div>

            {/* Lineage canvas dossier */}
            <div
              id="lineage-canvas"
              className={cm.cn('max-w-5xl', cm.mxAuto, cm.sp('mt', 12), cm.sp('px', 2))}
            >
              <MiniTreePreview />
            </div>
          </div>
        </section>

        {/* Privacy & sanctuary band — deep forest */}
        <section
          id="family-circles"
          className={cm.cn('relative overflow-hidden', cm.sp('py', 20), cm.sp('px', 6))}
          style={{ backgroundColor: 'var(--color-forest)' }}
        >
          {/* Watermark shield */}
          <div
            className={cm.cn(
              'absolute inset-0 pointer-events-none flex items-center justify-center opacity-5',
            )}
            aria-hidden="true"
          >
            <span
              className="material-symbols-outlined text-[600px]"
              style={{ color: 'var(--mol-color-text-inverse)' }}
            >
              shield
            </span>
          </div>
          <div className={cm.cn('max-w-7xl relative z-10', cm.mxAuto)}>
            <div className={cm.cn('max-w-3xl', cm.mxAuto, cm.textCenter)}>
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs', justify: 'center' }),
                  'inline-flex px-3 py-1 rounded-full border text-[11px] font-semibold tracking-wide',
                )}
                style={{
                  backgroundColor: 'var(--color-forest-deep)',
                  color: 'var(--color-forest-mint)',
                  borderColor: 'color-mix(in srgb, var(--color-forest-mist) 30%, transparent)',
                }}
              >
                <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                  lock
                </span>
                {t('landing.private.badge', {}, { defaultValue: 'Archival Trust Guarantee' })}
              </span>
              <h2
                className={cm.cn(
                  cm.sp('mt', 4),
                  cm.textSize('4xl'),
                  cm.fontWeight('semibold'),
                  'tracking-tight text-white',
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.private.heading',
                  {},
                  { defaultValue: "Your family's memories belong only to your family." },
                )}
              </h2>
              <p
                className={cm.cn(cm.textSize('lg'), 'leading-relaxed', cm.sp('mt', 4))}
                style={{ color: 'var(--color-forest-mist)' }}
              >
                {t(
                  'landing.private.subheading',
                  {},
                  {
                    defaultValue:
                      "Unlike commercial genealogical warehouses, Branches will never sell DNA data, monetize living family directories, or serve ads against your grandmothers' memories.",
                  },
                )}
              </p>
            </div>
            {/* Pillars */}
            <div
              className={cm.cn(
                cm.grid({ gap: 'lg' }),
                'grid-cols-1 md:grid-cols-3',
                cm.sp('mt', 12),
              )}
            >
              {PILLARS.map((p) => (
                <div
                  key={p.titleKey}
                  className={cm.cn('rounded-xl border p-8')}
                  style={{
                    backgroundColor:
                      'color-mix(in srgb, var(--color-forest-deep) 55%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-forest-mist) 20%, transparent)',
                  }}
                >
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', justify: 'center' }),
                      cm.w(12),
                      cm.h(12),
                      'rounded-lg mb-4',
                    )}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'var(--color-forest-mint)',
                    }}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[28px]">{p.icon}</span>
                  </div>
                  <h3
                    className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-white')}
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    {t(p.titleKey, {}, { defaultValue: p.title })}
                  </h3>
                  <p
                    className={cm.cn(cm.textSize('sm'), 'leading-relaxed', cm.sp('mt', 3))}
                    style={{ color: 'var(--color-forest-mist)' }}
                  >
                    {t(p.bodyKey, {}, { defaultValue: p.body })}
                  </p>
                  <div
                    className={cm.cn(
                      cm.flex({ align: 'center', gap: 'xs' }),
                      cm.textSize('xs'),
                      cm.sp('pt', 4),
                      cm.sp('mt', 4),
                    )}
                    style={{
                      color: 'var(--color-forest-mint)',
                      borderTop:
                        '1px solid color-mix(in srgb, var(--color-forest-mist) 15%, transparent)',
                    }}
                  >
                    <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                      {p.footIcon}
                    </span>
                    <span>{t(p.footKey ?? '', {}, { defaultValue: p.foot ?? '' })}</span>
                  </div>
                </div>
              ))}
            </div>
            <p
              className={cm.cn(
                cm.textCenter,
                cm.textSize('xs'),
                'tracking-wider uppercase',
                cm.sp('mt', 12),
              )}
              style={{ color: 'var(--color-forest-mist)' }}
            >
              {t(
                'landing.private.endorsement',
                {},
                {
                  defaultValue:
                    'Endorsed by the Guild of One-Name Studies & Independent Archival Registries',
                },
              )}
            </p>
          </div>
        </section>

        {/* Three-step ritual */}
        <section
          id="preservation-journal"
          className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('py', 24), cm.sp('px', 6))}
        >
          <div className={cm.cn('max-w-3xl', cm.mxAuto, cm.textCenter)}>
            <p
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                'tracking-wider uppercase',
              )}
              style={{ color: 'var(--color-forest-hover)' }}
            >
              {t('landing.steps.eyebrow', {}, { defaultValue: 'Mindful Methodology' })}
            </p>
            <h2
              className={cm.cn(
                cm.textSize('4xl'),
                cm.fontWeight('semibold'),
                'tracking-tight',
                cm.sp('mt', 3),
              )}
              style={{ fontFamily: 'var(--font-headline)', color: 'var(--mol-color-primary-dark)' }}
            >
              {t(
                'landing.steps.heading',
                {},
                { defaultValue: 'A tranquil ritual, built generation by generation' },
              )}
            </h2>
            <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant', cm.sp('mt', 3))}>
              {t(
                'landing.steps.subheading',
                {},
                {
                  defaultValue:
                    "Genealogy shouldn't feel like a spreadsheet audit. Branches turns family discovery into an evening meditation.",
                },
              )}
            </p>
          </div>
          <div
            className={cm.cn(cm.grid({ gap: 'lg' }), 'grid-cols-1 md:grid-cols-3', cm.sp('mt', 16))}
          >
            {STEPS.map((s, i) => (
              <div
                key={s.titleKey}
                className={cm.cn('mol-linen-card rounded-xl p-8 flex flex-col')}
              >
                <span
                  className={cm.cn(cm.textSize('6xl'), cm.fontWeight('semibold'), 'leading-none')}
                  style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-archival-dot)' }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3
                  className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), cm.sp('mt', 4))}
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {t(s.titleKey, {}, { defaultValue: s.title })}
                </h3>
                <p
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant leading-relaxed',
                    cm.sp('mt', 3),
                  )}
                >
                  {t(s.bodyKey, {}, { defaultValue: s.body })}
                </p>
                <div
                  className={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.textSize('xs'),
                    cm.sp('mt', 6),
                    cm.sp('pt', 4),
                    'border-t',
                  )}
                  style={{
                    color: 'var(--color-forest-hover)',
                    borderColor: 'var(--color-linen-border)',
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    {s.icon}
                  </span>
                  <span>{t(s.footKey ?? '', {}, { defaultValue: s.foot ?? '' })}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bento features — archival standard band */}
        <section
          id="archives-records"
          className={cm.cn('bg-surface-container-low border-y', cm.sp('py', 20), cm.sp('px', 6))}
          style={{ borderColor: 'var(--color-linen-border)' }}
        >
          <div className={cm.cn('max-w-7xl', cm.mxAuto)}>
            <div className={cm.cn('max-w-2xl')}>
              <p
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  'tracking-wider uppercase',
                )}
                style={{ color: 'var(--color-forest-hover)' }}
              >
                {t('landing.bento.eyebrow', {}, { defaultValue: 'The Archival Standard' })}
              </p>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('semibold'),
                  'tracking-tight',
                  cm.sp('mt', 3),
                )}
                style={{
                  fontFamily: 'var(--font-headline)',
                  color: 'var(--mol-color-primary-dark)',
                }}
              >
                {t(
                  'landing.bento.heading',
                  {},
                  { defaultValue: "Tools worthy of your family's deepest memories" },
                )}
              </h2>
              <p className={cm.cn(cm.textSize('lg'), 'text-on-surface-variant', cm.sp('mt', 3))}>
                {t(
                  'landing.bento.subheading',
                  {},
                  {
                    defaultValue:
                      'Crafted for longevity, historical fidelity, and intergenerational clarity.',
                  },
                )}
              </p>
            </div>
            <div
              className={cm.cn(
                cm.grid({ gap: 'md' }),
                'grid-cols-1 md:grid-cols-3',
                cm.sp('mt', 12),
              )}
            >
              {BENTO.map((b, idx) => (
                <article
                  key={b.titleKey}
                  className={cm.cn(
                    'mol-linen-card rounded-xl p-8 flex flex-col',
                    b.span2 ? 'md:col-span-2' : '',
                  )}
                >
                  <div
                    className={cm.cn(cm.flex({ align: 'start', justify: 'between', gap: 'md' }))}
                  >
                    <div>
                      <span
                        className={cm.cn(
                          cm.sp('px', 2.5),
                          cm.sp('py', 1),
                          cm.textSize('xs'),
                          'rounded font-semibold',
                        )}
                        style={
                          b.span2
                            ? {
                                backgroundColor: 'var(--color-vault-chip)',
                                color: 'var(--color-on-vault-chip)',
                              }
                            : {
                                backgroundColor: 'var(--mol-color-background-tertiary)',
                                color: 'var(--mol-color-primary-dark)',
                              }
                        }
                      >
                        {t(b.chipKey, {}, { defaultValue: b.chip })}
                      </span>
                      <h3
                        className={cm.cn(
                          cm.textSize('xl'),
                          cm.fontWeight('semibold'),
                          cm.sp('mt', 3),
                        )}
                        style={{ fontFamily: 'var(--font-headline)' }}
                      >
                        {t(b.titleKey, {}, { defaultValue: b.title })}
                      </h3>
                      <p
                        className={cm.cn(
                          cm.textSize('sm'),
                          'text-on-surface-variant leading-relaxed',
                          cm.sp('mt', 2),
                          b.span2 ? 'max-w-xl' : '',
                        )}
                      >
                        {t(b.bodyKey, {}, { defaultValue: b.body })}
                      </p>
                    </div>
                    <span
                      className="material-symbols-outlined text-[36px] shrink-0"
                      style={{ color: 'var(--color-forest-hover)' }}
                      aria-hidden="true"
                    >
                      {b.icon}
                    </span>
                  </div>
                  {/* Card-specific visuals */}
                  {idx === 0 && <AudioPlayerMock cm={cm} t={t} />}
                  {idx === 1 && (
                    <div
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'around' }),
                        cm.sp('p', 4),
                        'rounded-lg border',
                        cm.sp('mt', 6),
                      )}
                      style={{
                        backgroundColor: 'var(--mol-color-background-secondary)',
                        borderColor: 'var(--color-linen-border)',
                      }}
                      aria-hidden="true"
                    >
                      {['hub', 'alt_route', 'all_inclusive'].map((g) => (
                        <span
                          key={g}
                          className="material-symbols-outlined text-[28px]"
                          style={{ color: 'var(--color-forest-hover)' }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                  {idx === 2 && (
                    <div
                      className={cm.cn(cm.accentCard({ tone: 'custom' }), cm.sp('mt', 6))}
                      style={{ ['--mol-accent' as string]: 'var(--color-forest-hover)' }}
                    >
                      <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                        {t(
                          'landing.bento.chronology.event',
                          {},
                          { defaultValue: '1929 • The Crash' },
                        )}
                      </p>
                      <p
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant',
                          cm.sp('mt', 1),
                        )}
                      >
                        {t(
                          'landing.bento.chronology.detail',
                          {},
                          {
                            defaultValue:
                              'Arthur relocates family clockmaking workshop to Manchester.',
                          },
                        )}
                      </p>
                    </div>
                  )}
                  {idx === 3 && (
                    <div
                      className={cm.cn(
                        cm.grid({ gap: 'sm' }),
                        'grid-cols-1 sm:grid-cols-3',
                        cm.sp('mt', 6),
                      )}
                    >
                      {PRINT_TILES.map((tile) => (
                        <div
                          key={tile.key}
                          className={cm.cn(
                            cm.flex({ align: 'center', gap: 'xs' }),
                            cm.sp('p', 3),
                            'rounded-lg border bg-surface',
                          )}
                          style={{ borderColor: 'var(--color-linen-border)' }}
                        >
                          <span
                            className="material-symbols-outlined text-[20px]"
                            style={{ color: 'var(--color-forest-hover)' }}
                            aria-hidden="true"
                          >
                            {tile.icon}
                          </span>
                          <span className={cm.cn(cm.textSize('xs'))}>
                            {t(tile.key, {}, { defaultValue: tile.text })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Archivist testimonial */}
        <section className={cm.cn('max-w-5xl', cm.mxAuto, cm.sp('py', 20), cm.sp('px', 6))}>
          <div
            className={cm.cn(
              'mol-linen-card rounded-2xl relative text-center',
              cm.sp('p', 8),
              'md:p-14',
            )}
          >
            <span
              className="material-symbols-outlined text-[56px] leading-none"
              style={{ color: 'color-mix(in srgb, var(--color-forest-hover) 30%, transparent)' }}
              aria-hidden="true"
            >
              format_quote
            </span>
            <blockquote
              className={cm.cn(
                cm.textSize('xl'),
                'italic leading-relaxed max-w-3xl mx-auto',
                cm.sp('mt', 2),
              )}
              style={{ fontFamily: 'var(--font-headline)', color: 'var(--mol-color-primary-dark)' }}
            >
              {t(
                'landing.testimonial.quote',
                {},
                {
                  defaultValue:
                    '"Commercial genealogy portals turn our ancestors into clickbait leads. Branches restores the quiet dignity our grandparents deserve. The oral history recording studio alone has salvaged stories my family would have permanently lost."',
                },
              )}
            </blockquote>
            <div className={cm.cn(cm.sp('pt', 4))}>
              <p className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
                {t('landing.testimonial.name', {}, { defaultValue: 'Dr. Helena Sterling' })}
              </p>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('mt', 1))}>
                {t(
                  'landing.testimonial.role',
                  {},
                  {
                    defaultValue:
                      "Archivist & Custodian of the Sterling-O'Connell Family Tree (1684–2024)",
                  },
                )}
              </p>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                  cm.sp('pt', 3),
                )}
                style={{ color: 'var(--color-forest-hover)' }}
                aria-hidden="true"
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <span key={n} className="material-symbols-outlined text-[16px]" style={filled}>
                    star
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA band */}
        <section id="start" className={cm.cn('max-w-7xl', cm.mxAuto, cm.sp('px', 6), 'pb-16 mb-6')}>
          <div
            className={cm.cn(
              'rounded-2xl relative overflow-hidden',
              cm.sp('p', 8),
              'md:p-14',
              cm.flex({ direction: 'col', justify: 'between', align: 'center', gap: 'lg' }),
              'lg:flex-row',
            )}
            style={{ backgroundColor: 'var(--color-forest)' }}
          >
            <div className={cm.cn('max-w-xl text-center lg:text-left')}>
              <span
                className={cm.cn('inline-block px-3 py-1 rounded-full text-[11px] font-semibold')}
                style={{
                  backgroundColor: 'var(--color-forest-deep)',
                  color: 'var(--color-forest-mint)',
                }}
              >
                {t('landing.cta.badge', {}, { defaultValue: 'No Credit Card Needed' })}
              </span>
              <h2
                className={cm.cn(
                  cm.textSize('4xl'),
                  cm.fontWeight('semibold'),
                  'tracking-tight text-white',
                  cm.sp('mt', 3),
                )}
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {t(
                  'landing.cta.heading',
                  {},
                  { defaultValue: 'Start building your family legacy this evening.' },
                )}
              </h2>
              <p
                className={cm.cn(cm.textSize('sm'), 'leading-relaxed', cm.sp('mt', 3))}
                style={{ color: 'var(--color-forest-mist)' }}
              >
                {t(
                  'landing.cta.subheading',
                  {},
                  {
                    defaultValue:
                      'Protect your lineage inside an uncompromised archival vault. Plant your first leaf in under three minutes.',
                  },
                )}
              </p>
            </div>
            {/* Signup card */}
            <div
              className={cm.cn(
                'w-full max-w-md bg-surface rounded-xl shadow-lg border',
                cm.sp('p', 4),
              )}
              style={{ borderColor: 'var(--color-linen-border)' }}
            >
              <div className={cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), 'sm:flex-row')}>
                <input
                  type="email"
                  className={cm.cn(
                    cm.flex1,
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    'rounded-lg border bg-surface-container-lowest outline-none w-full',
                  )}
                  style={{ borderColor: 'var(--mol-color-border)' }}
                  placeholder={t(
                    'landing.cta.emailPlaceholder',
                    {},
                    { defaultValue: 'Enter your family email...' },
                  )}
                  aria-label={t(
                    'landing.cta.emailPlaceholder',
                    {},
                    { defaultValue: 'Enter your family email...' },
                  )}
                />
                <Link
                  to="/signup"
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center', gap: 'xs' }),
                    cm.sp('px', 5),
                    cm.sp('py', 3),
                    cm.textSize('sm'),
                    cm.fontWeight('semibold'),
                    'rounded-lg text-white shadow-sm shrink-0',
                  )}
                  style={forestBtnStyle}
                  data-mol-id="landing-cta-start-free"
                >
                  {t('landing.cta.button', {}, { defaultValue: 'Start Free' })}
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    arrow_forward
                  </span>
                </Link>
              </div>
              <div
                className={cm.cn(
                  cm.flex({ align: 'center', justify: 'center', gap: 'sm' }),
                  cm.textSize('xs'),
                  cm.sp('mt', 3),
                )}
                style={{ color: 'var(--mol-color-text-tertiary)' }}
              >
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                    lock
                  </span>
                  {t('landing.cta.trust1', {}, { defaultValue: '256-bit AES Vault' })}
                </span>
                <span aria-hidden="true">•</span>
                <span className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                    download
                  </span>
                  {t('landing.cta.trust2', {}, { defaultValue: 'GEDCOM export ready' })}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer — brand + copyright, link row */}
      <footer
        className={cm.cn('bg-surface-container border-t', cm.sp('py', 12), cm.sp('px', 6))}
        style={{ borderColor: 'var(--color-linen-border)' }}
      >
        <div
          className={cm.cn(
            'max-w-7xl',
            cm.mxAuto,
            cm.flex({ direction: 'col', align: 'center', justify: 'between', gap: 'md' }),
            'md:flex-row',
          )}
        >
          <div
            className={cm.cn(
              cm.flex({ direction: 'col', align: 'center', gap: 'sm' }),
              'md:flex-row md:text-left',
            )}
          >
            <BrandWordmark as="span" size="sm" footer />
            <span className="hidden md:inline" style={{ color: 'var(--color-archival-dot)' }}>
              |
            </span>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
              {t(
                'landing.footer.copyright',
                { year: new Date().getFullYear(), appName: APP_NAME },
                {
                  defaultValue:
                    '© {{year}} {{appName}} Historical Preservation Society. All ancestral records private and encrypted.',
                },
              )}
            </p>
          </div>
          <nav
            className={cm.cn(
              cm.flex({ wrap: 'wrap', align: 'center', justify: 'center', gap: 'md' }),
              cm.textSize('xs'),
            )}
          >
            {FOOTER_LINKS.map((l) => (
              <a
                key={l.key}
                href={l.href}
                className="text-on-surface-variant hover:text-on-surface transition-colors"
              >
                {t(l.key, {}, { defaultValue: l.label })}
              </a>
            ))}
            <Link
              to="/terms"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {t('landing.footer.terms', {}, { defaultValue: 'Terms of Trust' })}
            </Link>
            <Link
              to="/privacy"
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              {t('landing.footer.privacy', {}, { defaultValue: 'Privacy Policy' })}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/** The bento audio card's embedded player mock — waveform + quote line. */
function AudioPlayerMock({
  cm,
  t,
}: {
  cm: ReturnType<typeof getClassMap>
  t: ReturnType<typeof useTranslation>['t']
}) {
  const bars = [
    { h: 8, played: true },
    { h: 20, played: true },
    { h: 28, played: true },
    { h: 12, played: true },
    { h: 24, played: true },
    { h: 32, played: true },
    { h: 16, played: true },
    { h: 24, played: true },
    { h: 8, played: false },
    { h: 16, played: false },
    { h: 28, played: false },
    { h: 20, played: false },
    { h: 12, played: false },
    { h: 8, played: false },
  ]
  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col', gap: 'md' }),
        'sm:flex-row sm:items-center',
        cm.sp('p', 4),
        'rounded-lg border',
        cm.sp('mt', 6),
      )}
      style={{
        backgroundColor: 'var(--mol-color-background-secondary)',
        borderColor: 'var(--color-linen-border)',
      }}
    >
      <div
        className={cm.cn(
          cm.w(12),
          cm.h(12),
          'rounded-full flex items-center justify-center shrink-0 shadow-sm',
        )}
        style={{ backgroundColor: 'var(--color-forest)', color: 'var(--mol-color-text-inverse)' }}
        aria-hidden="true"
      >
        <span
          className="material-symbols-outlined text-[24px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          mic
        </span>
      </div>
      <div className="flex-1 w-full min-w-0">
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            'mb-1',
          )}
        >
          <span className="truncate">
            {t(
              'landing.bento.audio.clipTitle',
              {},
              { defaultValue: 'Crossing the Atlantic in the winter of 1953' },
            )}
          </span>
          <span className="text-on-surface-variant tabular-nums shrink-0">
            {t('landing.bento.audio.clipLength', {}, { defaultValue: '08:14' })}
          </span>
        </div>
        <div
          className={cm.cn(cm.flex({ align: 'end', gap: 'xs' }), 'h-8 bg-surface rounded px-2')}
          aria-hidden="true"
        >
          {bars.map((b, i) => (
            <span
              key={i}
              className="w-1 rounded"
              style={{
                height: b.h,
                backgroundColor: b.played
                  ? 'var(--color-forest-hover)'
                  : 'var(--color-linen-border)',
              }}
            />
          ))}
        </div>
        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant italic', cm.sp('mt', 2))}>
          {t(
            'landing.bento.audio.quote',
            {},
            {
              defaultValue:
                '"The waves reached the promenade deck, but father held onto his brass pocket watch..."',
            },
          )}
        </p>
      </div>
    </div>
  )
}
