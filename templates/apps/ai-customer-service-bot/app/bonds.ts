import { bond } from '@molecule/app-bond'
import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'
import { provider as aiCopilot } from '@molecule/app-ai-copilot-default'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as realtime } from '@molecule/app-realtime-socketio'

bond('ai-assistant', aiAssistant)
bond('ai-copilot', aiCopilot)
bond('data-table', dataTable)
bond('realtime', realtime)
