import { getClassMap } from '@molecule/app-ui'

/**
 * Material Symbols icon + brand-coloured tile for a file type. Mapping of
 * file kinds → glyphs/colours mirrors DESIGN.md `### File Type Icons`.
 *
 * Used by NimbusFileGridCard, NimbusFileRow, NimbusActivityRow and
 * search/file-detail surfaces. Consolidating the lookup here keeps every
 * surface consistent and avoids duplicating Tailwind colour literals.
 */
export type NimbusFileKind =
  | 'folder'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'generic'

interface KindStyle {
  glyph: string
  /** Foreground colour of the glyph + tint of the tile background. */
  color: string
  tile: string
}

const KIND_STYLES: Record<NimbusFileKind, KindStyle> = {
  folder: { glyph: 'folder', color: 'text-primary', tile: 'bg-primary-container/10' },
  document: { glyph: 'description', color: 'text-primary', tile: 'bg-primary-container/10' },
  spreadsheet: { glyph: 'table_chart', color: 'text-success', tile: 'bg-success-light' },
  presentation: { glyph: 'co_present', color: 'text-warning', tile: 'bg-warning-light' },
  image: { glyph: 'image', color: 'text-tertiary', tile: 'bg-tertiary-container/10' },
  video: { glyph: 'movie', color: 'text-error', tile: 'bg-error-light' },
  audio: { glyph: 'graphic_eq', color: 'text-error', tile: 'bg-error-light' },
  archive: { glyph: 'folder_zip', color: 'text-foreground-secondary', tile: 'bg-border' },
  code: { glyph: 'code', color: 'text-tertiary', tile: 'bg-tertiary-container/10' },
  generic: {
    glyph: 'insert_drive_file',
    color: 'text-on-surface-variant',
    tile: 'bg-surface-container-high',
  },
}

export interface NimbusFileTypeIconProps {
  kind: NimbusFileKind
  /** Render size — `sm` for list rows, `md` for grid cards, `lg` for detail headers. */
  size?: 'sm' | 'md' | 'lg'
  /** When true, shows just the glyph (no tile background). */
  bare?: boolean
}

export function NimbusFileTypeIcon({ kind, size = 'md', bare = false }: NimbusFileTypeIconProps) {
  const cm = getClassMap()
  const style = KIND_STYLES[kind] ?? KIND_STYLES.generic

  const tileSize =
    size === 'lg' ? 'w-16 h-16 text-3xl' : size === 'sm' ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'

  if (bare) {
    return (
      <span
        className={cm.cn(
          'material-symbols-outlined',
          tileSize
            .split(' ')
            .filter((c) => c.startsWith('text-'))
            .join(' '),
          style.color,
        )}
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        {style.glyph}
      </span>
    )
  }

  return (
    <span
      className={cm.cn(
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        'rounded-xl',
        tileSize,
        style.tile,
        style.color,
      )}
      aria-hidden="true"
    >
      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
        {style.glyph}
      </span>
    </span>
  )
}
