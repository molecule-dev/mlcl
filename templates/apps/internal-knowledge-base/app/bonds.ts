import { bond } from '@molecule/app-bond'
import { provider as markdown } from '@molecule/app-markdown'
import { provider as treeView } from '@molecule/app-tree-view'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'

bond('markdown', markdown)
bond('tree-view', treeView)
bond('data-table', dataTable)
bond('command-palette', commandPalette)
bond('keyboard-shortcuts', keyboardShortcuts)
