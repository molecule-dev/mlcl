import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as markdown } from '@molecule/app-markdown'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('data-table', dataTable)
bond('markdown', markdown)
bond('command-palette', commandPalette)
