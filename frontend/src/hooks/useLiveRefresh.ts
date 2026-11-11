import { useEffect, useState } from 'react';

export const LIVE_EVENT = 'levix:data-changed';

/**
 * Returns a counter that goes up every time the admin changes something on the store.
 * Put it in a data-loading effect's dependency list to re-fetch silently (0 = first load).
 */
export function useLiveRefresh(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener(LIVE_EVENT, on);
    return () => window.removeEventListener(LIVE_EVENT, on);
  }, []);
  return tick;
}
