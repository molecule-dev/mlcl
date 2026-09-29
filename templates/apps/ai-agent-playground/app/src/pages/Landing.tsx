// Pattern source: bespoke per Neuron DESIGN.md (Stitch design language).
// Public landing — terminal hero, social-proof band, illustrated features,
// live demo split, pricing tiers.
import { Link } from 'react-router'

import { useIsAuthenticated, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, APP_TAGLINE } from '../branding.js'
import { Footer } from '../components/Footer.js'
import { Header } from '../components/Header.js'

type Cm = ReturnType<typeof getClassMap>

type FeatureIll = 'nodes' | 'trace' | 'registry'

interface Feature {
  ill: FeatureIll
  hoverBorder: string
  titleKey: string
  defaultTitle: string
  bodyKey: string
  defaultBody: string
}

interface Segment {
  key: string
  defaultValue: string
  tone?: string
  chip?: boolean
}

interface LogLine {
  time: string
  segments: Segment[]
}

interface CodeLine {
  segments: Segment[]
}

interface Perk {
  key: string
  defaultValue: string
}

interface Tier {
  id: string
  nameKey: string
  defaultName: string
  priceKey: string
  defaultPrice: string
  periodKey: string
  defaultPeriod: string
  popular: boolean
  perkTone: string
  perks: Perk[]
  ctaKey: string
  defaultCta: string
}

const FEATURES: Feature[] = [
  {
    ill: 'nodes',
    hoverBorder: 'hover:border-brand-cyan/30',
    titleKey: 'landing.feature1Title',
    defaultTitle: 'Compose every loop',
    bodyKey: 'landing.feature1Body',
    defaultBody:
      'A visual agent builder for mapping complex logic flows: drag prompts, tools, and providers onto one canvas that compiles to deterministic agent graphs — swap models without touching downstream contracts.',
  },
  {
    ill: 'registry',
    hoverBorder: 'hover:border-brand-purple/30',
    titleKey: 'landing.feature2Title',
    defaultTitle: 'Watch every step',
    bodyKey: 'landing.feature2Body',
    defaultBody:
      'A typed tool registry for custom functions and third-party integrations. Trace tool calls, token spend, and latency live — inspect failures with a full execution log instead of a stack trace.',
  },
  {
    ill: 'trace',
    hoverBorder: 'hover:border-brand-orange/30',
    titleKey: 'landing.feature3Title',
    defaultTitle: 'Ship with evidence',
    bodyKey: 'landing.feature3Body',
    defaultBody:
      'Datasets, regression runs, and deployment gates ride alongside your agents — promote when the trace is green.',
  },
]

const TRUSTED_BY: Perk[] = [
  { key: 'landing.trust.logo1', defaultValue: 'Acme Corp' },
  { key: 'landing.trust.logo2', defaultValue: 'Globex' },
  { key: 'landing.trust.logo3', defaultValue: 'Soylent' },
  { key: 'landing.trust.logo4', defaultValue: 'Initech' },
  { key: 'landing.trust.logo5', defaultValue: 'Umbrella' },
  { key: 'landing.trust.logo6', defaultValue: 'Massive Dynamic' },
]

const TIERS: Tier[] = [
  {
    id: 'hobby',
    nameKey: 'landing.tier.hobby.name',
    defaultName: 'Hobby',
    priceKey: 'landing.tier.hobby.price',
    defaultPrice: 'Free',
    periodKey: 'landing.tier.perthousand',
    defaultPeriod: '/mo',
    popular: false,
    perkTone: 'text-brand-cyan',
    perks: [
      { key: 'landing.tier.hobby.perk1', defaultValue: '1,000 requests / mo' },
      { key: 'landing.tier.hobby.perk2', defaultValue: 'Community support' },
      { key: 'landing.tier.hobby.perk3', defaultValue: '5 active agents' },
    ],
    ctaKey: 'landing.tier.hobby.cta',
    defaultCta: 'Get started',
  },
  {
    id: 'pro',
    nameKey: 'landing.tier.pro.name',
    defaultName: 'Pro',
    priceKey: 'landing.tier.pro.price',
    defaultPrice: '$39',
    periodKey: 'landing.tier.perthousand',
    defaultPeriod: '/mo',
    popular: true,
    perkTone: 'text-brand-orange',
    perks: [
      { key: 'landing.tier.pro.perk1', defaultValue: '100,000 requests / mo' },
      { key: 'landing.tier.pro.perk2', defaultValue: 'Priority support' },
      { key: 'landing.tier.pro.perk3', defaultValue: 'Unlimited agents' },
      { key: 'landing.tier.pro.perk4', defaultValue: 'Advanced execution traces' },
    ],
    ctaKey: 'landing.tier.pro.cta',
    defaultCta: 'Upgrade to Pro',
  },
  {
    id: 'team',
    nameKey: 'landing.tier.team.name',
    defaultName: 'Team',
    priceKey: 'landing.tier.team.price',
    defaultPrice: '$99',
    periodKey: 'landing.tier.perthousand',
    defaultPeriod: '/mo',
    popular: false,
    perkTone: 'text-brand-cyan',
    perks: [
      { key: 'landing.tier.team.perk1', defaultValue: '1M requests / mo' },
      { key: 'landing.tier.team.perk2', defaultValue: 'Shared workspaces' },
      { key: 'landing.tier.team.perk3', defaultValue: 'SSO integration' },
    ],
    ctaKey: 'landing.tier.team.cta',
    defaultCta: 'Contact sales',
  },
]

