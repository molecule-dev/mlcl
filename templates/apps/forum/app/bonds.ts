import { bond } from '@molecule/app-bond'
import { provider as markdown } from '@molecule/app-markdown'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('markdown', markdown)
bond('virtual-scroll', virtualScroll)
bond('data-table', dataTable)
bond('i18n', i18n)
