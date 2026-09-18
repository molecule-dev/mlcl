import { bond } from '@molecule/app-bond'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as markdown } from '@molecule/app-markdown'

bond('drag-drop', dragDrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('file-upload', fileUpload)
bond('realtime', realtime)
bond('markdown', markdown)
