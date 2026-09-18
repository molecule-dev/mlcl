import { bond } from '@molecule/app-bond'
import { provider as dragDrop } from '@molecule/app-drag-drop-dndkit'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('drag-drop', dragDrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
