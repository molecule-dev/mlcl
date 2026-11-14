<script lang="ts">
  // Keep the shared guard: it holds the restore window that a hand-written
  // `!isAuthenticated` redirect mistakes for signed out, redirects only on
  // `status === 'unauthenticated'`, and lets `'unavailable'` render without
  // treating it as confirmed sign-in.
  //
  // Route shell: wrap the protected children in `<AuthGuard>`; in-page
  // section: `<AuthGuard><SignedInSection /></AuthGuard>`. For a custom
  // in-page check, hold only while `status === 'loading'`, and let
  // `'unavailable'` render without treating it as confirmed sign-in. The
  // root layout wires the bonded auth client, so on a public page a
  // signed-in action (Follow, Favorite) reads the restored user when
  // restoration succeeds. An unavailable session may still have a null user;
  // handle that status separately from sign-out.
  // Prefer router navigation to full-page loads so clicks do not restart
  // restore. Keep public sections outside the guard for signed-out visitors.
  import type { Snippet } from 'svelte'

  import { AuthGuard } from '@molecule/app-ui-svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<AuthGuard>
  {@render children?.()}
</AuthGuard>
