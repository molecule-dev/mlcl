import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

const COLORS = [
  { name: 'Silver', value: '#E8E8E8', molId: 'color-silver' },
  { name: 'Black', value: '#1A1A1A', molId: 'color-black' },
  { name: 'Blue', value: '#2B3442', molId: 'color-blue' },
]

export default function ProductColorSelector({
  selectedColor = 'Silver',
  onColorChange,
}: {
  selectedColor?: string
  onColorChange?: (c: string) => void
}) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <div>
      <h3
        className={cm.cn(
          cm.textSize('sm'),
          cm.fontWeight('bold'),
          cm.sp('mb', 3),
          'text-foreground',
        )}
      >
        {t('productColorSelector.colorLabel', {}, { defaultValue: 'Color:' })}{' '}
        <span className={cm.cn(cm.fontWeight('normal'), 'text-foreground-secondary')}>
          {t(`common.colors.${selectedColor.toLowerCase()}`, {}, { defaultValue: selectedColor })}
        </span>
      </h3>
      <div className={cm.flex({ gap: 3 })}>
        {COLORS.map((c) => (
          <button
            key={c.name}
            className={cm.cn(
              cm.w(10),
              cm.h(10),
              cm.roundedFull,
              'border-2 p-0.5',
              selectedColor === c.name
                ? 'border-green-600 ring-2 ring-offset-2 ring-transparent'
                : 'border-transparent hover:border-border',
            )}
            data-mol-id={c.molId}
            onClick={() => onColorChange?.(c.name)}
            aria-label={t(`common.colors.${c.name.toLowerCase()}`, {}, { defaultValue: c.name })}
          >
            <span
              className={cm.cn(cm.w('full'), cm.h('full'), cm.roundedFull, 'block')}
              style={{ backgroundColor: c.value }}
            ></span>
          </button>
        ))}
      </div>
    </div>
  )
}
export { ProductColorSelector }
