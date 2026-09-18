import { bond } from '@molecule/app-bond'
import { provider as markdown } from '@molecule/app-markdown'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'

bond('markdown', markdown)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
