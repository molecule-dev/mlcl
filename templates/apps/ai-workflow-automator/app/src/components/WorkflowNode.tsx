/**
 * Workflow canvas node — three semantic variants per DESIGN.md:
 * trigger (violet), condition (cyan), action (green). Left accent stripe,
 * 36px icon disc, header + subtitle, optional output ports for conditions.
 *
 * Translated from ai-chatbot-builder's StartFlowNode/ActionFlowNode pair,
 * retuned to Dendrite's three-color trigger/condition/action triad.
 */
import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

export type NodeKind = 'trigger' | 'condition' | 'action'

interface WorkflowNodeProps {
  kind: NodeKind
  icon: string
  title: string
  subtitle?: string
  /** Visual selection ring (canvas inspector). */
  selected?: boolean
  /** Optional inline footer (e.g. condition expression / action multi-step badge). */
  footer?: ReactNode
}

interface KindVisuals {
  border: string
  bg: string
  iconBg: string
  iconColor: string
  ring: string
}

const VISUALS: Record<NodeKind, KindVisuals> = {
  trigger: {
    border: 'var(--color-node-trigger)',
    bg: 'var(--color-node-trigger-bg)',
    iconBg: 'var(--color-node-trigger)',
    iconColor: 'var(--color-on-primary)',
    ring: 'color-mix(in srgb, var(--color-node-trigger) 25%, transparent)',
  },
  condition: {
    border: 'var(--color-node-condition)',
    bg: 'var(--color-node-condition-bg)',
    iconBg: 'var(--color-node-condition)',
    iconColor: 'var(--color-on-primary)',
    ring: 'color-mix(in srgb, var(--color-node-condition) 25%, transparent)',
  },
  action: {
    border: 'var(--color-node-action)',
    bg: 'var(--color-node-action-bg)',
    iconBg: 'var(--color-node-action)',
    iconColor: 'var(--color-on-primary)',
    ring: 'color-mix(in srgb, var(--color-node-action) 25%, transparent)',
  },
}

export function WorkflowNode({
  kind,
  icon,
  title,
  subtitle,
  selected = false,
  footer,
}: WorkflowNodeProps) {
  const cm = getClassMap()
  const v = VISUALS[kind]

  return (
    <div
      className={cm.cn(cm.sp('p', 4), 'rounded-xl shadow-sm relative')}
      style={{
        width: 280,
        minHeight: 80,
        background: v.bg,
        border: `2px solid ${v.border}`,
        boxShadow: selected
          ? `0 0 0 3px ${v.ring}, 0 4px 12px color-mix(in srgb, black 6%, transparent)`
          : 'var(--shadow-sm)',
      }}
    >
      {/* Left accent stripe */}
      <span
        className={'absolute top-0 left-0 bottom-0 rounded-l-xl'}
        style={{ width: 4, background: v.border }}
        aria-hidden
      />

      <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('pl', 1))}>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            'rounded-full shrink-0',
          )}
          style={{ width: 36, height: 36, background: v.iconBg }}
        >
          <span
            className={cm.cn('material-symbols-outlined', cm.textSize('xl'))}
            style={{ color: v.iconColor, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        <div className={'min-w-0 flex-1'}>
          <div
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), 'uppercase tracking-widest')}
            style={{ color: v.border }}
          >
            {kind}
          </div>
          <div
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), 'truncate')}
            style={{ color: 'var(--color-foreground)' }}
          >
            {title}
          </div>
          {subtitle && (
            <div className={cm.cn(cm.textSize('xs'), cm.textMuted, 'truncate')}>{subtitle}</div>
          )}
        </div>
      </div>

      {footer && <div className={cm.cn(cm.sp('mt', 3), cm.sp('pl', 1))}>{footer}</div>}

      {/* Condition output ports (true / false) */}
      {kind === 'condition' && (
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('mt', 3), cm.sp('pl', 1))}
        >
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest',
            )}
            style={{ color: 'var(--color-node-action)' }}
          >
            <span
              className={'rounded-full'}
              style={{
                width: 10,
                height: 10,
                background: 'var(--color-node-action)',
                display: 'inline-block',
              }}
            />
            true
          </span>
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.textSize('xs'),
              cm.fontWeight('bold'),
              'uppercase tracking-widest',
            )}
            style={{ color: 'var(--color-run-failed-dot)' }}
          >
            <span
              className={'rounded-full'}
              style={{
                width: 10,
                height: 10,
                background: 'var(--color-run-failed-dot)',
                display: 'inline-block',
              }}
            />
            false
          </span>
        </div>
      )}
    </div>
  )
}
