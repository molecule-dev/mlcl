/**
 * Pick the next track to play from a queue: the head in order normally, or a random item when
 * shuffle is on. The player persists and highlights `is_shuffled` but always advanced strictly in
 * order — so the stored shuffle mode did nothing. This makes it actually change what plays next.
 * Returns the picked track plus the remaining queue (order preserved for the non-picked items).
 *
 * `rng` is injectable purely for deterministic tests; production uses Math.random.
 */
export function takeNext<T>(
  queue: T[],
  isShuffled: boolean,
  rng: () => number = Math.random,
): { next: T | undefined; rest: T[] } {
  if (queue.length === 0) return { next: undefined, rest: [] }
  const idx = isShuffled
    ? Math.min(queue.length - 1, Math.max(0, Math.floor(rng() * queue.length)))
    : 0
  return { next: queue[idx], rest: [...queue.slice(0, idx), ...queue.slice(idx + 1)] }
}
