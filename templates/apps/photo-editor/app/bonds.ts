import { bond } from '@molecule/app-bond'
import { provider as imageCrop } from '@molecule/app-image-crop'
import { provider as fileUpload } from '@molecule/app-file-upload'
import { provider as gallery } from '@molecule/app-gallery'
import { provider as keyboardShortcuts } from '@molecule/app-keyboard-shortcuts'
import { provider as commandPalette } from '@molecule/app-command-palette'
import { provider as dataTable } from '@molecule/app-data-table'
import { provider as virtualScroll } from '@molecule/app-virtual-scroll'

bond('image-crop', imageCrop)
bond('file-upload', fileUpload)
bond('gallery', gallery)
bond('keyboard-shortcuts', keyboardShortcuts)
bond('command-palette', commandPalette)
bond('data-table', dataTable)
bond('virtual-scroll', virtualScroll)
