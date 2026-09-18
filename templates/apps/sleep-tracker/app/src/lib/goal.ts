/**
 * Sleep goals (Settings → Sleep goals), persisted to localStorage on this device.
 *
 * The Settings page collects a duration goal (hours) plus bedtime/wake goals, but
 * they were pure local `useState` with no persistence, and the recovery ring was
 * fed a hardcoded 480 (8h) at every call site — so changing the goal did nothing.
 * This is the single source of truth: the ring reads `sleepGoalMinutes()`, and
 * Settings loads/saves the same blob.
 */

export interface SleepGoals {
  /** Nightly sleep-duration goal in hours (drives the recovery ring). */
  sleepGoalHours: number
  /** Target bedtime (HH:MM). */
  bedtimeGoal: string
  /** Target wake time (HH:MM). */
  wakeGoal: string
}

const STORAGE_KEY = 'sleep-tracker.goals'

export const DEFAULT_GOALS: SleepGoals = {
  sleepGoalHours: 8,
  bedtimeGoal: '22:30',
  wakeGoal: '06:30',
}

/** Parse a stored goals blob, filling any missing/invalid field with its default. */
export function parseSleepGoals(raw: string | null | undefined): SleepGoals {
  if (!raw) return { ...DEFAULT_GOALS }
  try {
    const p = JSON.parse(raw) as Partial<SleepGoals>
    const hours = Number(p.sleepGoalHours)
    return {
      sleepGoalHours: Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_GOALS.sleepGoalHours,
      bedtimeGoal: typeof p.bedtimeGoal === 'string' ? p.bedtimeGoal : DEFAULT_GOALS.bedtimeGoal,
      wakeGoal: typeof p.wakeGoal === 'string' ? p.wakeGoal : DEFAULT_GOALS.wakeGoal,
    }
  } catch (_error) {
    // corrupted localStorage value — fall back to defaults.
    return { ...DEFAULT_GOALS }
  }
}

/** Read the saved sleep goals (defaults off-DOM / on failure). */
export function loadSleepGoals(): SleepGoals {
  if (typeof window === 'undefined' || !window.localStorage) return { ...DEFAULT_GOALS }
  return parseSleepGoals(window.localStorage.getItem(STORAGE_KEY))
}

/** Persist the sleep goals (no-op when localStorage is unavailable). */
export function saveSleepGoals(goals: SleepGoals): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (_error) {
    // storage quota / private mode — ignore; state still reflects the UI.
  }
}

/** The saved duration goal expressed in minutes (what the recovery ring expects). */
export function sleepGoalMinutes(): number {
  return Math.round(loadSleepGoals().sleepGoalHours * 60)
}
