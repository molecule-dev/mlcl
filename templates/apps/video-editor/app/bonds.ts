import { bond } from '@molecule/app-bond'
import { provider as dragDrop } from '@molecule/app-drag-drop'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as timeline } from '@molecule/app-timeline'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'

bond('drag-drop', dragDrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('file-upload', fileUpload)
bond('timeline', timeline)
bond('virtual-scroll', virtualScroll)
