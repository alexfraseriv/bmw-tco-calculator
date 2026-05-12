import { useEffect, useRef, useState } from "react";
import { decodeState, encodeState, type AppState } from "./urlState";

// Reads initial state from window.location, then keeps the URL in sync (via
// history.replaceState — no scroll, no extra navigation entries) whenever
// state changes. Debounced to avoid spamming history on every keystroke.
export function useUrlState(): [AppState, (next: AppState) => void] {
  const [state, setState] = useState<AppState>(() => {
    if (typeof window === "undefined") return decodeState("");
    return decodeState(window.location.search);
  });

  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const qs = encodeState(state);
      const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", url);
    }, 150);
    return () => window.clearTimeout(timer.current);
  }, [state]);

  return [state, setState];
}
