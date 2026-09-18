import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('data-table', dataTable)
bond('date-range-picker', dateRangePicker)
bond('command-palette', commandPalette)
