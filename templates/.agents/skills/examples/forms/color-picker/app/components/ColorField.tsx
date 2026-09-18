import { useState } from 'react'

import { ColorPicker } from '@molecule/app-color-picker-react'

/**
 * A color field built on the shared `<ColorPicker>` from
 * `@molecule/app-color-picker-react` — do NOT rebuild a hue/saturation picker
 * from scratch.
 *
 * `<ColorPicker>` is CONTROLLED: `value` is a hex string (e.g. `#2563eb`) and
 * `onChange` fires with the new hex; store it or the selection is lost. Persist
 * the hex string as your source of truth (the package ships `hexToRgb` /
 * `rgbToHex` / `hsvToRgb` helpers if you need other formats).
 */
export function ColorField({
  initialColor = '#2563eb',
  onChange,
}: {
  initialColor?: string
  onChange?: (hex: string) => void
}) {
  const [color, setColor] = useState(initialColor)

  const update = (hex: string): void => {
    setColor(hex)
    onChange?.(hex)
  }

  return <ColorPicker value={color} onChange={update} dataMolId="color-field" />
}

export default ColorField
