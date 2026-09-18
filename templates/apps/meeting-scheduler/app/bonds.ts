import { bond } from '@molecule/app-bond'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'
import { provider as dataTable } from '@molecule/app-data-table'

bond('calendar', calendar)
bond('date-range-picker', dateRangePicker)
bond('data-table', dataTable)
