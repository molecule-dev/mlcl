import { bond } from '@molecule/app-bond'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as treeView } from '@molecule/app-tree-view'
import { provider as fileUpload } from '@molecule/app-file-upload'

bond('drag-drop', dragDrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('realtime', realtime)
bond('data-table', dataTable)
bond('tree-view', treeView)
bond('file-upload', fileUpload)
