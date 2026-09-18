import { bond } from '@molecule/app-bond'
import { provider as codeEditor } from '@molecule/app-code-editor-monaco'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('data-table', dataTable)
bond('code-editor', codeEditor)
bond('command-palette', commandPalette)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('virtual-scroll', virtualScroll)
