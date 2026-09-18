import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface FlowNodeData {
  id: string
  type: string
  label: string
  x: number
  y: number
  model?: string
  prompt?: string
  temperature?: number
  max_tokens?: number
  knowledge_base_id?: string
  response_format?: string
}

interface Props {
  node: FlowNodeData
  isSelected: boolean
  onSelect: () => void
}

export default function FlowNode({ node, isSelected, onSelect }: Props) {
  const cm = getClassMap()
  const { t } = useTranslation()

  if (node.type === 'start') {
    return (
      <button
        type="button"
        aria-pressed={isSelected}
        className={cm.cn(cm.cursorPointer, 'text-left')}
        style={{ position: 'absolute', zIndex: '10', left: node.x, top: node.y }}
        onClick={onSelect}
        data-mol-id={`flow-node-${node.id}`}
      >
        <div
          className={cm.flex({ direction: 'col', align: 'center' })}
          style={{ gap: 'calc(2 * 0.25rem)' }}
        >
          <div
            className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
            style={{
              width: '12rem-scaled',
              height: 'calc(12 * 0.25rem)',
              backgroundColor: 'rgba(${tailwindScaleToRgb($1,$2)}, ${3/100})',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: 'rgba(${tailwindScaleToRgb($1,$2)}, ${3/100})',
              color: '${tailwindScaleToHex($1,$2)}',
            }}
          >
            <span style={{ fontFamily: 'Material Symbols outlined' }}>inbox</span>
          </div>
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '10px',
              color: 'var(--md-sys-color-on-surface-variant)',
              textTransform: 'uppercase',
            }}
          >
            {t('flow-node.user-message', {}, { defaultValue: 'User Message' })}
          </span>
        </div>
      </button>
    )
  }

  const isAiAgent = node.type === 'ai-agent'
  const isClassify = node.type === 'classify'
  const isAiSelected = isAiAgent && isSelected

  const typeLabel = (() => {
    switch (node.type) {
      case 'classify':
        return t('flow-node.type-logic-node', {}, { defaultValue: 'Logic Node' })
      case 'action':
        return t('flow-node.type-action', {}, { defaultValue: 'Action' })
      case 'form':
        return t('flow-node.type-form', {}, { defaultValue: 'Form' })
      case 'ai-agent':
        return t('flow-node.type-ai-agent', {}, { defaultValue: 'AI Agent' })
      case 'output':
        return t('flow-node.type-output', {}, { defaultValue: 'Output' })
      default:
        return t('flow-node.type-node', {}, { defaultValue: 'Node' })
    }
  })()

  const borderColor = (() => {
    switch (node.type) {
      case 'classify':
        return 'border-indigo-500'
      case 'action':
        return 'border-outline'
      case 'form':
        return 'border-outline'
      case 'ai-agent':
        return 'border-primary'
      case 'output':
        return 'border-green-500/50'
      default:
        return 'border-outline'
    }
  })()

  const widthClass = isAiSelected ? 'w-52' : isClassify ? 'w-48' : 'w-44'
  const bgClass = isAiSelected ? 'bg-surface-container-high' : 'bg-surface-container'

  const opacityClass = (() => {
    if (isSelected) return ''
    if (node.type === 'action' || node.type === 'form') return 'opacity-60'
    if (node.type === 'output') return 'opacity-40'
    return ''
  })()

  const gapClass =
    node.type === 'action' || node.type === 'form' || node.type === 'output' ? 'gap-2' : 'gap-3'

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={cm.cn(cm.cursorPointer, 'text-left')}
      style={{ position: 'absolute', left: node.x, top: node.y }}
      onClick={onSelect}
      data-mol-id={`flow-node-${node.id}`}
    >
      <div
        className={`${widthClass} ${bgClass} rounded-xl border-l-4 ${borderColor} ${isAiSelected ? 'shadow-[0_0_30px_rgba(192,193,255,0.15)] ring-1 ring-primary/40' : isClassify ? 'shadow-2xl' : ''} ${opacityClass} p-4 flex flex-col ${gapClass}`}
      >
        {isClassify || isAiAgent ? (
          <div className={cm.flex({ align: 'center', justify: 'between' })}>
            <span
              className={`text-[10px] font-bold ${isAiAgent ? 'text-primary' : 'text-on-surface-variant'} uppercase tracking-widest`}
            >
              {typeLabel}
            </span>
            <div className={cm.flex()} style={{ gap: 'calc(1 * 0.25rem)' }}>
              {isAiSelected && (
                <span
                  style={{
                    fontFamily: 'Material Symbols outlined',
                    color: 'var(--md-sys-color-primary)',
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  auto_awesome
                </span>
              )}
              <span
                style={{
                  fontFamily: 'Material Symbols outlined',
                  fontSize: '${textSizeToRem($1)}',
                  lineHeight: '${textSizeToLineHeight($1)}',
                  color: 'var(--md-sys-color-outline)',
                }}
              >
                drag_indicator
              </span>
            </div>
          </div>
        ) : (
          <span
            className={cm.fontWeight('bold')}
            style={{
              fontSize: '10px',
              color: 'var(--md-sys-color-on-surface-variant)',
              textTransform: 'uppercase',
            }}
          >
            {typeLabel}
          </span>
        )}
        <span
          className={cm.cn(cm.fontWeight('semibold'), 'block')}
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          {t(`flow-node.${node.id}-label`, {}, { defaultValue: node.label })}
        </span>
        {isClassify && (
          <div style={{ rowGap: '1.5*0.25rem' }}>
            <div
              className={cm.flex({ justify: 'between' })}
              style={{
                fontSize: '10px',
                paddingLeft: 'calc(2 * 0.25rem)',
                paddingRight: 'calc(2 * 0.25rem)',
                padding: 'calc(1 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                borderRadius: '0.25rem',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              {t('flow-node.billing-inquiry', {}, { defaultValue: 'Billing Inquiry' })}
              <span style={{ fontFamily: 'Material Symbols outlined', fontSize: '12px' }}>
                chevron_right
              </span>
            </div>
            <div
              className={cm.flex({ justify: 'between' })}
              style={{
                fontSize: '10px',
                paddingLeft: 'calc(2 * 0.25rem)',
                paddingRight: 'calc(2 * 0.25rem)',
                padding: 'calc(1 * 0.25rem)',
                backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                borderRadius: '0.25rem',
                color: 'var(--md-sys-color-on-surface)',
              }}
            >
              {t('flow-node.technical-support', {}, { defaultValue: 'Technical Support' })}
              <span style={{ fontFamily: 'Material Symbols outlined', fontSize: '12px' }}>
                chevron_right
              </span>
            </div>
            <div
              className={cm.cn(cm.flex({ justify: 'between' }), cm.fontWeight('bold'))}
              style={{
                fontSize: '10px',
                paddingLeft: 'calc(2 * 0.25rem)',
                paddingRight: 'calc(2 * 0.25rem)',
                padding: 'calc(1 * 0.25rem)',
                backgroundColor: 'color-mix(in srgb, var(--md-sys-color-primary) 20%, transparent)',
                borderRadius: '0.25rem',
                color: 'var(--md-sys-color-primary)',
              }}
            >
              {t('flow-node.general-inquiry', {}, { defaultValue: 'General Inquiry' })}
              <span style={{ fontFamily: 'Material Symbols outlined', fontSize: '12px' }}>
                chevron_right
              </span>
            </div>
          </div>
        )}
        {isAiAgent && node.knowledge_base_id && (
          <div
            className={cm.flex({ align: 'center' })}
            style={{
              gap: 'calc(2 * 0.25rem)',
              fontSize: '10px',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            <span
              style={{
                fontFamily: 'Material Symbols outlined',
                fontSize: '${textSizeToRem($1)}',
                lineHeight: '${textSizeToLineHeight($1)}',
              }}
            >
              database
            </span>
            {t(
              'flow-node.linked-to-knowledge-base',
              {},
              { defaultValue: 'Linked to Knowledge Base' },
            )}
          </div>
        )}
      </div>
    </button>
  )
}

export { FlowNode }
