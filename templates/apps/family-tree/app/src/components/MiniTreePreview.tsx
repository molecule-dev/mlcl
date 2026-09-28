import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Landing-page hero visual — the "lineage canvas dossier": a linen card that
 * mirrors the real Tree screen's three-generation canvas with a toolbar
 * (pedigree meta + generation switcher + export), person cards with avatar
 * initials, lineage spines, and an audio-story player band. Static demo data
 * only — decorative controls are non-interactive.
 */
export function MiniTreePreview() {
  const cm = getClassMap()
  const { t } = useTranslation()

  const name = (key: string, def: string): string => t(`miniTree.${key}`, {}, { defaultValue: def })

  const icon = (glyph: string, fill?: boolean, size = 'text-[13px]') => (
    <span
      className={cm.cn('material-symbols-outlined', size)}
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden="true"
    >
      {glyph}
    </span>
  )

  /** One person card on the canvas. */
  const person = (opts: {
    initials: string
    avatarStyle: React.CSSProperties
    name: string
    years: string
    note?: string
    accent?: 'focus' | 'audio'
    trailing?: string
  }) => (
    <div
      className={cm.cn(
        cm.sp('p', 3),
        'rounded-lg shadow-sm flex items-start gap-3 text-left',
        opts.accent === 'focus'
          ? 'rounded-xl border-2 bg-surface'
          : opts.accent === 'audio'
            ? 'border-2 bg-surface-container-lowest'
            : 'border bg-surface-container-lowest',
      )}
      style={{
        width: 200,
        borderColor:
          opts.accent === 'focus'
            ? 'var(--mol-color-primary)'
            : opts.accent === 'audio'
              ? 'var(--color-forest-hover)'
              : 'var(--mol-color-border)',
      }}
    >
      <span
        className={cm.cn(
          'w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-semibold',
        )}
        style={{
          ...opts.avatarStyle,
          fontFamily: 'var(--font-headline)',
        }}
        aria-hidden="true"
      >
        {opts.initials}
      </span>
      <span className="flex-1 min-w-0">
        <span className={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'xs' }))}>
          <span
            className={cm.cn(
              cm.textSize('sm'),
              cm.fontWeight('semibold'),
              'leading-tight truncate',
            )}
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {opts.name}
          </span>
          {opts.trailing ? (
            <span
              className={cm.cn(
                cm.sp('px', 1.5),
                cm.sp('py', 0.5),
                'rounded text-[10px] font-semibold shrink-0',
              )}
              style={{
                backgroundColor: 'var(--color-forest)',
                color: 'var(--mol-color-text-inverse)',
              }}
            >
              {opts.trailing}
            </span>
          ) : null}
        </span>
        <span
          className={cm.cn(cm.textSize('xs'), 'block text-on-surface-variant mt-0.5 tabular-nums')}
        >
          {opts.years}
        </span>
        {opts.note ? (
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              'text-[10px] mt-1 font-medium',
            )}
            style={{ color: 'var(--color-forest-hover)' }}
          >
            {icon(opts.accent === 'audio' ? 'volume_up' : 'photo_library', opts.accent === 'audio')}
            {opts.note}
          </span>
        ) : null}
      </span>
    </div>
  )

  /** Vertical lineage spine between generations. */
  const spine = (
    <div className={cm.cn(cm.flex({ justify: 'center' }), 'h-8')} aria-hidden="true">
      <div className="w-[1.5px] h-full" style={{ backgroundColor: 'var(--color-forest-hover)' }} />
    </div>
  )

  return (
    <div
      className={cm.cn('mol-linen-card rounded-xl relative overflow-hidden', cm.sp('p', 5))}
      data-mol-id="landing-tree-preview"
    >
      {/* Canvas topbar: pedigree meta + view options */}
      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'between', gap: 'md' }),
          'border-b pb-4',
        )}
        style={{ borderColor: 'var(--color-linen-border)' }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className="material-symbols-outlined text-[26px]"
            style={{ color: 'var(--color-forest-hover)' }}
            aria-hidden="true"
          >
            auto_stories
          </span>
          <div>
            <p
              className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'), 'leading-tight')}
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {name('title', 'The Vance-Lin Family Tapestry')}
            </p>
            <div
              className={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                cm.textSize('xs'),
                'text-on-surface-variant mt-0.5',
              )}
            >
              <span
                className={cm.cn(
                  cm.flex({ align: 'center', gap: 'xs' }),
                  cm.sp('px', 2),
                  cm.sp('py', 0.5),
                  'rounded font-medium',
                )}
                style={{
                  backgroundColor: 'var(--color-vault-chip)',
                  color: 'var(--color-on-vault-chip)',
                }}
              >
                {icon('verified')}
                {name('verifiedBadge', 'Verified Pedigree')}
              </span>
              <span aria-hidden="true">•</span>
              <span>{name('keepsakes', '18 Keepsakes Attached')}</span>
              <span aria-hidden="true">•</span>
              <span>{name('audioStories', '12 Audio Stories')}</span>
            </div>
          </div>
        </div>
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('p', 1),
            'rounded-lg border',
          )}
          style={{
            backgroundColor: 'var(--mol-color-background-secondary)',
            borderColor: 'var(--color-linen-border)',
          }}
        >
          {[
            { label: name('gen3', '3 Gen'), active: true },
            { label: name('gen5', '5 Gen'), active: false },
            { label: name('genAll', 'All'), active: false },
          ].map((g) => (
            <span
              key={g.label}
              className={cm.cn(
                cm.sp('px', 2.5),
                cm.sp('py', 1),
                cm.textSize('xs'),
                'rounded',
                g.active ? cm.fontWeight('semibold') : 'text-on-surface-variant',
              )}
              style={
                g.active
                  ? {
                      backgroundColor: 'var(--mol-color-surface)',
                      color: 'var(--mol-color-primary)',
                      boxShadow: 'var(--shadow-sm)',
                    }
                  : undefined
              }
            >
              {g.label}
            </span>
          ))}
          <span
            className="h-4 w-px mx-1"
            style={{ backgroundColor: 'var(--color-linen-border)' }}
          />
          <span
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              cm.sp('px', 2.5),
              cm.sp('py', 1),
              cm.textSize('xs'),
              'rounded',
            )}
            style={{ color: 'var(--color-forest-hover)' }}
          >
            {icon('picture_as_pdf')}
            {name('export', 'Export Parchment PDF')}
          </span>
        </div>
      </div>

      {/* Tree canvas — three generations */}
      <div
        className={cm.cn(cm.sp('py', 8), cm.sp('px', 2), 'flex flex-col items-center')}
        aria-hidden="true"
      >
        {/* Generation I: grandparents */}
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }), 'flex-wrap')}
        >
          {person({
            initials: 'AV',
            avatarStyle: {
              backgroundColor: 'var(--color-vault-chip)',
              color: 'var(--color-on-vault-chip)',
            },
            name: name('grandfather', 'Arthur Vance'),
            years: name('grandfatherYears', '1918 – 1994'),
            note: name('grandfatherRecords', '4 Records'),
          })}
          <span
            className="w-8 h-[1.5px]"
            style={{ backgroundColor: 'var(--color-linen-border)' }}
          />
          {person({
            initials: 'EV',
            avatarStyle: {
              backgroundColor: 'var(--color-tree-partner-bg)',
              color: 'var(--color-tree-partner)',
            },
            name: name('grandmother', 'Eleanor Vance'),
            years: name('grandmotherYears', '1922 – 2011'),
            note: name('grandmotherAudio', '1942 wedding recording • 02:45'),
            accent: 'audio',
          })}
        </div>
        {spine}
        {/* Generation II: parents */}
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'lg' }), 'flex-wrap')}
        >
          {person({
            initials: 'TV',
            avatarStyle: {
              backgroundColor: 'var(--mol-color-background-tertiary)',
              color: 'var(--mol-color-primary-dark)',
            },
            name: name('father', 'Thomas Vance'),
            years: name('fatherYears', 'b. 1951 • Edinburgh'),
            note: name('fatherNote', 'Architectural historian'),
          })}
          <span style={{ color: 'var(--color-forest-hover)' }}>{icon('link')}</span>
          {person({
            initials: 'CT',
            avatarStyle: {
              backgroundColor: 'var(--mol-color-background-tertiary)',
              color: 'var(--mol-color-primary-dark)',
            },
            name: name('mother', 'Claire Thorne'),
            years: name('motherYears', 'b. 1954 • York'),
            note: name('motherNote', 'Botanical illustrator'),
          })}
        </div>
        {spine}
        {/* Generation III: focus member + spouse */}
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'center', gap: 'md' }), 'flex-wrap')}
        >
          {person({
            initials: 'JV',
            avatarStyle: {
              backgroundColor: 'var(--color-forest)',
              color: 'var(--mol-color-text-inverse)',
            },
            name: name('you', 'Julian Vance'),
            years: name('youYears', 'b. 1986 • London'),
            note: name('youPhotos', '9 photo memories'),
            accent: 'focus',
            trailing: name('youBadge', 'YOU'),
          })}
          <span style={{ color: 'var(--color-forest-hover)' }}>{icon('favorite')}</span>
          {person({
            initials: 'ML',
            avatarStyle: {
              backgroundColor: 'var(--color-vault-chip)',
              color: 'var(--color-on-vault-chip)',
            },
            name: name('spouse', 'Maeve Lin'),
            years: name('spouseYears', 'b. 1989 • Vancouver'),
            note: name('spouseNote', 'Dual Lineage linked'),
          })}
        </div>
        {/* Children pill */}
        <div
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 2),
            cm.sp('mt', 4),
            cm.textSize('xs'),
            'rounded-lg border',
          )}
          style={{
            backgroundColor: 'var(--mol-color-background-secondary)',
            borderColor: 'var(--color-linen-border)',
          }}
        >
          <span style={{ color: 'var(--color-forest-hover)' }}>
            {icon('family_restroom', false, 'text-[16px]')}
          </span>
          <span>{name('children', 'Children: Leo (2018), Nora (2021)')}</span>
        </div>
      </div>

      {/* Audio story player band */}
      <div
        className={cm.cn(
          cm.flex({ wrap: 'wrap', align: 'center', justify: 'between', gap: 'md' }),
          cm.sp('p', 3),
          'rounded-lg border',
        )}
        style={{
          backgroundColor: 'var(--mol-color-background-tertiary)',
          borderColor: 'var(--color-linen-border)',
        }}
      >
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
          <span
            className={cm.cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0')}
            style={{
              backgroundColor: 'var(--color-forest)',
              color: 'var(--mol-color-text-inverse)',
            }}
            aria-hidden="true"
          >
            {icon('play_arrow', true, 'text-[20px]')}
          </span>
          <div>
            <p className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), 'leading-tight')}>
              {name('playerTitle', "Eleanor's 1942 wedding recording • 02:45")}
            </p>
            <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-0.5')}>
              {name(
                'playerSub',
                'Preserved in 24-bit studio FLAC lossless master with family transcription',
              )}
            </p>
          </div>
        </div>
        {/* Mini waveform */}
        <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), 'h-6')} aria-hidden="true">
          {[
            { h: 12, played: true },
            { h: 20, played: true },
            { h: 8, played: true },
            { h: 24, played: true },
            { h: 16, played: true },
            { h: 20, played: true },
            { h: 12, played: false },
            { h: 8, played: false },
            { h: 16, played: false },
            { h: 8, played: false },
          ].map((b, i) => (
            <span
              key={i}
              className="w-1 rounded-full"
              style={{
                height: b.h,
                backgroundColor: b.played
                  ? 'var(--color-forest-hover)'
                  : 'var(--color-linen-border)',
              }}
            />
          ))}
          <span className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant ml-2 tabular-nums')}>
            {name('playerTime', '01:14 / 02:45')}
          </span>
        </div>
      </div>
    </div>
  )
}

export default MiniTreePreview
