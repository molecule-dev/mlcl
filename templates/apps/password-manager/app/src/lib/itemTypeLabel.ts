/**
 * i18n-aware display labels for vault item types. Shared by ItemDetail
 * and Trash so the type→label mapping lives in one place.
 */
import type { TranslateFunction } from '@molecule/app-i18n'

const TYPE_LABELS: Record<string, { key: string; defaultLabel: string }> = {
  login: { key: 'itemType.login', defaultLabel: 'Login' },
  card: { key: 'itemType.card', defaultLabel: 'Credit Card' },
  identity: { key: 'itemType.identity', defaultLabel: 'Identity' },
  note: { key: 'itemType.note', defaultLabel: 'Secure Note' },
  api_key: { key: 'itemType.apiKey', defaultLabel: 'API Key' },
  ssh_key: { key: 'itemType.sshKey', defaultLabel: 'SSH Key' },
  wifi: { key: 'itemType.wifi', defaultLabel: 'Wi-Fi' },
}

/**
 * Translated label for a vault item `type` (falls back to Login for
 * unknown types).
 */
export function itemTypeLabel(t: TranslateFunction, type: string): string {
  const meta = TYPE_LABELS[type] ?? TYPE_LABELS.login
  return t(meta.key, {}, { defaultValue: meta.defaultLabel })
}
