import { bond } from '@molecule/app-bond'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('data-table', dataTable)
bond('calendar', calendar)
bond('virtual-scroll', virtualScroll)
bond('command-palette', commandPalette)
