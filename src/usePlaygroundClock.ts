import { useEffect, useRef, useState } from "react";
import { useProcedure, useSpacetimeDB } from "spacetimedb/react";
import { procedures } from "./module_bindings";
import {
  clockSample,
  estimatedServerMs,
  type ClockSample,
} from "./playgroundClock";

export function usePlaygroundClock() {
  const readClock = useProcedure(procedures.playgroundClock);
  const { isActive } = useSpacetimeDB();
  const sample = useRef<ClockSample>();
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    sample.current = undefined;
    setReady(false);
    if (!isActive) return;
    // Three bounded samples per connection/foreground return, never hot polling.
    void (async () => {
      for (let i = 0; i < 3; i++) {
        const sent = performance.now();
        try {
          const server = await readClock();
          if (cancelled) return;
          const next = clockSample(server, sent, performance.now());
          if (!sample.current || next.roundTrip < sample.current.roundTrip) {
            sample.current = next;
            setSlow(next.roundTrip > 500);
            setReady(true);
          }
        } catch {
          if (cancelled) return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, readClock, attempt]);
  useEffect(() => {
    const resume = () => {
      if (!document.hidden) setAttempt((n) => n + 1);
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, []);
  return {
    ready,
    slow,
    retry: () => setAttempt((n) => n + 1),
    now: () =>
      sample.current
        ? estimatedServerMs(sample.current, performance.now())
        : null,
  };
}