const LOG_LINES: LogLine[] = [
  {
    time: '[14:02:11]',
    segments: [
      {
        key: 'landing.log.line1',
        defaultValue: 'Initializing agent environment...',
        tone: 'text-brand-cyan',
      },
    ],
  },
  {
    time: '[14:02:12]',
    segments: [
      { key: 'landing.log.line2a', defaultValue: 'Connecting to Anthropic API... ' },
      { key: 'landing.log.line2b', defaultValue: 'SUCCESS', tone: 'text-brand-green' },
    ],
  },
  {
    time: '[14:02:13]',
    segments: [{ key: 'landing.log.line3', defaultValue: 'Evaluating query intentions...' }],
  },
  {
    time: '[14:02:13]',
    segments: [
      { key: 'landing.log.line4a', defaultValue: '→ Tool Call: ', tone: 'text-brand-purple' },
      { key: 'landing.log.line4b', defaultValue: 'web-search', tone: 'text-tertiary', chip: true },
      {
        key: 'landing.log.line4c',
        defaultValue: ' (query: "latest developments in AI alignment")',
        tone: 'text-brand-purple',
      },
    ],
  },
  {
    time: '[14:02:15]',
    segments: [{ key: 'landing.log.line5', defaultValue: 'Parsing 3 search results...' }],
  },
  {
    time: '[14:02:16]',
    segments: [
      { key: 'landing.log.line6a', defaultValue: 'Synthesizing final response... ' },
      { key: 'landing.log.line6b', defaultValue: 'STREAMING', tone: 'text-brand-green' },
    ],
  },
]

const CODE_LINES: CodeLine[] = [
  {
    segments: [
      { key: 'landing.demo.kwImport', defaultValue: 'import', tone: 'text-brand-purple' },
      { key: 'landing.demo.ws', defaultValue: ' { Agent } ' },
      { key: 'landing.demo.kwFrom', defaultValue: 'from', tone: 'text-brand-purple' },
      { key: 'landing.demo.impSource', defaultValue: " '@neuron/core';", tone: 'text-brand-green' },
    ],
  },
  { segments: [{ key: 'landing.demo.blank', defaultValue: ' ' }] },
  {
    segments: [
      { key: 'landing.demo.kwConst', defaultValue: 'const', tone: 'text-brand-purple' },
      { key: 'landing.demo.agentDecl', defaultValue: ' researcher = ' },
      { key: 'landing.demo.kwNew', defaultValue: 'new', tone: 'text-brand-purple' },
      { key: 'landing.demo.agentCtor', defaultValue: ' Agent({', tone: 'text-brand-purple' },
    ],
  },
  {
    segments: [
      { key: 'landing.demo.propName', defaultValue: '  name: ', tone: 'text-brand-cyan' },
      { key: 'landing.demo.valName', defaultValue: "'DeepResearcher',", tone: 'text-brand-green' },
    ],
  },
  {
    segments: [
      { key: 'landing.demo.propModel', defaultValue: '  model: ', tone: 'text-brand-cyan' },
      { key: 'landing.demo.valModel', defaultValue: "'claude-3-opus',", tone: 'text-brand-green' },
    ],
  },
  {
    segments: [
      { key: 'landing.demo.propPrompt', defaultValue: '  systemPrompt: ', tone: 'text-brand-cyan' },
      {
        key: 'landing.demo.valPrompt',
        defaultValue: '`You are a meticulous research assistant.',
        tone: 'text-brand-orange',
      },
    ],
  },
  {
    segments: [
      {
        key: 'landing.demo.valPrompt2',
        defaultValue: 'Always verify facts using the web-search tool before answering.`',
        tone: 'text-brand-orange',
      },
    ],
  },
  {
    segments: [
      { key: 'landing.demo.propTools', defaultValue: '  tools: ', tone: 'text-brand-cyan' },
      {
        key: 'landing.demo.valTools',
        defaultValue: '[webSearch, summarizeDoc],',
        tone: 'text-brand-cyan',
      },
    ],
  },
  {
    segments: [
      { key: 'landing.demo.propSteps', defaultValue: '  maxSteps: ', tone: 'text-brand-cyan' },
      { key: 'landing.demo.valSteps', defaultValue: '10', tone: 'text-brand-purple' },
    ],
  },
  { segments: [{ key: 'landing.demo.close', defaultValue: '});', tone: 'text-brand-purple' }] },
  { segments: [{ key: 'landing.demo.blank2', defaultValue: ' ' }] },
  {
    segments: [
      { key: 'landing.demo.kwAwait', defaultValue: 'await', tone: 'text-brand-purple' },
      { key: 'landing.demo.runCall', defaultValue: ' researcher.run(' },
      {
        key: 'landing.demo.runArg',
        defaultValue: '"Analyze Q3 market trends"',
        tone: 'text-brand-green',
      },
      { key: 'landing.demo.runEnd', defaultValue: ');' },
    ],
  },
]

