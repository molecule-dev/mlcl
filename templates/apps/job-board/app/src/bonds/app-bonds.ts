import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
bond('file-upload', fileUpload)
bond('command-palette', commandPalette)
bond('i18n', i18n)
