import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as treeView } from '@molecule/app-tree-view'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('data-table', dataTable)
bond('tree-view', treeView)
bond('command-palette', commandPalette)
