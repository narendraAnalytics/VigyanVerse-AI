// Timed quizzes (owner 2026-11-16): begin_quiz_timer() sets the start and the limit (60 s per
// MCQ, 120 s per numerical); answer-evaluate decides with this whether a submission was late.
// The app submits by itself when the clock reaches 0, so a short grace covers the network.

export const GRACE_SECONDS = 30;

export interface TimerRow { timer_started_at: string | null; time_limit_seconds: number | null }

/** Seconds from the timer start to `now`, and whether that is past the limit plus grace. Null for untimed quizzes. */
export function timing(row: TimerRow, now: Date = new Date()): { timeTakenSeconds: number; overtime: boolean } | null {
  if (!row.timer_started_at || !row.time_limit_seconds) return null;
  const taken = Math.max(0, Math.round((now.getTime() - new Date(row.timer_started_at).getTime()) / 1000));
  return { timeTakenSeconds: taken, overtime: taken > row.time_limit_seconds + GRACE_SECONDS };
}
