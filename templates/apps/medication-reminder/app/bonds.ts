import { bond } from '@molecule/app-bond'
import { provider as charts } from '@molecule/app-charts'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('charts', charts)
bond('calendar', calendar)
bond('data-table', dataTable)
bond('command-palette', commandPalette)
