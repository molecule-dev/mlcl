import { bond } from '@molecule/app-bond'
import { provider as kanban } from '@molecule/app-kanban'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'

bond('kanban', kanban)
bond('data-table', dataTable)
bond('calendar', calendar)
bond('drag-drop', dragDrop)
bond('realtime', realtime)
bond('command-palette', commandPalette)
bond('keyboard-shortcuts', keyboardShortcuts)
