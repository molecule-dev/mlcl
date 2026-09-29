import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { BrandWordmark } from '../components/BrandWordmark.js'
import { FormulaPlayground } from '../components/FormulaPlayground.js'
import { GridPreview } from '../components/GridPreview.js'

const FEATURES = [
  {
    icon: 'function',
    titleKey: 'landing.features.formulas.title',
    titleDefault: 'Formulas that read like English',
    descKey: 'landing.features.formulas.desc',
    descDefault:
      '350+ functions, named ranges, structured references, recalculation in under 50 ms across million-row workbooks.',
  },
  {
    icon: 'view_kanban',
    titleKey: 'landing.features.views.title',
    titleDefault: 'Five views, one source of truth',
    descKey: 'landing.features.views.desc',
    descDefault:
      'Grid, Form, Kanban, Gallery, Calendar — switch in a keystroke without ever forking your data.',
  },
  {
    icon: 'group',
    titleKey: 'landing.features.collab.title',
    titleDefault: 'Real-time, presence-aware',
    descKey: 'landing.features.collab.desc',
    descDefault:
      'See teammate cursors and selections live. Cell-level comments, mentions, and version history.',
  },
  {
    icon: 'bolt',
    titleKey: 'landing.features.automations.title',
    titleDefault: 'Automations without scripting',
    descKey: 'landing.features.automations.desc',
    descDefault:
      'When-this-then-that triggers across every column type. Webhook in, webhook out, no glue code required.',
  },
]

const SAMPLE_GRID = {
  columns: [
    { id: 'name', label: 'Name', type: 'text' as const, width: 180 },
    { id: 'team', label: 'Team', type: 'select' as const, width: 130 },
    { id: 'mrr', label: 'MRR', type: 'currency' as const, width: 120 },
    { id: 'growth', label: 'Growth', type: 'percent' as const, width: 110 },
    { id: 'next', label: 'Next review', type: 'date' as const, width: 140 },
  ],
  rows: [
    [
      { display: 'Northwind Co.', type: 'text' as const },
      { display: 'Finance', type: 'select' as const, tint: 'emerald' as const },
      { display: '$48,200', type: 'currency' as const, numeric: true },
      { display: '+12.4%', type: 'percent' as const, numeric: true },
      { display: 'Apr 30', type: 'date' as const },
    ],
    [
      { display: 'Lumina Labs', type: 'text' as const },
      { display: 'Product', type: 'select' as const, tint: 'primary' as const },
      { display: '$31,750', type: 'currency' as const, numeric: true, selected: true },
      { display: '+5.1%', type: 'percent' as const, numeric: true },
      { display: 'May 02', type: 'date' as const },
    ],
    [
      { display: 'Borealis Inc.', type: 'text' as const },
      { display: 'Marketing', type: 'select' as const, tint: 'rose' as const },
      { display: '=SUM(C2:C3)', type: 'formula' as const, numeric: true },
      { display: '−2.3%', type: 'percent' as const, numeric: true },
      { display: 'May 09', type: 'date' as const },
    ],
    [
      { display: 'Polaris Group', type: 'text' as const },
      { display: 'Ops', type: 'select' as const, tint: 'amber' as const },
      { display: '$22,140', type: 'currency' as const, numeric: true },
      { display: '+8.9%', type: 'percent' as const, numeric: true },
      { display: 'May 14', type: 'date' as const },
    ],
  ],
}

const FORMULA_EXAMPLES = [
  {
    cell: 'C7',
    formula: '=SUMIF(Team,"Finance",MRR)',
    result: '$48,200',
    note: 'Sum every row where Team equals "Finance".',
  },
  {
    cell: 'D9',
    formula: '=ARRAYFORMULA( (C:C - C:C{1}) / C:C{1} )',
    result: '+12.4%, +5.1%, −2.3%, +8.9%',
    note: 'Vectorized growth — no dragging cells.',
  },
  {
    cell: 'F2',
    formula: '=LOOKUP(Customers, "id", $A2)',
    result: '✓ Linked → 312 customers',
    note: 'Linked records resolve names automatically.',
  },
]

