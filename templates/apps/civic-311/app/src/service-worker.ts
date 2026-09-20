/// <reference lib="webworker" />

import { setupDefaultServiceWorker } from '@molecule/app-service-worker-default'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

setupDefaultServiceWorker(self, self.__WB_MANIFEST)
