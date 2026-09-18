import { bond } from '@molecule/app-bond'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('virtual-scroll', virtualScroll)
bond('file-upload', fileUpload)
bond('markdown', markdown)
bond('command-palette', commandPalette)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('realtime', realtime)
