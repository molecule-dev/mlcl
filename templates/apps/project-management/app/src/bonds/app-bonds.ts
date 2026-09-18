import { bond } from '@molecule/app-bond'
import { provider as calendar } from '@molecule/app-calendar-fullcalendar'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as dragDrop } from '@molecule/app-drag-drop-dndkit'
import { provider as kanban } from '@molecule/app-kanban-default'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('kanban', kanban)
bond('data-table', dataTable)
bond('calendar', calendar)
bond('drag-drop', dragDrop)
bond('realtime', realtime)
bond('command-palette', commandPalette)
bond('keyboard-shortcuts', keyboardShortcuts)
