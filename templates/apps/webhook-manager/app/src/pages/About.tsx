import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { APP_NAME, BRAND_COLOR } from '../branding.js'
import { LandingFooter } from '../components/LandingFooter.js'
import { LandingTopNavBar } from '../components/LandingTopNavBar.js'

const FEATURES = [
  {
    key: 'observability',
    icon: 'monitoring',
    defaultTitle: 'Live delivery observability',
    defaultBody:
      'Watch every payload land in real time. Filter by endpoint, event, status, or latency, then drill into headers, body, and response in two clicks.',
  },
  {
    key: 'retries',
    icon: 'autorenew',
    defaultTitle: 'Smart retries with backoff',
    defaultBody:
      'Configurable exponential backoff per endpoint. Replay any failed delivery with one click, or pause a flapping endpoint without losing the queue.',
  },
  {
    key: 'inspector',
    icon: 'data_object',
    defaultTitle: 'Pretty payload inspector',
    defaultBody:
      'Syntax-highlighted JSON, collapsible nesting, copy-as-curl, and signature checks. Diff payloads across retries to debug faster.',
  },
  {
    key: 'security',
    icon: 'verified_user',
    defaultTitle: 'Signed, rotated, audited',
    defaultBody:
      'HMAC signing on every outbound payload, zero-downtime secret rotation, and an immutable, signed audit log of every config change.',
  },
  {
    key: 'events',
    icon: 'menu_book',
    defaultTitle: 'First-class event catalog',
    defaultBody:
      'Document every event your platform emits — JSON schemas, sample payloads, and the endpoints subscribed — from one console.',
  },
  {
    key: 'team',
    icon: 'group',
    defaultTitle: 'API keys and team roles',
    defaultBody:
      'Scoped API keys, masked secrets, and per-member roles so the whole team can ship without sharing credentials.',
  },
] as const

export function About() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div
      className={cm.cn(cm.minH('screen'), 'antialiased font-body')}
      style={{ backgroundColor: 'var(--mol-color-background)', color: 'var(--mol-color-text)' }}
    >
      <LandingTopNavBar />
      <main
        data-mol-id="page-about"
        className={cm.cn(cm.maxW('3xl'), cm.mxAuto, cm.sp('px', 6), 'py-16 md:py-20')}
      >
        <p
          data-mol-id="about-eyebrow"
          className={cm.cn('font-mono text-sm font-bold uppercase tracking-widest mb-4')}
          style={{ color: BRAND_COLOR }}
        >
          {t('about.eyebrow', { app: APP_NAME }, { defaultValue: '// about {{app}}' })}
        </p>
        <h1
          className={cm.cn('text-4xl md:text-5xl font-extrabold tracking-tight mb-6')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('about.pageTitle', { app: APP_NAME }, { defaultValue: 'The webhook control plane' })}
        </h1>

        <p
          data-mol-id="about-intro"
          className={cm.cn('text-lg leading-relaxed mb-10')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'about.intro',
            { app: APP_NAME },
            {
              defaultValue:
                '{{app}} is the webhook control plane for backend teams who live and die by delivery. Register endpoints, inspect every payload, replay failures, and prove exactly what was sent — all from one console.',
            },
          )}
        </p>

        <h2
          className={cm.cn('text-2xl font-extrabold tracking-tight mb-3')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('about.missionTitle', {}, { defaultValue: 'Our mission' })}
        </h2>
        <p
          data-mol-id="about-mission"
          className={cm.cn('text-base leading-relaxed mb-12')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'about.missionBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Webhooks are the connective tissue of modern platforms, yet most teams debug them blind. {{app}}’s mission is to make every delivery observable, every failure recoverable, and every change auditable — so you stop guessing and start shipping.',
            },
          )}
        </p>

        <h2
          className={cm.cn('text-2xl font-extrabold tracking-tight mb-6')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('common.whatYouGet', {}, { defaultValue: 'What you get' })}
        </h2>
        <div
          data-mol-id="about-features"
          className={cm.cn('grid gap-5 grid-cols-1 sm:grid-cols-2 mb-12')}
        >
          {FEATURES.map((f) => (
            <div
              key={f.key}
              data-mol-id={`about-feature-${f.key}`}
              className={cm.cn('rounded-2xl p-5')}
              style={{
                backgroundColor: 'var(--mol-color-surface)',
                border: '1px solid var(--mol-color-border)',
              }}
            >
              <div
                className={cm.cn('inline-flex p-2.5 rounded-xl mb-3')}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--mol-color-primary) 14%, transparent)',
                  color: BRAND_COLOR,
                }}
              >
                <span className={cm.cn('material-symbols-outlined text-2xl')} aria-hidden="true">
                  {f.icon}
                </span>
              </div>
              <h3
                className={cm.cn('text-base font-extrabold mb-1.5')}
                style={{ color: 'var(--mol-color-text)' }}
              >
                {t(`about.feature.${f.key}.title`, {}, { defaultValue: f.defaultTitle })}
              </h3>
              <p
                className={cm.cn('text-sm leading-relaxed')}
                style={{ color: 'var(--mol-color-text-secondary)' }}
              >
                {t(`about.feature.${f.key}.body`, {}, { defaultValue: f.defaultBody })}
              </p>
            </div>
          ))}
        </div>

        <h2
          className={cm.cn('text-2xl font-extrabold tracking-tight mb-3')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('about.plansTitle', {}, { defaultValue: 'Plans for every stage' })}
        </h2>
        <p
          data-mol-id="about-plans"
          className={cm.cn('text-base leading-relaxed mb-12')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'about.plansBody',
            {},
            {
              defaultValue:
                'Start free, upgrade to Pro for higher delivery volume and longer retention, or move to Team for shared endpoints, roles, and audit-log export — your data and endpoints come with you at every step.',
            },
          )}
        </p>

        <h2
          className={cm.cn('text-2xl font-extrabold tracking-tight mb-3')}
          style={{ color: 'var(--mol-color-text)' }}
        >
          {t('about.contactTitle', {}, { defaultValue: 'Talk to us' })}
        </h2>
        <p
          data-mol-id="about-contact"
          className={cm.cn('text-base leading-relaxed mb-10')}
          style={{ color: 'var(--mol-color-text-secondary)' }}
        >
          {t(
            'about.contactBody',
            { app: APP_NAME },
            {
              defaultValue:
                'Questions, feedback, or a delivery mystery you can’t crack? Reach the {{app}} team right from your dashboard — every message reaches a real engineer.',
            },
          )}
        </p>

        <Link
          to="/signup"
          data-mol-id="about-cta"
          className={cm.cn(
            'inline-flex items-center gap-2 px-8 py-4 font-mono font-semibold rounded-md transition-all hover:opacity-90 shadow-xl',
          )}
          style={{
            backgroundColor: BRAND_COLOR,
            color: 'var(--color-on-primary)',
            boxShadow:
              '0 12px 32px -10px color-mix(in srgb, var(--mol-color-primary) 45%, transparent)',
          }}
        >
          {t('landing.heroCta', {}, { defaultValue: 'Start free — no card' })}
          <span className={cm.cn('material-symbols-outlined text-base')} aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </main>
      <LandingFooter />
    </div>
  )
}

export default About
export { About as AboutPage }
