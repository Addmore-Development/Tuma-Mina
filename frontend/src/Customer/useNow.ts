import { useEffect, useState } from "react";

/**
 * Returns the current time in ms, refreshed on an interval.
 * Keeping this in one hook (rather than calling Date.now()/new Date() straight
 * in render) is what lets overdue checks stay accurate without ever reading the
 * clock directly inside a render or useMemo body.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
