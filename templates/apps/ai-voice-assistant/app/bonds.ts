import { bond } from '@molecule/app-bond'
import { provider as aiVoice } from '@molecule/app-ai-voice-default'
import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as timeline } from '@molecule/app-timeline-default'

bond('ai-voice', aiVoice)
bond('ai-assistant', aiAssistant)
bond('realtime', realtime)
bond('timeline', timeline)
