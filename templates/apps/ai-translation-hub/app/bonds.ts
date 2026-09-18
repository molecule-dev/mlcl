import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'

bond('data-table', dataTable)
bond('file-upload', fileUpload)
bond('ai-assistant', aiAssistant)
