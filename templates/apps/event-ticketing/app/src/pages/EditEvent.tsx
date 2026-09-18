import { useTranslation } from '@molecule/app-react'

import { CreateEvent } from './CreateEvent.js'

/**
 * Derives from CreateEvent — same multi-step shell with the "Edit"
 * heading, "Replace banner", "Save changes" button, and a Danger Zone
 * card (Cancel / Delete) wired in the right rail.
 */
export function EditEvent() {
  const { t } = useTranslation()
  // Surface the page label for accessibility / assistive tooling so that
  // EditEvent has a translated identity even though it composes CreateEvent.
  const pageLabel = t('editEvent.pageLabel', {}, { defaultValue: 'Edit event' })
  return (
    <div role="main" aria-label={pageLabel}>
      <CreateEvent mode="edit" />
    </div>
  )
}

export default EditEvent