/* Formula showcase strip chips (design: "Native Syntax" band). */
const SYNTAX_CHIPS = ['SUM', 'VLOOKUP', 'IF', 'INDEX', 'FILTER', 'SORT']

/* Co-editor avatars in the mock window chrome (design hero visual).
   Tailwind palette utilities — the mock window is mode-independent chrome. */
const CO_EDITORS = [
  { initials: 'JD', cls: 'bg-amber-100 text-amber-700' },
  { initials: 'AW', cls: 'bg-pink-100 text-pink-700' },
  { initials: 'RL', cls: 'bg-violet-100 text-violet-700' },
  { initials: 'ST', cls: 'bg-teal-100 text-teal-700' },
]

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'bg-surface-container-low text-on-surface antialiased')}
    >
      <header
        className={cm.cn(
          cm.flex({ align: 'center', justify: 'between' }),
          cm.sp('px', 8),
          cm.sp('py', 5),
          'sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/40',
        )}
      >
        <Link
          to="/"
          data-mol-id="nav-brand"
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}
        >
          <BrandWordmark as="span" size="md" />
          <span
            className={cm.cn(
              cm.textSize('xs'),
              'text-on-surface-variant hidden sm:inline-block border-l border-outline-variant pl-2',
            )}
          >
            {t('landing.nav.tagline', {}, { defaultValue: 'Structure your thinking' })}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
          <a
            href="#features"
            className={
              'inline-block py-3 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#formulas"
            className={
              'inline-block py-3 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {t('landing.nav.formulas', {}, { defaultValue: 'Formulas' })}
          </a>
          <Link
            to="/templates"
            className={
              'inline-block py-3 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {t('nav.templates', {}, { defaultValue: 'Templates' })}
          </Link>
        </nav>
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          {isAuthenticated ? (
            <Link
              to="/workbooks"
              data-mol-id="nav-dashboard"
              className={
                'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-primary rounded-md bg-primary shadow-sm hover:brightness-110 transition-all'
              }
            >
              {t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-mol-id="nav-signin"
                className={
                  'hidden sm:inline-flex px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors'
                }
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                data-mol-id="nav-signup-cta"
                className={
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-primary rounded-md bg-primary shadow-sm hover:brightness-110 transition-all'
                }
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero — split copy / mock spreadsheet window */}
      <section className={cm.cn(cm.sp('px', 6), 'pt-16 pb-16 md:pt-24 md:pb-20')}>
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            'grid grid-cols-1 lg:grid-cols-2 gap-16 items-center',
          )}
        >
          <div className={cm.cn(cm.flex({ direction: 'col', gap: 'lg' }))}>
            <h1
              className={cm.cn(
                'text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-on-surface',
              )}
            >
              {t('landing.hero.headlineLead', {}, { defaultValue: 'Structure your thinking in ' })}
              <span className="text-primary">
                {t('landing.hero.wordCells', {}, { defaultValue: 'cells' })}
              </span>
              {', '}
              <span className="text-formula">
                {t('landing.hero.wordFormulas', {}, { defaultValue: 'formulas' })}
              </span>
              {t('landing.hero.headlineTail', {}, { defaultValue: ', and views.' })}
            </h1>
            <p
              className={cm.cn(
                cm.textSize('lg'),
                'text-on-surface-variant leading-relaxed',
                cm.maxW('lg'),
              )}
            >
              {t(
                'landing.hero.subhead',
                { tagline: APP_TAGLINE, name: APP_NAME },
                {
                  defaultValue:
                    '{{name}} is the spreadsheet built for precision — formula-first, multi-view, and real-time, designed for the way analysts and structured thinkers operate.',
                },
              )}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                cm.sp('pt', 4),
              )}
            >
              <Link
                to="/signup"
                data-mol-id="landing-hero-cta"
                className={
                  'inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-on-primary rounded-md bg-primary shadow-sm hover:brightness-110 transition-all'
                }
              >
                {t('common.startFree', {}, { defaultValue: 'Start free' })}
                <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                  arrow_forward
                </span>
              </Link>
              <Link
                to="/templates"
                className={
                  'inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-on-surface rounded-md bg-surface border border-outline-variant shadow-sm hover:bg-surface-container-low transition-colors'
                }
              >
                {t('landing.hero.openTemplate', {}, { defaultValue: 'Open a template' })}
              </Link>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }),
                cm.sp('pt', 4),
                cm.textSize('sm'),
                'text-on-surface-variant',
              )}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {[
                { key: 'check1', def: 'Tabular nums' },
                { key: 'check2', def: 'JetBrains Mono' },
                { key: 'check3', def: 'Keyboard fluent' },
              ].map((c) => (
                <span key={c.key} className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }))}>
                  <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
                    check
                  </span>
                  {t(`landing.hero.${c.key}`, {}, { defaultValue: c.def })}
                </span>
              ))}
            </div>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant', cm.sp('pt', 2))}>
              {t(
                'landing.hero.socialProof',
                {},
                { defaultValue: 'Trusted by 14,000+ analysts · CFO-approved · SOC 2 Type II' },
              )}
            </p>
          </div>

          {/* Mock spreadsheet window — real GridPreview inside design chrome */}
          <div
            className={cm.cn(
              'relative w-full rounded-lg border border-outline-variant bg-surface shadow-xl overflow-hidden select-none',
            )}
          >
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'between' }),
                'px-4 py-2 border-b border-outline-variant bg-surface-container-low',
              )}
            >
              <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
                <span
                  className={cm.cn('material-symbols-outlined text-on-surface-variant text-xl')}
                  aria-hidden="true"
                >
                  description
                </span>
                <span
                  className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Q3_Analysis_Final.clct
                </span>
              </div>
              <div className={cm.cn(cm.flex({ align: 'center' }), '-space-x-2')} aria-hidden="true">
                {CO_EDITORS.map((e) => (
                  <span
                    key={e.initials}
                    className={cm.cn(
                      'w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold relative z-10',
                      e.cls,
                    )}
                  >
                    {e.initials}
                  </span>
                ))}
              </div>
            </div>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'sm' }),
                'px-3 py-2 border-b border-outline-variant bg-surface',
              )}
            >
              <span
                className={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('medium'),
                  'text-on-surface-variant bg-surface-container px-2 py-1 rounded',
                )}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                B11
              </span>
              <span
                className={cm.cn(cm.textSize('sm'), 'text-formula font-bold italic')}
                style={{ fontFamily: 'var(--font-mono)' }}
                aria-hidden="true"
              >
                fx
              </span>
              <span
                className={cm.cn('flex-1 text-on-surface')}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="text-on-surface-variant">=</span>
                <span className="text-formula font-semibold">SUM</span>
                <span className="text-on-surface-variant">(</span>
                {/* primary-dark: #1d4ed8 = 5.49:1 on bg-primary-light #dbeafe
                    (text-primary #2563eb was 4.23:1 — axe color-contrast fail) */}
                <span className="text-primary-dark bg-primary-light px-0.5 rounded">B2:B10</span>
                <span className="text-on-surface-variant">)</span>
              </span>
            </div>
            <GridPreview
              {...SAMPLE_GRID}
              formula='=SUMIF(Team,"Finance",MRR)'
              selectedCellRef="C3"
            />
          </div>
        </div>
      </section>

      {/* Formula syntax strip (design band) */}
      <section
        data-mol-id="landing-syntax-strip"
        className={cm.cn(
          'border-y border-outline-variant/40 bg-surface-container-low overflow-hidden',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.sp('px', 6),
            cm.sp('py', 8),
            cm.flex({ align: 'center', gap: 'lg', wrap: 'wrap' }),
          )}
        >
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'uppercase tracking-widest text-on-surface-variant shrink-0',
            )}
          >
            {t('landing.syntaxLabel', {}, { defaultValue: 'Native syntax' })}
          </span>
          <div className={cm.cn(cm.flex({ gap: 'md', wrap: 'wrap' }))}>
            {SYNTAX_CHIPS.map((fn) => (
              <span
                key={fn}
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  'px-4 py-2 rounded-md border border-outline-variant bg-surface shadow-sm',
                  cm.textSize('sm'),
                )}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                <span className="text-on-surface-variant">=</span>
                <span className="text-formula font-bold">{fn}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className={cm.cn(cm.sp('px', 6), cm.sp('py', 24), 'bg-surface')}>
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
          <p
            className={
              'text-[11px] font-bold uppercase tracking-[0.3em] text-primary text-center mb-3'
            }
          >
            {t(
              'landing.features.eyebrow',
              {},
              { defaultValue: 'Built for analysts, not accountants' },
            )}
          </p>
          <h2
            className={cm.cn(
              cm.textSize('4xl'),
              cm.textCenter,
              cm.sp('mb', 16),
              'font-extrabold tracking-tight',
            )}
          >
            {t(
              'landing.features.headline',
              {},
              { defaultValue: 'Four ideas, executed obsessively.' },
            )}
          </h2>
          <div className={cm.cn(cm.grid({ cols: 4, gap: 'lg' }))}>
            {FEATURES.map((feat) => (
              <div
                key={feat.icon}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-lowest rounded-lg border border-outline-variant/40 shadow-sm hover:-translate-y-1 transition-transform duration-300',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    cm.sp('mb', 4),
                    'rounded-lg bg-primary-light text-primary',
                  )}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">{feat.icon}</span>
                </span>
                <h3
                  className={cm.cn(
                    cm.textSize('lg'),
                    'font-extrabold tracking-tight mb-2 text-on-surface',
                  )}
                >
                  {t(feat.titleKey, {}, { defaultValue: feat.titleDefault })}
                </h3>
                <p className={'text-sm leading-relaxed text-on-surface-variant'}>
                  {t(feat.descKey, {}, { defaultValue: feat.descDefault })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="formulas"
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 24), 'bg-surface-container-low')}
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto)}>
          <FormulaPlayground examples={FORMULA_EXAMPLES} />
        </div>
      </section>

      <section
        className={cm.cn(
          cm.sp('px', 6),
          cm.sp('py', 20),
          'bg-surface text-center border-t border-outline-variant/40',
        )}
      >
        <h2 className={cm.cn(cm.textSize('4xl'), 'font-extrabold tracking-tight mb-4')}>
          {t('landing.cta.headline', {}, { defaultValue: 'Stop wrangling. Start analysing.' })}
        </h2>
        <p
          className={cm.cn(
            cm.maxW('xl'),
            cm.mxAuto,
            cm.sp('mb', 8),
            cm.textSize('lg'),
            'text-on-surface-variant',
          )}
        >
          {t(
            'landing.cta.subhead',
            {},
            {
              defaultValue:
                'A 30-second sign-up. A workspace that grows with your team. No credit card.',
            },
          )}
        </p>
        <Link
          to="/signup"
          data-mol-id="landing-cta-band-button"
          className={
            'inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-on-primary rounded-md bg-primary shadow-sm hover:brightness-110 transition-all'
          }
        >
          {t('auth.signup.createYourWorkspace', {}, { defaultValue: 'Create your workspace' })}
          <span className={'material-symbols-outlined text-base'} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </section>

      <footer
        className={cm.cn(
          cm.sp('px', 8),
          cm.sp('py', 10),
          'bg-surface-container-low border-t border-outline-variant/40 text-sm text-on-surface-variant',
        )}
      >
        <div
          className={cm.cn(
            cm.maxW('7xl'),
            cm.mxAuto,
            cm.flex({ align: 'center', justify: 'between', wrap: 'wrap', gap: 'md' }),
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]">
            {t(
              'landing.footer.copy',
              { year: new Date().getFullYear(), name: APP_NAME },
              { defaultValue: '© {{year}} {{name}}' },
            )}
            {' — Built with '}
            <a
              href="https://molecule.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-medium"
            >
              Molecule.dev
            </a>
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            {/* No opacity-* on these links: axe composites it — on-surface-variant
                #475569 at 80% over #f1f5f9 = #697586 = 4.26:1 (axe fail). Full
                opacity is 6.92:1. */}
            <Link
              to="/login"
              className={
                'text-xs underline underline-offset-4 hover:text-primary transition-colors'
              }
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={
                'text-xs underline underline-offset-4 hover:text-primary transition-colors'
              }
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
            <a
              href="mailto:hello@calcite.dev"
              className={
                'text-xs underline underline-offset-4 hover:text-primary transition-colors'
              }
            >
              {t('nav.contact', {}, { defaultValue: 'Contact' })}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