const TIMELINE: Array<{
  id: string
  icon: string
  ring: string
  iconTone: string
  titleKey: string
  defaultTitle: string
  titleTone?: string
  detailKey: string
  defaultDetail: string
  detailTone?: string
  pulse?: boolean
}> = [
  {
    id: 'input',
    icon: 'check',
    ring: 'border-brand-green',
    iconTone: 'text-brand-green',
    titleKey: 'landing.timeline.inputTitle',
    defaultTitle: 'User input received',
    detailKey: 'landing.timeline.inputDetail',
    defaultDetail: '"Analyze Q3 market trends"',
  },
  {
    id: 'tool',
    icon: 'build',
    ring: 'border-brand-purple',
    iconTone: 'text-brand-purple',
    titleKey: 'landing.timeline.toolTitle',
    defaultTitle: 'Tool executing: webSearch',
    titleTone: 'text-secondary',
    detailKey: 'landing.timeline.toolDetail',
    defaultDetail: 'Querying: "Q3 2026 economic market trends analysis"',
  },
  {
    id: 'inference',
    icon: '',
    ring: 'border-brand-orange',
    iconTone: 'bg-brand-orange',
    titleKey: 'landing.timeline.inferenceTitle',
    defaultTitle: 'Model inference',
    titleTone: 'text-brand-orange',
    detailKey: 'landing.timeline.inferenceDetail',
    defaultDetail: 'Synthesizing 5 document sources...',
    detailTone: 'opacity-70',
    pulse: true,
  },
]

