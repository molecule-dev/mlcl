import { bond } from '@molecule/app-bond'
import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'
import { provider as codeEditor } from '@molecule/app-code-editor-monaco'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'

bond('ai-assistant', aiAssistant)
bond('code-editor', codeEditor)
bond('markdown', markdown)
bond('data-table', dataTable)
