/**
 * AppFileUploadFilepond bond setup
 *
 * Wires @molecule/app-file-upload-filepond to @molecule/app-file-upload
 */

import { setProvider } from '@molecule/app-file-upload'
import { provider } from '@molecule/app-file-upload-filepond'

export function setupAppFileUploadFilepond(): void {
  setProvider(provider)
}
