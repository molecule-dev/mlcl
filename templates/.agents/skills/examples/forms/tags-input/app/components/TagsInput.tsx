import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { TagInput } from '@molecule/app-tag-input-react'

/**
 * A tags/labels field built on the shared `<TagInput>` from
 * `@molecule/app-tag-input-react` — do NOT rebuild a chip input from scratch.
 *
 * `<TagInput>` is CONTROLLED: it renders `value` and calls `onChange` with the
 * NEXT array; store it or edits are lost. Tags commit on Enter / comma / Tab AND
 * on blur (a non-empty draft is added when the field loses focus). `normalize`
 * runs on every commit — return the cleaned tag or `null` to reject it; the
 * example lowercases + de-dupes.
 */
export function TagsInput({
  initialTags = [],
  maxTags,
  onChange,
}: {
  initialTags?: string[]
  maxTags?: number
  onChange?: (tags: string[]) => void
}) {
  const { t } = useTranslation()
  const [tags, setTags] = useState<string[]>(initialTags)

  const update = (next: string[]): void => {
    setTags(next)
    onChange?.(next)
  }

  return (
    <TagInput
      value={tags}
      onChange={update}
      maxTags={maxTags}
      placeholder={t('tags.placeholder', undefined, { defaultValue: 'Add a tag…' })}
      normalize={(raw, current) => {
        const tag = raw.trim().toLowerCase()
        return tag && !current.includes(tag) ? tag : null
      }}
    />
  )
}

export default TagsInput
