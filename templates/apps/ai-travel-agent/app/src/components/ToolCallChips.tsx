import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** One tool the agent used on a turn, as the API records it on the message. */
export interface ToolCall {
  name: string
  input?: unknown
  result?: unknown
  isError?: boolean
}

const ICONS: Record<string, string> = {
  search_flights: 'travel_explore',
  book_flight: 'confirmation_number',
  check_flight_status: 'schedule',
  rebook_flight: 'swap_horiz',
  split_bill: 'call_split',
  list_bookings: 'luggage',
}

/**
 * Small chips under an assistant turn naming what the agent did: searched,
 * booked, rebooked, split. Shows the work without exposing raw JSON.
 */
export function ToolCallChips({ calls }: { calls: ToolCall[] }) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const labels: Record<string, string> = {
    search_flights: t('tools.search_flights', {}, { defaultValue: 'Searched flights' }),
    book_flight: t('tools.book_flight', {}, { defaultValue: 'Booked' }),
    check_flight_status: t('tools.check_flight_status', {}, { defaultValue: 'Checked status' }),
    rebook_flight: t('tools.rebook_flight', {}, { defaultValue: 'Rebooked' }),
    split_bill: t('tools.split_bill', {}, { defaultValue: 'Split the bill' }),
    list_bookings: t('tools.list_bookings', {}, { defaultValue: 'Listed bookings' }),
  }
  return (
    <ul
      className={cm.cn(cm.flex({ wrap: 'wrap', gap: 'xs' }), cm.sp('pl', 2))}
      aria-label={t('tools.label', {}, { defaultValue: 'What the agent did' })}
      data-mol-id="tool-calls"
    >
      {calls.map((call, i) => (
        <li
          key={`${call.name}-${String(i)}`}
          data-mol-id={`tool-call-${call.name}`}
          data-error={call.isError ? 'true' : undefined}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('medium'),
            cm.sp('px', 3),
            cm.sp('py', 1),
            call.isError
              ? 'bg-error/15 text-error border border-error/30'
              : 'bg-primary/10 text-primary border border-primary/25',
          )}
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            {ICONS[call.name] ?? 'bolt'}
          </span>
          {labels[call.name] ?? call.name}
        </li>
      ))}
    </ul>
  )
}
