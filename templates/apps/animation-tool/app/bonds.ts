import { bond } from '@molecule/app-bond'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as timeline } from '@molecule/app-timeline'
import { provider as treeView } from '@molecule/app-tree-view'
import { provider as fileUpload } from '@molecule/app-file-upload'

bond('drag-drop', dragDrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('timeline', timeline)
bond('tree-view', treeView)
bond('file-upload', fileUpload)
