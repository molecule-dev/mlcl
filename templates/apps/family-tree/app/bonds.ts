import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as timeline } from '@molecule/app-timeline-default'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'

bond('data-table', dataTable)
bond('timeline', timeline)
bond('command-palette', commandPalette)
