// Pattern source: bespoke — Neuron model registry / leaderboard.
// Authed model index — provider grouped table with cost, context window, latency.
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { PageHeader } from '../components/PageHeader.js'

interface Model {
  id: string
  provider: 'Anthropic' | 'OpenAI' | 'Google'
  context: string
  inputCost: string
  outputCost: string
  avgLatency: string
  status: 'production' | 'preview' | 'deprecated'
}

const MODELS: Model[] = [
  {
    id: 'claude-opus-4-7',
    provider: 'Anthropic',
    context: '1M',
    inputCost: '$15 / M',
    outputCost: '$75 / M',
    avgLatency: '4.2s',
    status: 'production',
  },
  {
    id: 'claude-sonnet-4-7',
    provider: 'Anthropic',
    context: '500K',
    inputCost: '$3 / M',
    outputCost: '$15 / M',
    avgLatency: '1.6s',
    status: 'production',
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'Anthropic',
    context: '250K',
    inputCost: '$0.80 / M',
    outputCost: '$4 / M',
    avgLatency: '0.6s',
    status: 'production',
  },
  {
    id: 'gpt-5.5',
    provider: 'OpenAI',
    context: '500K',
    inputCost: '$5 / M',
    outputCost: '$20 / M',
    avgLatency: '2.1s',
    status: 'production',
  },
  {
    id: 'gpt-5.3-codex',
    provider: 'OpenAI',
    context: '250K',
    inputCost: '$2 / M',
    outputCost: '$8 / M',
    avgLatency: '1.4s',
    status: 'preview',
  },
  {
    id: 'gpt-4o',
    provider: 'OpenAI',
    context: '128K',
    inputCost: '$2.50 / M',
    outputCost: '$10 / M',
    avgLatency: '1.2s',
    status: 'deprecated',
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'Google',
    context: '2M',
    inputCost: '$1.25 / M',
    outputCost: '$5 / M',
    avgLatency: '2.8s',
    status: 'production',
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'Google',
    context: '1M',
    inputCost: '$0.30 / M',
    outputCost: '$1.20 / M',
    avgLatency: '0.5s',
    status: 'production',
  },
]

const STATUS_TONE: Record<Model['status'], string> = {
  production: 'text-success border-emerald-500/40',
  preview: 'text-secondary border-secondary/40',
  deprecated: 'text-error border-error/40',
}

const PROVIDER_GLYPH: Record<Model['provider'], string> = {
  Anthropic: 'auto_awesome',
  OpenAI: 'memory',
  Google: 'hub',
}

export function Models() {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <div data-mol-id="page-models">
      <PageHeader
        subtitle={t(
          'models.subtitle',
          {},
          {
            defaultValue:
              'Every model registered in this workspace, with live pricing and latency.',
          },
        )}
        title={t('nav.models', {}, { defaultValue: 'Models' })}
      />

      <div
        className={cm.cn(
          'bg-surface-container-low rounded border border-outline-variant/15 overflow-hidden',
        )}
      >
        <table className={cm.cn(cm.w('full'), cm.textSize('sm'))}>
          <thead>
            <tr
              className={
                'bg-surface-container-highest border-b border-outline-variant/15 text-left'
              }
            >
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'font-mono text-[10px] text-tertiary uppercase tracking-widest',
                )}
              >
                {t('form.model', {}, { defaultValue: 'Model' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'font-mono text-[10px] text-tertiary uppercase tracking-widest',
                )}
              >
                {t('models.col.provider', {}, { defaultValue: 'Provider' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                )}
              >
                {t('models.col.context', {}, { defaultValue: 'Context' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                )}
              >
                {t('models.col.input', {}, { defaultValue: 'Input' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                )}
              >
                {t('models.col.output', {}, { defaultValue: 'Output' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                )}
              >
                {t('models.col.latency', {}, { defaultValue: 'Avg Latency' })}
              </th>
              <th
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 3),
                  'font-mono text-[10px] text-tertiary uppercase tracking-widest text-right',
                )}
              >
                {t('nav.status', {}, { defaultValue: 'Status' })}
              </th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((model) => (
              <tr
                key={model.id}
                className={
                  'border-b border-outline-variant/10 hover:bg-surface-container transition-colors'
                }
              >
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'font-mono text-on-surface')}>
                  {model.id}
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3))}>
                  <div className={cm.cn(cm.flex({ align: 'center', gap: 2 }))}>
                    <span className="material-symbols-outlined text-[16px] text-tertiary">
                      {PROVIDER_GLYPH[model.provider]}
                    </span>
                    <span className="font-headline text-on-surface">{model.provider}</span>
                  </div>
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono tabular-nums text-right text-tertiary',
                  )}
                >
                  {model.context}
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono tabular-nums text-right text-tertiary',
                  )}
                >
                  {model.inputCost}
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono tabular-nums text-right text-tertiary',
                  )}
                >
                  {model.outputCost}
                </td>
                <td
                  className={cm.cn(
                    cm.sp('px', 4),
                    cm.sp('py', 3),
                    'font-mono tabular-nums text-right text-on-surface',
                  )}
                >
                  {model.avgLatency}
                </td>
                <td className={cm.cn(cm.sp('px', 4), cm.sp('py', 3), 'text-right')}>
                  <span
                    className={cm.cn(
                      cm.sp('px', 2),
                      cm.sp('py', 1),
                      cm.textSize('xs'),
                      'font-mono uppercase tracking-wider rounded border bg-surface-container',
                      STATUS_TONE[model.status],
                    )}
                  >
                    {t(`models.status.${model.status}`, {}, { defaultValue: model.status })}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Models
