import { Link } from 'react-router'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { SamplePhoto } from '../lib/sample-photos.js'

interface PhotoTileProps {
  photo: SamplePhoto
  /** Optional id of a photo currently focused. Adds a primary ring. */
  activeId?: string
  /** Override the default `/editor?photo=:id` link target. */
  href?: string
  /** Use button + onSelect for inline lightbox flows instead of a Link. */
  onSelect?: (photoId: string) => void
}

const COVER_GRADIENTS = [
  'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
  'linear-gradient(135deg, #1e1e36 0%, #312e81 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0c4a6e 100%)',
  'linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)',
]

const ASPECT_CLASSES: Record<SamplePhoto['aspect'], string> = {
  tall: 'row-span-2 aspect-[3/4]',
  wide: 'col-span-2 aspect-[16/10]',
  square: 'aspect-square',
}

function fmtBytes(bytes: number): string {
  const mb = bytes / 1_000_000
  if (mb >= 10) return `${mb.toFixed(0)}MB`
  if (mb >= 1) return `${mb.toFixed(1)}MB`
  return `${(bytes / 1_000).toFixed(0)}KB`
}

/**
 * Editorial masonry photo tile — variable-height card with gradient
 * placeholder, hover overlay revealing title + dimensions + size, and
 * an optional active ring. Uses a button when `onSelect` is provided
 * (lightbox flows) or a Link otherwise (Editor entry).
 *
 * Translated from photo-sharing's PhotoMasonry.tsx tile shape, recoloured
 * for Lustra's violet/magenta gradient palette and given monospace
 * dimension/size readouts that match DESIGN.md "Canvas Overlay Controls".
 */
export function PhotoTile({ photo, activeId, href, onSelect }: PhotoTileProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const gradient = COVER_GRADIENTS[photo.cover_index % COVER_GRADIENTS.length]
  const aspectClass = ASPECT_CLASSES[photo.aspect]
  const isActive = activeId === photo.id

  const tile = (
    <div
      className={cm.cn(
        'relative w-full h-full overflow-hidden rounded-md group transition-shadow duration-300',
        isActive
          ? 'ring-2 ring-[var(--photo-accent)] ring-offset-2 ring-offset-[var(--photo-canvas-bg)] shadow-lg'
          : 'hover:shadow-lg',
      )}
      style={{ background: gradient }}
    >
      <div
        className={cm.cn(
          'absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.16)_1px,transparent_0)] [background-size:18px_18px] opacity-60',
        )}
        aria-hidden="true"
      />
      <div
        className={cm.cn('absolute inset-0 flex items-center justify-center pointer-events-none')}
        aria-hidden="true"
      >
        <span
          className={cm.cn(
            'material-symbols-outlined text-[64px] text-white/35 group-hover:scale-105 transition-transform duration-300',
          )}
        >
          image
        </span>
      </div>
      <div
        className={cm.cn(
          'absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent',
          // Touch has no hover — keep the metadata visible below md.
          'opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300',
        )}
      />
      <div
        className={cm.cn(
          'absolute inset-x-0 bottom-0 p-3',
          'opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300',
        )}
      >
        <p className={cm.cn('text-sm font-bold text-white line-clamp-1 tracking-tight')}>
          {photo.title}
        </p>
        <div
          className={cm.cn(
            'flex items-center gap-2 text-[10px] text-white/85 font-mono uppercase tracking-widest mt-0.5',
          )}
        >
          <span>
            {photo.dimensions.width}×{photo.dimensions.height}
          </span>
          <span aria-hidden="true">·</span>
          <span>{fmtBytes(photo.size_bytes)}</span>
        </div>
      </div>
      {photo.edited_at && (
        <span
          className={cm.cn(
            'absolute top-2 left-2 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest text-white bg-foreground/55 backdrop-blur rounded',
          )}
        >
          {t('photoTile.edited', {}, { defaultValue: 'Edited' })}
        </span>
      )}
    </div>
  )

  return (
    <li className={cm.cn(aspectClass, 'min-h-0')}>
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(photo.id)}
          aria-label={t(
            'photoTile.openAria',
            { title: photo.title },
            { defaultValue: 'Open {{title}}' },
          )}
          className={cm.cn('block w-full h-full text-left')}
        >
          {tile}
        </button>
      ) : (
        <Link
          to={href ?? `/editor?photo=${photo.id}`}
          aria-label={t(
            'photoTile.openAria',
            { title: photo.title },
            { defaultValue: 'Open {{title}}' },
          )}
          className={cm.cn('block w-full h-full')}
        >
          {tile}
        </Link>
      )}
    </li>
  )
}

export default PhotoTile
