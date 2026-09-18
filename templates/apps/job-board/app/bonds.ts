import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
bond('file-upload', fileUpload)
bond('command-palette', commandPalette)
bond('i18n', i18n)
