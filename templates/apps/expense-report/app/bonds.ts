import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker'

bond('data-table', dataTable)
bond('file-upload', fileUpload)
bond('date-range-picker', dateRangePicker)
