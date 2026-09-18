/**
 * Thin shim around @molecule/app-image-gallery-editor-react. Owns the
 * local slot-state + status-message logic; the shared package owns the
 * hero drop zone + thumbnail-slot grid rendering.
 */
import { useState } from 'react'

import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-react'
import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

function ListingEditorImageGallery() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null])
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const activeImages = slots.filter(Boolean).length

  return (
    <ImageGalleryEditor
      slots={slots}
      onChange={(next) => {
        setSlots(next)
        // If a slot just dropped to null, the consumer-side message
        // explains there's no server sync yet. Detect both directions.
        if (next.filter(Boolean).length < activeImages) {
          setStatusMessage(
            t(
              'listingEditorImageGallery.removeLocalOnly',
              {},
              {
                defaultValue:
                  'Removed from this draft. Server sync will be enabled when media API is connected.',
              },
            ),
          )
        } else if (next.filter(Boolean).length > activeImages) {
          setStatusMessage(
            t(
              'listingEditorImageGallery.uploadLocalOnly',
              {},
              {
                defaultValue:
                  'Image added locally for preview. It is not uploaded to the server yet.',
              },
            ),
          )
        }
      }}
      onPickFiles={() => {
        // Local-only flow: each pick produces a deterministic stock URL
        // until the media API bond is wired in.
        return [`https://picsum.photos/seed/ListingEditorImageGallery-${Date.now()}/1200/800`]
      }}
      maxImages={24}
      header={
        <div>
          <h3
            className={cm.cn(
              'font-headline text-on-surface',
              cm.textSize('xl'),
              cm.fontWeight('bold'),
              cm.sp('mb', 1),
            )}
          >
            {t('listingEditorImageGallery.title', {}, { defaultValue: 'Image Gallery' })}
          </h3>
          <p className={cm.cn(cm.textSize('sm'), 'text-foreground-secondary')}>
            {t(
              'listingEditorImageGallery.requirements',
              {},
              { defaultValue: 'Recommended: high-resolution images, ideally 4000px+ wide' },
            )}
          </p>
        </div>
      }
      counter={t(
        'listingEditorImageGallery.photoCount',
        { current: activeImages, max: 24 },
        { defaultValue: '{{current}} / {{max}} Photos' },
      )}
      dropZoneTitle={t(
        'listingEditorImageGallery.dropZoneTitle',
        {},
        { defaultValue: 'Drag and drop assets here' },
      )}
      dropZoneHint={t(
        'listingEditorImageGallery.dropZoneHint',
        {},
        { defaultValue: 'or click to browse local files' },
      )}
      confirmRemoveMessage={t(
        'listingEditorImageGallery.confirmRemove',
        {},
        { defaultValue: 'Remove this image?' },
      )}
      statusMessage={statusMessage}
    />
  )
}

export default ListingEditorImageGallery
export { ListingEditorImageGallery }
