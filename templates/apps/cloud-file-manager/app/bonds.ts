import { bond } from '@molecule/app-bond'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dragDrop } from '@molecule/app-drag-drop-dndkit'

bond('file-upload', fileUpload)
bond('virtual-scroll', virtualScroll)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('drag-drop', dragDrop)
