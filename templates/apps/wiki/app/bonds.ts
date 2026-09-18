import { bond } from '@molecule/app-bond'
import { provider as markdown } from '@molecule/app-markdown'
import { provider as treeView } from '@molecule/app-tree-view'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('markdown', markdown)
bond('tree-view', treeView)
bond('i18n', i18n)
