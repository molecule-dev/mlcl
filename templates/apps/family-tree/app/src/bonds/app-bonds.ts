import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker-default'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as timeline } from '@molecule/app-timeline-default'

bond('data-table', dataTable)
bond('file-upload', fileUpload)
bond('timeline', timeline)
bond('date-range-picker', dateRangePicker)
bond('command-palette', commandPalette)
