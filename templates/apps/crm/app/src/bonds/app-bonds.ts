import { bond } from '@molecule/app-bond'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as kanban } from '@molecule/app-kanban-default'

bond('data-table', dataTable)
bond('calendar', calendar)
bond('kanban', kanban)
bond('command-palette', commandPalette)
