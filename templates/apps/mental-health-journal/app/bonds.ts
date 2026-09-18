import { bond } from '@molecule/app-bond'
import { provider as charts } from '@molecule/app-charts'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker-default'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('charts', charts)
bond('calendar', calendar)
bond('date-range-picker', dateRangePicker)
bond('command-palette', commandPalette)
