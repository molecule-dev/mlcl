import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { RichTextValue } from '@molecule/app-rich-text'
import { getClassMap } from '@molecule/app-ui'

import { RichTextField } from './RichTextField.js'

const cm = getClassMap()

/**
 * Concrete usage: a note editor that holds the rich-text value in state and
 * hands it to `onSave`. `RichTextValue` carries BOTH `text` (plain, for
 * search/preview/validation) and `html` (for rendering) — persist both. Render
 * stored HTML through a sanitizer (the quill bond already sanitizes on input via
 * dompurify, but treat any stored HTML as untrusted on output too).
 */
export function NoteEditor({ onSave }: { onSave: (value: RichTextValue) => void }) {
  const { t } = useTranslation()
  const [value, setValue] = useState<RichTextValue | undefined>()

  return (
    <div className={cm.cn(cm.flex({ direction: 'col', gap: 'md' }))}>
      <RichTextField
        placeholder={t('note.placeholder', undefined, { defaultValue: 'Write your note…' })}
        onChange={setValue}
      />
      <button
        type="button"
        data-mol-id="save-note"
        disabled={!value?.text.trim()}
        onClick={() => value && onSave(value)}
        className={cm.button({ variant: 'solid' })}
      >
        {t('note.save', undefined, { defaultValue: 'Save' })}
      </button>
    </div>
  )
}

export default NoteEditor
