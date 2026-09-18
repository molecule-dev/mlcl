import { bond } from '@molecule/app-bond'
import { provider as richText } from '@molecule/app-rich-text-quill'
import { provider as aiCopilot } from '@molecule/app-ai-copilot-default'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'

bond('rich-text', richText)
bond('ai-copilot', aiCopilot)
bond('data-table', dataTable)
