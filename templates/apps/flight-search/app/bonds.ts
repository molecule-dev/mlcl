import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as commandPalette } from '@molecule/app-command-palette'

bond('dataTable', dataTable)
bond('dateRangePicker', dateRangePicker)
bond('virtualScroll', virtualScroll)
bond('commandPalette', commandPalette)
