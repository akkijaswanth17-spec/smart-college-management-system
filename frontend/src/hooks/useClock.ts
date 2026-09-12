import { useEffect, useState } from "react";

/** A live-ticking clock, for header widgets. */
export function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
