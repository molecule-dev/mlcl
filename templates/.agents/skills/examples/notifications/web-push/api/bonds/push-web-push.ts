import { setProvider } from '@molecule/api-push-notifications'
import { provider } from '@molecule/api-push-notifications-web-push'

export function setupPushNotifications(): void {
  setProvider(provider)
}
