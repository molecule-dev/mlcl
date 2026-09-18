import { bond } from '@molecule/app-bond'
import { provider as aiAssistant } from '@molecule/app-ai-assistant'
import { provider as copilot } from '@molecule/app-ai-copilot'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as i18n } from '@molecule/app-i18n-react-i18next'

bond('ai-assistant', aiAssistant)
bond('ai-copilot', copilot)
bond('data-table', dataTable)
bond('command-palette', commandPalette)
bond('i18n', i18n)
