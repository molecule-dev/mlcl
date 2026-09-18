import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'
import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'

bond('ai-assistant', aiAssistant)
bond('file-upload', fileUpload)
bond('data-table', dataTable)
bond('markdown', markdown)
