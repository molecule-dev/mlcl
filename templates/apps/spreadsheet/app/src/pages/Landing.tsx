import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
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
        <Link to="/" className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.w(9),
              cm.h(9),
              'rounded-xl bg-gradient-to-br from-primary to-primary-dark text-on-primary shadow-lg shadow-primary/30',
            )}
            aria-hidden="true"
          >
            <span
              className={'material-symbols-outlined text-xl'}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              grid_on
            </span>
          </span>
          <span className={cm.cn('text-xl font-extrabold tracking-tight text-on-surface')}>
            {APP_NAME}
          </span>
        </Link>
        <nav className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }), 'hidden md:flex')}>
          <a
            href="#features"
            className={
              'text-sm font-bold text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {t('nav.features', {}, { defaultValue: 'Features' })}
          </a>
          <a
            href="#formulas"
            className={
              'text-sm font-bold text-on-surface-variant hover:text-primary transition-colors'
            }
          >
            {t('landing.nav.formulas', {}, { defaultValue: 'Formulas' })}
          </a>
          <Link
            to="/templates"
            className={
              'text-sm font-bold text-on-surface-variant hover:text-primary transition-colors'
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
                'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform'
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
                className={
                  'hidden sm:inline-flex px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors'
                }
              >
                {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
              </Link>
              <Link
                to="/signup"
                className={
                  'inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform'
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

      <section
        className={cm.cn(cm.sp('px', 6), cm.sp('py', 24), 'border-b border-outline-variant/40')}
      >
        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.textCenter)}>
          <p
            className={cm.cn(
              cm.sp('mb', 4),
              'text-[11px] font-bold uppercase tracking-[0.3em] text-primary',
            )}
          >
            {t(
              'landing.hero.eyebrow',
              {},
              { defaultValue: 'Spreadsheet · v1.0 · Forever free for individuals' },
            )}
          </p>
          <h1
            className={cm.cn(
              cm.sp('mb', 6),
              'text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-extrabold text-on-surface',
            )}
          >
            {t('landing.hero.headline', {}, { defaultValue: 'Spreadsheets that think with you.' })}
          </h1>
          <p
            className={cm.cn(
              cm.textSize('xl'),
              cm.maxW('2xl'),
              cm.mxAuto,
              cm.sp('mb', 10),
              'text-on-surface-variant',
            )}
          >
            {t(
              'landing.hero.subhead',
              { tagline: APP_TAGLINE, name: APP_NAME },
              {
                defaultValue:
                  '{{tagline}}. {{name}} is the formula-first, multi-view, real-time grid analysts and finance teams reach for first.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md', wrap: 'wrap' }),
            )}
          >
            <Link
              to="/signup"
              className={
                'inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform'
              }
            >
              {t('landing.hero.startCta', {}, { defaultValue: 'Open a workbook' })}
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                arrow_forward
              </span>
            </Link>
            <Link
              to="/templates"
              className={
                'inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold text-on-surface rounded-full border border-outline-variant hover:border-primary hover:text-primary transition-colors'
              }
            >
              <span className={'material-symbols-outlined text-base'} aria-hidden="true">
                play_arrow
              </span>
              {t('common.browseTemplates', {}, { defaultValue: 'Browse templates' })}
            </Link>
          </div>
          <div
            className={cm.cn(
              cm.flex({ align: 'center', justify: 'center', gap: 'md' }),
              cm.sp('mt', 8),
            )}
          >
            <div className={'flex -space-x-2'} aria-hidden="true">
              {['#2563eb', '#10b981', '#f59e0b', '#ec4899', '#7c3aed'].map((c) => (
                <span
                  key={c}
                  className={'w-7 h-7 rounded-full border-2 border-surface-container-lowest'}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className={'text-xs font-medium text-on-surface-variant'}>
              {t(
                'landing.hero.socialProof',
                {},
                { defaultValue: 'Trusted by 14,000+ analysts · CFO-approved · SOC 2 Type II' },
              )}
            </p>
          </div>
        </div>

        <div className={cm.cn(cm.maxW('7xl'), cm.mxAuto, cm.sp('mt', 16))}>
          <GridPreview {...SAMPLE_GRID} formula='=SUMIF(Team,"Finance",MRR)' selectedCellRef="C3" />
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
                  'bg-surface-container-lowest rounded-2xl border-t-4 border-primary shadow-sm hover:-translate-y-1 transition-transform duration-300',
                )}
              >
                <span
                  className={cm.cn(
                    cm.flex({ align: 'center', justify: 'center' }),
                    cm.w(11),
                    cm.h(11),
                    cm.sp('mb', 4),
                    'rounded-lg bg-primary-fixed text-primary',
                  )}
                  style={{ fontVariationSettings: "'FILL' 1" }}
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
          className={
            'inline-flex items-center gap-2 px-7 py-3.5 text-base font-bold text-on-primary rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform'
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
              { defaultValue: '© {{year}} {{name}} · Built with Molecule' },
            )}
          </p>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'lg' }))}>
            <Link
              to="/login"
              className={
                'text-[10px] font-bold uppercase tracking-[0.25em] hover:text-primary transition-colors'
              }
            >
              {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
            </Link>
            <Link
              to="/signup"
              className={
                'text-[10px] font-bold uppercase tracking-[0.25em] hover:text-primary transition-colors'
              }
            >
              {t('auth.login.signUp', {}, { defaultValue: 'Sign up' })}
            </Link>
            <a
              href="mailto:hello@calcite.dev"
              className={
                'text-[10px] font-bold uppercase tracking-[0.25em] hover:text-primary transition-colors'
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
