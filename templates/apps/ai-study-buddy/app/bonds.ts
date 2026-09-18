import { bond } from '@molecule/app-bond'
import { provider as stepper } from '@molecule/app-stepper-default'
import { provider as aiAssistant } from '@molecule/app-ai-assistant-default'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'

bond('stepper', stepper)
bond('ai-assistant', aiAssistant)
bond('markdown', markdown)
