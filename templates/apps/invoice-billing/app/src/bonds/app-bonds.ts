import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker-default'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('data-table', dataTable)
bond('date-range-picker', dateRangePicker)
bond('virtual-scroll', virtualScroll)
