import { useEffect, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { createEditor, type RichTextEditor, type RichTextValue } from '@molecule/app-rich-text'
import { getClassMap } from '@molecule/app-ui'

const cm = getClassMap()

/**
 * Imperative rich-text field. `createEditor()` takes a container and returns a
 * `RichTextEditor`, so this wraps it in a ref + effect: build on mount, forward
 * every edit via `onChange` (the editor's normalized `{ text, html }` value),
 * and `destroy()` on unmount.
 *
 * Bond `@molecule/app-rich-text-quill` for the real toolbar UI — the un-bonded
 * default self-bonds a bare `contentEditable` (no toolbar, basic formatting).
 * The editor owns its content after mount, so this builds ONCE (rebuilding
 * would drop the caret + selection); read the initial props from a ref.
 */
export function RichTextField({
  initialValue,
  placeholder,
  readOnly = false,
  onChange,
}: {
  initialValue?: RichTextValue
  placeholder?: string
  readOnly?: boolean
  onChange?: (value: RichTextValue) => void
}) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  // onChange kept fresh without re-running the mount effect.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  // Init-only options captured at first render (translated placeholder included).
  const initRef = useRef({
    initialValue,
    readOnly,
    placeholder:
      placeholder ?? t('editor.placeholder', undefined, { defaultValue: 'Start typing…' }),
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    const editor: RichTextEditor = createEditor({
      container,
      value: initRef.current.initialValue,
      placeholder: initRef.current.placeholder,
      toolbar: 'standard',
      readOnly: initRef.current.readOnly,
    })
    const off = editor.on('text-change', () => onChangeRef.current?.(editor.getValue()))
    return () => {
      off()
      editor.destroy()
    }
  }, [])

  return <div ref={containerRef} data-mol-id="rich-text-field" className={cm.cn(cm.card({}))} />
}

export default RichTextField
