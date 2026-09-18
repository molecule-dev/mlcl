import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dragDrop } from '@molecule/app-drag-drop-dndkit'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('drag-drop', dragDrop)
bond('command-palette', commandPalette)
bond('realtime', realtime)
bond('keyboard-shortcuts', keyboardShortcuts)
