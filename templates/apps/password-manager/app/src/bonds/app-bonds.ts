import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('virtual-scroll', virtualScroll)
