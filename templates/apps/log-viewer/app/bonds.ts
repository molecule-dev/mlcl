import { bond } from '@molecule/app-bond'
import { provider as dataTable } from '@molecule/app-data-table-tanstack'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll-tanstack'
import { provider as commandPalette } from '@molecule/app-command-palette-cmdk'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts-hotkeys'
import { provider as codeEditor } from '@molecule/app-code-editor-monaco'
import { provider as dateRangePicker } from '@molecule/app-date-range-picker-default'
import { provider as charts } from '@molecule/app-charts'

bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
bond('command-palette', commandPalette)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('code-editor', codeEditor)
bond('date-range-picker', dateRangePicker)
bond('charts', charts)
