import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'

bond('data-table', dataTable)
bond('markdown', markdown)
bond('command-palette', commandPalette)
