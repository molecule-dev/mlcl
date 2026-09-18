import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
interface ResponseFormatOptionProps {
  label: string
  selected: boolean
  onSelect: () => void
}

export default function ResponseFormatOption({
  label,
  selected,
  onSelect,
}: ResponseFormatOptionProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`w-full text-left flex items-center justify-between p-3 rounded-xl cursor-pointer hover:bg-surface-container-highest transition-colors${selected ? ' bg-surface-container-lowest group' : ' bg-surface-container-lowest/50'}`}
      data-mol-id="response-format-option"
      onClick={onSelect}
    >
      <span className={`text-xs ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
        {t(
          `response-format-option.${label
            .toLowerCase()
            .replace(/[\s()]+/g, '-')
            .replace(/-+$/g, '')
            .slice(0, 40)}`,
          {},
          { defaultValue: label },
        )}
      </span>
      {selected ? (
        <span
          className={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
          style={{
            width: '4rem-scaled',
            height: 'calc(4 * 0.25rem)',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: 'var(--md-sys-color-primary)',
          }}
        >
          <span
            className={cm.roundedFull}
            style={{
              width: '2rem-scaled',
              height: 'calc(2 * 0.25rem)',
              backgroundColor: 'var(--md-sys-color-primary)',
            }}
          ></span>
        </span>
      ) : (
        <span
          className={cm.roundedFull}
          style={{
            width: '4rem-scaled',
            height: 'calc(4 * 0.25rem)',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        ></span>
      )}
    </button>
  )
}

export { ResponseFormatOption }
