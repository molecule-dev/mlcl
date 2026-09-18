import { bond } from '@molecule/app-bond'
import { provider as codeEditor } from '@molecule/app-code-editor-monaco'
import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'
import { provider as timeline } from '@molecule/app-timeline-default'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'

bond('code-editor', codeEditor)
bond('ai-assistant', aiAssistant)
bond('timeline', timeline)
bond('data-table', dataTable)
