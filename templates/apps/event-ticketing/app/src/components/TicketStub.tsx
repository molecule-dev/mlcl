import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Perforated-ticket card — top accent stripe, headline event row,
 * dashed tear-line with circular cutouts on left/right edges, QR
 * panel + ticket-mono ref code below. Used on OrderConfirmation,
 * TicketDetail, and MyTickets.
 *
 * Per DESIGN.md "Ticket / Order Confirmation" recipe:
 * - 4px primary top stripe
 * - 1px dashed ticket-dashed (#c4b5fd) tear line w/ 20px circle cutouts
 * - QR code (200px), ticket-mono ref code below
 *
 * No direct catalog sibling for the perforated treatment — translated
 * from the recipe block in DESIGN.md plus property-listing's
 * ListingDetailHeader composition for the headline row.
 */
interface TicketStubProps {
  eventName: string
  tier: string
  holderName: string
  whenLabel: string
  venueName: string
  venueAddress: string
  refCode: string
  /** Optional QR slug; falls back to the ref code in a placeholder grid. */
  qrSlug?: string
  /** "Front row · GA" sub-pill. */
  badge?: string
  /** Status pill — "Active", "Used", "Transferred", "Refunded". */
  status?: { label: string; tone: 'active' | 'used' | 'transferred' | 'refunded' }
}

const STATUS_TONE: Record<
  NonNullable<TicketStubProps['status']>['tone'],
  { bg: string; color: string }
> = {
  active: { bg: 'var(--color-status-active-bg)', color: 'var(--color-status-active)' },
  used: { bg: 'var(--color-status-checked-in-bg)', color: 'var(--color-status-checked-in)' },
  transferred: {
    bg: 'var(--color-status-transferred-bg)',
    color: 'var(--color-status-transferred)',
  },
  refunded: { bg: 'var(--color-status-no-show-bg)', color: 'var(--color-status-no-show)' },
}

function QrPlaceholder({ slug }: { slug: string }) {
  const cm = getClassMap()
  // 11x11 deterministic blocks from a string (no external dep, no module-level state).
  const cells: boolean[] = []
  for (let i = 0; i < 121; i++) {
    let h = 0
    for (let j = 0; j < slug.length; j++) {
      h = (h * 31 + slug.charCodeAt(j) + i * 7) >>> 0
    }
    cells.push((h & 3) > 0)
  }
  // Force the three corner finder squares.
  for (const [r, c] of [
    [0, 0],
    [0, 8],
    [8, 0],
  ] as const) {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const idx = (r + dy) * 11 + (c + dx)
        cells[idx] = dy === 0 || dy === 2 || dx === 0 || dx === 2
      }
    }
  }
  return (
    <div
      className={cm.cn('grid w-full h-full p-2 bg-surface')}
      style={{
        gridTemplateColumns: 'repeat(11, 1fr)',
        gridTemplateRows: 'repeat(11, 1fr)',
        gap: '1px',
      }}
      aria-hidden="true"
    >
      {cells.map((on, i) => (
        <span
          key={i}
          style={{ background: on ? 'var(--color-text)' : 'var(--color-surface)', borderRadius: 1 }}
        />
      ))}
    </div>
  )
}

export function TicketStub({
  eventName,
  tier,
  holderName,
  whenLabel,
  venueName,
  venueAddress,
  refCode,
  qrSlug,
  badge,
  status,
}: TicketStubProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const tone = status ? STATUS_TONE[status.tone] : null

  return (
    <article
      className={cm.cn(
        'relative bg-surface rounded-2xl shadow-lg shadow-primary/10 border border-outline-variant/40 overflow-hidden',
      )}
    >
      {/* Top accent stripe */}
      <div
        className={cm.cn('h-1.5 w-full')}
        style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }}
        aria-hidden="true"
      />

      <div className={cm.cn('grid grid-cols-1 md:grid-cols-[1fr_240px] relative')}>
        {/* Left — event details */}
        <div className={cm.cn(cm.sp('p', 6), cm.stack(4))}>
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }))}>
            <span
              className={cm.cn(
                'px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white',
              )}
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              }}
            >
              {tier}
            </span>
            {badge ? (
              <span
                className={cm.cn(
                  'px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest',
                )}
                style={{
                  background: 'var(--color-error-light)',
                  color: 'var(--color-accent-dark)',
                }}
              >
                {badge}
              </span>
            ) : null}
            {status && tone ? (
              <span
                className={cm.cn(
                  'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                )}
                style={{ background: tone.bg, color: tone.color }}
              >
                {status.label}
              </span>
            ) : null}
          </div>
          <h3 className={cm.cn('text-2xl font-extrabold tracking-tight text-on-surface')}>
            {eventName}
          </h3>
          <dl className={cm.cn('grid grid-cols-2 gap-x-6 gap-y-3')}>
            <div>
              <dt
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('ticketStub.holder', {}, { defaultValue: 'Holder' })}
              </dt>
              <dd className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                {holderName}
              </dd>
            </div>
            <div>
              <dt
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('ticketStub.when', {}, { defaultValue: 'When' })}
              </dt>
              <dd className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                {whenLabel}
              </dd>
            </div>
            <div className={cm.cn('col-span-2')}>
              <dt
                className={cm.cn(
                  'text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
                )}
              >
                {t('ticketStub.venue', {}, { defaultValue: 'Venue' })}
              </dt>
              <dd className={cm.cn(cm.textSize('sm'), 'font-semibold text-on-surface')}>
                {venueName}
              </dd>
              <dd className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant mt-0.5')}>
                {venueAddress}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right — QR panel separated by dashed perforation */}
        <div
          className={cm.cn(
            'relative md:border-l-0 md:border-t-0 border-t md:border-l flex flex-col items-center justify-center text-center',
          )}
          style={{
            borderStyle: 'dashed',
            borderColor: 'var(--color-border-secondary)',
            borderWidth: '0',
            borderLeftWidth: '0',
            padding: '1.5rem',
          }}
        >
          {/* The actual dashed seam — top on mobile, left on desktop */}
          <div
            className={cm.cn('absolute hidden md:block')}
            style={{
              left: 0,
              top: 0,
              bottom: 0,
              borderLeft: '1px dashed var(--color-border-secondary)',
            }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute md:hidden')}
            style={{
              left: 0,
              right: 0,
              top: 0,
              borderTop: '1px dashed var(--color-border-secondary)',
            }}
            aria-hidden="true"
          />
          {/* Cutout circles */}
          <div
            className={cm.cn('absolute hidden md:block w-5 h-5 rounded-full bg-background')}
            style={{ left: '-10px', top: '-10px' }}
            aria-hidden="true"
          />
          <div
            className={cm.cn('absolute hidden md:block w-5 h-5 rounded-full bg-background')}
            style={{ left: '-10px', bottom: '-10px' }}
            aria-hidden="true"
          />

          <div className={cm.cn('w-44 h-44 rounded-xl bg-surface p-2 shadow-inner')}>
            <QrPlaceholder slug={qrSlug ?? refCode} />
          </div>
          <p
            className={cm.cn(
              'mt-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant',
            )}
          >
            {t('ticketStub.ref', {}, { defaultValue: 'Ticket ref' })}
          </p>
          <p
            className={cm.cn('text-sm font-bold')}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {refCode}
          </p>
        </div>
      </div>
    </article>
  )
}

export default TicketStub
