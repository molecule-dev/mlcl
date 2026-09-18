import { setProvider } from '@molecule/api-cron'
import { createProvider } from '@molecule/api-cron-bullmq'

export function setupCron(): void {
  setProvider(
    createProvider({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6379),
        password: process.env.REDIS_PASSWORD,
      },
    }),
  )
}
