import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('realtime', realtime)
bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
bond('command-palette', commandPalette)
