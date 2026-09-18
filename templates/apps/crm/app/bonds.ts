import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as kanban } from '@molecule/app-kanban'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('data-table', dataTable)
bond('calendar', calendar)
bond('kanban', kanban)
bond('command-palette', commandPalette)
