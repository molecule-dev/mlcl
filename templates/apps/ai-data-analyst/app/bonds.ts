import { bond } from '@molecule/app-bond'
import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'

bond('ai-assistant', aiAssistant)
bond('data-table', dataTable)
bond('file-upload', fileUpload)
