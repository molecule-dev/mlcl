import { useAuth } from '@molecule/app-react'

interface WithOauthData {
  oauthData?: Record<string, unknown>
}

/**
 * Resolve the saved `showBiasMeters` reading preference from a user record.
 *
 * The preference lives in `user.oauthData.preferences.showBiasMeters` (written by Settings) and
 * defaults to `true` (meters shown) when the user, the blob, or the key is absent — matching the
 * Settings default. Pure so it can be unit-tested without an auth provider.
 */
export function resolveShowBiasMeters(user: WithOauthData | null | undefined): boolean {
  const preferences = (
    user?.oauthData as { preferences?: { showBiasMeters?: boolean } } | undefined
  )?.preferences
  return preferences?.showBiasMeters ?? true
}

/**
 * Whether the compact bias meter should render in story lists, per the signed-in user's saved
 * preference. Read this in any page that renders `StoryListItem` and pass it through as `showBias`.
 */
export function useShowBiasMeters(): boolean {
  const { user } = useAuth<WithOauthData>()
  return resolveShowBiasMeters(user)
}
