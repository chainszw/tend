export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 10;

export interface LockState {
  failed_attempts: number;
  locked_until: string | null;
}

/** True when the circle is currently locked after too many wrong passcodes. */
export function isLocked(state: LockState, now: Date): boolean {
  return state.locked_until !== null && new Date(state.locked_until) > now;
}

/** Whole minutes left on a lock, rounded up, or 0 when not locked. */
export function minutesUntilUnlock(state: LockState, now: Date): number {
  if (!isLocked(state, now) || state.locked_until === null) return 0;
  const ms = new Date(state.locked_until).getTime() - now.getTime();
  return Math.max(1, Math.ceil(ms / 60_000));
}

/** Next lock state after a wrong passcode. Locks once the limit is reached. */
export function registerFailure(state: LockState, now: Date): LockState {
  const attempts = state.failed_attempts + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    const until = new Date(now.getTime() + LOCKOUT_MINUTES * 60_000);
    return { failed_attempts: 0, locked_until: until.toISOString() };
  }
  return { failed_attempts: attempts, locked_until: null };
}
