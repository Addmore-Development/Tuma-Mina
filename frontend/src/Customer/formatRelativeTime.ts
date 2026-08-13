const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/**
 * Friendly relative time ("5m ago", "in 3h"), falling back to a plain date
 * once something is more than a week away in either direction. `now` is
 * passed in (from useNow()) rather than read here, so this stays pure.
 */
export function formatRelativeTime(iso: string, now: number): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const future = diff > 0;

  if (abs < 45_000) return future ? "in a few seconds" : "just now";
  if (abs < HOUR) {
    const m = Math.max(1, Math.round(abs / MINUTE));
    return future ? `in ${m}m` : `${m}m ago`;
  }
  if (abs < DAY) {
    const h = Math.round(abs / HOUR);
    return future ? `in ${h}h` : `${h}h ago`;
  }
  if (abs < 7 * DAY) {
    const d = Math.round(abs / DAY);
    return future ? `in ${d}d` : `${d}d ago`;
  }
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
