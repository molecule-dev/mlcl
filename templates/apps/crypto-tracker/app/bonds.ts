import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'

bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
bond('date-range-picker', dateRangePicker)
