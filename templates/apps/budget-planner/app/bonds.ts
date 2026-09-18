import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'

bond('data-table', dataTable)
bond('date-range-picker', dateRangePicker)
bond('virtual-scroll', virtualScroll)
