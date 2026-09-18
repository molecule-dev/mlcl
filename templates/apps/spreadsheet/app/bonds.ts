import { bond } from '@molecule/app-bond'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('virtual-scroll', virtualScroll)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('realtime', realtime)