function FeatureIllustration({ ill }: { ill: FeatureIll }) {
  if (ill === 'nodes') {
    return (
      <div className="h-40 bg-surface-container-lowest rounded-lg mb-6 border border-outline-variant/10 p-4 relative flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-surface-container rounded flex items-center justify-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-brand-cyan text-sm">api</span>
          </div>
          <div className="w-8 h-px bg-outline-variant/30" />
          <div className="w-10 h-10 bg-surface-container rounded flex items-center justify-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-brand-purple text-sm">functions</span>
          </div>
          <div className="w-8 h-px bg-outline-variant/30" />
          <div className="w-10 h-10 bg-surface-container rounded flex items-center justify-center border border-outline-variant/20">
            <span className="material-symbols-outlined text-brand-green text-sm">check</span>
          </div>
        </div>
      </div>
    )
  }
  if (ill === 'registry') {
    return (
      <div className="h-40 bg-surface-container-lowest rounded-lg mb-6 border border-outline-variant/10 p-4 relative flex flex-col justify-center">
        <div className="space-y-2 font-mono text-[10px]">
          <div className="bg-surface-container p-2 rounded border border-outline-variant/10 flex justify-between">
            <span className="text-brand-cyan">web_search</span>
            <span className="text-on-surface-variant">v1.2.0</span>
          </div>
          <div className="bg-surface-container p-2 rounded border border-outline-variant/10 flex justify-between">
            <span className="text-on-surface-variant">read_file</span>
            <span className="text-on-surface-variant">v2.0.1</span>
          </div>
          <div className="bg-surface-container p-2 rounded border border-outline-variant/10 flex justify-between">
            <span className="text-tertiary">execute_sql</span>
            <span className="text-tertiary">v0.9.beta</span>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="h-40 bg-surface-container-lowest rounded-lg mb-6 border border-outline-variant/10 p-4 relative flex flex-col justify-center">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-2 h-2 rounded-full bg-brand-green mt-1" />
        <div className="flex-grow bg-surface-container h-8 rounded border border-outline-variant/10" />
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-2 h-2 rounded-full bg-brand-purple mt-1" />
        <div className="flex-grow bg-surface-container h-12 rounded border border-outline-variant/10" />
      </div>
      <div className="flex items-start gap-3">
        <div className="w-2 h-2 rounded-full border border-brand-orange mt-1" />
        <div className="w-2/3 bg-surface-container h-4 rounded border border-outline-variant/10" />
      </div>
    </div>
  )
}

function TerminalLogLines({ cm }: { cm: Cm }) {
  const { t } = useTranslation()
  return (
    <>
      {LOG_LINES.map((line) => (
        <div
          key={line.time + line.segments[0].key}
          className={cm.cn(cm.flex({ gap: 4 }), 'mb-1 text-on-surface-variant')}
        >
          <span className="w-20 shrink-0">{line.time}</span>
          <span>
            {line.segments.map((segment) => (
              <span
                key={segment.key}
                className={
                  segment.chip
                    ? cm.cn('bg-surface-container px-1.5 rounded', segment.tone)
                    : segment.tone
                }
              >
                {t(segment.key, {}, { defaultValue: segment.defaultValue })}
              </span>
            ))}
          </span>
        </div>
      ))}
    </>
  )
}

export function Landing() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const isAuthenticated = useIsAuthenticated()

  return (
    <div
      className={cm.cn(
        cm.flex({ direction: 'col' }),
        cm.minH('screen'),
        'bg-surface-container-lowest text-on-surface font-body',
      )}
    >
      <Header />
      <main className={cm.flex1}>
        {/* Hero — headline, subtext, CTAs, terminal preview card */}
        <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mb', 4),
              'font-mono uppercase tracking-widest text-brand-orange',
            )}
          >
            {t('landing.eyebrow', {}, { defaultValue: '// agent development workbench' })}
          </p>
          <h1 className="font-headline text-5xl md:text-[56px] font-bold text-on-surface tracking-tight leading-tight mb-6">
            {t(
              'landing.headline',
              { brand: APP_NAME },
              { defaultValue: '{{brand}} — wire intelligence, watch it run' },
            )}
          </h1>
          <p className="text-xl text-on-surface-variant font-body max-w-2xl mx-auto mb-8">
            {t(
              'landing.subhead',
              {},
              {
                defaultValue:
                  'Build, test, and observe AI agents in one workbench. Compose tool graphs, swap providers, and ship traceable production agents.',
              },
            )}
          </p>
          <div
            className={cm.cn(
              cm.flex({ justify: 'center', gap: 4, align: 'center' }),
              cm.sp('mb', 8),
            )}
          >
            {isAuthenticated ? (
              <Link
                className={cm.cn(
                  cm.fontWeight('semibold'),
                  cm.sp('px', 6),
                  cm.sp('py', 3),
                  cm.flex({ align: 'center', gap: 2 }),
                  'btn-brand text-white rounded-lg transition-all active:scale-95',
                )}
                data-mol-id="landing-go-to-dashboard"
                to="/dashboard"
              >
                <span>{t('common.goToDashboard', {}, { defaultValue: 'Go to Dashboard' })}</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            ) : (
              <>
                <Link
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    cm.flex({ align: 'center', gap: 2 }),
                    'btn-brand text-white rounded-lg transition-all active:scale-95',
                  )}
                  data-mol-id="landing-cta-signup"
                  to="/signup"
                >
                  <span>{t('landing.ctaPrimary', {}, { defaultValue: 'Start building' })}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
                <Link
                  className={cm.cn(
                    cm.fontWeight('medium'),
                    cm.sp('px', 6),
                    cm.sp('py', 3),
                    'text-on-surface font-body rounded-lg border border-outline-variant/30 hover:border-outline-variant transition-colors',
                  )}
                  data-mol-id="landing-cta-login"
                  to="/login"
                >
                  {t('auth.login.signInButton', {}, { defaultValue: 'Sign in' })}
                </Link>
              </>
            )}
          </div>
          {/* Terminal preview — command bar + live run log */}
          <div className="max-w-3xl mx-auto text-left relative">
            <div className="absolute -inset-4 hero-glow rounded-[2rem] opacity-50 z-0 pointer-events-none" />
            <div className="relative z-10 bg-surface-container-low rounded-xl border border-outline-variant/15 shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center bg-surface-container px-4 py-3 border-b border-outline-variant/15 relative">
                <span className="text-brand-orange font-mono mr-3">$</span>
                <div className="flex-grow flex items-center font-mono text-on-surface text-sm overflow-hidden">
                  <span>neuron run my-agent --tool web-search --provider anthropic</span>
                  <span className="inline-block w-2 h-4 bg-on-surface ml-1 cursor-blink" />
                </div>
                <button
                  className="ml-4 btn-brand glow-brand text-white px-4 py-1 rounded text-xs font-mono font-bold transition-colors"
                  data-mol-id="landing-terminal-run"
                  type="button"
                >
                  {t('landing.terminal.run', {}, { defaultValue: 'RUN' })}
                </button>
              </div>
              <div className="bg-surface-container-lowest p-5 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto min-h-[200px]">
                <TerminalLogLines cm={cm} />
              </div>
            </div>
          </div>
          <p
            className={cm.cn(
              cm.textSize('xs'),
              cm.sp('mt', 6),
              'font-mono text-tertiary uppercase tracking-widest',
            )}
          >
            {t('landing.tagline', {}, { defaultValue: APP_TAGLINE })}
          </p>
        </section>

        {/* Social-proof band */}
        <section className="max-w-7xl mx-auto px-6 py-12 border-t border-outline-variant/10">
          <p className="text-center text-sm font-mono text-on-surface-variant mb-8 uppercase tracking-widest">
            {t('landing.trust.heading', {}, { defaultValue: 'Powering next-gen workflows' })}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-40 grayscale">
            {TRUSTED_BY.map((logo) => (
              <div key={logo.key} className="text-xl font-headline font-bold text-on-surface">
                {t(logo.key, {}, { defaultValue: logo.defaultValue })}
              </div>
            ))}
          </div>
        </section>

        {/* Features grid — illustrated cards */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <h2 className="font-headline text-3xl font-bold text-on-surface mb-12 text-center">
            {t('landing.featuresHeading', {}, { defaultValue: 'Engineered for precision' })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.titleKey}
                className={cm.cn(
                  cm.sp('p', 6),
                  'bg-surface-container-low rounded-xl border border-outline-variant/10 relative overflow-hidden group transition-colors',
                  feature.hoverBorder,
                )}
              >
                <FeatureIllustration ill={feature.ill} />
                <h3
                  className={cm.cn(
                    cm.fontWeight('semibold'),
                    cm.textSize('lg'),
                    cm.sp('mb', 2),
                    'font-headline text-on-surface',
                  )}
                >
                  {t(feature.titleKey, {}, { defaultValue: feature.defaultTitle })}
                </h3>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant leading-relaxed')}>
                  {t(feature.bodyKey, {}, { defaultValue: feature.defaultBody })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Live demo split — config editor + execution timeline */}
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <div className="bg-surface-container-low rounded-xl border border-outline-variant/15 overflow-hidden flex flex-col">
              <div className="bg-surface-container px-4 py-2 border-b border-outline-variant/15 flex items-center justify-between">
                <span className="font-mono text-xs text-on-surface-variant">
                  {t('landing.demo.fileName', {}, { defaultValue: 'agent_config.ts' })}
                </span>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-outline-variant/30" />
                  <div className="w-3 h-3 rounded-full bg-outline-variant/30" />
                  <div className="w-3 h-3 rounded-full bg-outline-variant/30" />
                </div>
              </div>
              <div className="p-6 font-mono text-sm leading-loose overflow-x-auto bg-surface-container-lowest flex-grow">
                <pre>
                  <code>
                    {CODE_LINES.map((line) => (
                      <span key={line.segments[0].key} className="block whitespace-pre">
                        {line.segments.map((segment) => (
                          <span key={segment.key} className={segment.tone}>
                            {t(segment.key, {}, { defaultValue: segment.defaultValue })}
                          </span>
                        ))}
                      </span>
                    ))}
                  </code>
                </pre>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-xl border border-outline-variant/15 p-6 flex flex-col">
              <h3 className="font-headline font-semibold text-lg mb-6 text-on-surface">
                {t('landing.timeline.heading', {}, { defaultValue: 'Live execution' })}
              </h3>
              <div className="flex-grow space-y-6 relative">
                <div className="absolute inset-y-0 left-[11px] w-[2px] bg-outline-variant/10" />
                {TIMELINE.map((step) => (
                  <div key={step.id} className="relative flex items-start gap-4">
                    <div
                      className={cm.cn(
                        cm.w(6),
                        cm.h(6),
                        'rounded-full bg-surface-container border-2 z-10 flex items-center justify-center mt-1 shrink-0',
                        step.ring,
                      )}
                    >
                      {step.pulse ? (
                        <span
                          className={cm.cn('w-2 h-2 rounded-full animate-pulse', step.iconTone)}
                        />
                      ) : (
                        <span
                          className={cm.cn('material-symbols-outlined text-[12px]', step.iconTone)}
                        >
                          {step.icon}
                        </span>
                      )}
                    </div>
                    <div>
                      <div
                        className={cm.cn('font-mono text-sm text-on-surface mb-1', step.titleTone)}
                      >
                        {t(step.titleKey, {}, { defaultValue: step.defaultTitle })}
                      </div>
                      <div
                        className={cm.cn(
                          cm.textSize('xs'),
                          'text-on-surface-variant bg-surface-container-lowest p-2 rounded border border-outline-variant/10',
                          step.detailTone,
                        )}
                      >
                        {t(step.detailKey, {}, { defaultValue: step.defaultDetail })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing tiers */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="font-headline text-3xl font-bold text-on-surface mb-4">
              {t('landing.pricingHeading', {}, { defaultValue: 'Pricing for builders' })}
            </h2>
            <p className="text-on-surface-variant">
              {t(
                'landing.pricingSubhead',
                {},
                { defaultValue: 'Start free, scale when you need to.' },
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={
                  tier.popular
                    ? 'bg-surface-container rounded-xl p-8 border border-brand-orange/50 glow-brand-soft flex flex-col relative md:-translate-y-4'
                    : 'bg-surface-container-low rounded-xl p-8 border border-outline-variant/15 flex flex-col'
                }
              >
                {tier.popular ? (
                  <div className="badge-brand absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {t('landing.tier.popularBadge', {}, { defaultValue: 'Most popular' })}
                  </div>
                ) : null}
                <h3 className="font-headline text-xl mb-2 text-on-surface">
                  {t(tier.nameKey, {}, { defaultValue: tier.defaultName })}
                </h3>
                <div className="text-3xl font-bold font-headline text-on-surface">
                  {t(tier.priceKey, {}, { defaultValue: tier.defaultPrice })}
                  {tier.id === 'hobby' ? null : (
                    <span className="text-lg text-on-surface-variant font-normal">
                      {t(tier.periodKey, {}, { defaultValue: tier.defaultPeriod })}
                    </span>
                  )}
                </div>
                <ul
                  className={cm.cn(
                    cm.textSize('sm'),
                    'text-on-surface-variant font-body flex-grow',
                    tier.popular ? 'space-y-4 mb-8 mt-5 text-on-surface' : 'space-y-4 mb-8',
                  )}
                >
                  {tier.perks.map((perk) => (
                    <li key={perk.key} className={cm.cn(cm.flex({ align: 'center', gap: 3 }))}>
                      <span
                        className={cm.cn(
                          'material-symbols-outlined text-sm shrink-0',
                          tier.perkTone,
                        )}
                      >
                        check_circle
                      </span>
                      {t(perk.key, {}, { defaultValue: perk.defaultValue })}
                    </li>
                  ))}
                </ul>
                <Link
                  className={
                    tier.popular
                      ? 'btn-brand glow-brand text-white w-full py-2 rounded-lg text-sm font-medium transition-colors text-center'
                      : 'w-full py-2 rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors text-sm font-medium text-center block'
                  }
                  data-mol-id={`landing-tier-${tier.id}-cta`}
                  to={tier.popular ? '/signup' : '/pricing'}
                >
                  {t(tier.ctaKey, {}, { defaultValue: tier.defaultCta })}
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

export default Landing
