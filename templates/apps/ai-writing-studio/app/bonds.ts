import { bond } from '@molecule/app-bond'
import { provider as aiCopilot } from '@molecule/app-ai-copilot-default'
import { provider as aiImageGenerator } from '@molecule/app-ai-image-generator-default'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'
import { provider as richText } from '@molecule/app-rich-text-quill'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'

bond('ai-copilot', aiCopilot)
bond('ai-image-generator', aiImageGenerator)
bond('markdown', markdown)
bond('rich-text', richText)
bond('keyboard-shortcuts', keyboardShortcuts)
