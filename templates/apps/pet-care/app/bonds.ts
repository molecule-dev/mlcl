import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as calendar } from '@molecule/app-calendar'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as gallery } from '@molecule/app-gallery'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('data-table', dataTable)
bond('calendar', calendar)
bond('file-upload', fileUpload)
bond('gallery', gallery)
bond('command-palette', commandPalette)
bond('i18n', i18n)
