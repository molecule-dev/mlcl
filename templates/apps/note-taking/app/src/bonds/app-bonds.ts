import { createProvider as createAiCopilotProvider } from '@molecule/app-ai-copilot-default'
import { bond } from '@molecule/app-bond'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as dragDrop } from '@molecule/app-drag-drop-dndkit'
import { provider as fileUpload } from '@molecule/app-file-upload-filepond'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as markdown } from '@molecule/app-markdown-react-markdown'
import { provider as realtime } from '@molecule/app-realtime-socketio'
import { provider as richText } from '@molecule/app-rich-text-quill'
import { provider as treeView } from '@molecule/app-tree-view-default'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'

const aiCopilot = createAiCopilotProvider()

bond('rich-text', richText)
bond('markdown', markdown)
bond('tree-view', treeView)
bond('drag-drop', dragDrop)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('virtual-scroll', virtualScroll)
bond('file-upload', fileUpload)
bond('realtime', realtime)
bond('ai-copilot', aiCopilot)
