/**
 * STAGED DESIGN REFERENCE — READ ONLY (ADR-010 / RW-C02)
 * Captured from the Lovable project "Energy Watch", 2026-07-30.
 * Do NOT import into src/. Port destination: RW-E05. See lovable/MANIFEST.md.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSnapshot } from "@/lib/mock-energy";
import type { ConnectionStatus, EnergySnapshot } from "@/types/energy";

/**
 * The single data layer for the whole dashboard.
 *
 * Every live value in the UI flows through this hook. Components are
 * presentational and prop-driven; none of them fetch. To go live, replace the
 * `getSnapshot()` call below with the real P1 + Sungrow requests.
 *
 * PORT NOTE (Architecture.md, State Management & Polling): this implementation
 * is missing two behaviours the architecture mandates and must gain them before
 * live cutover —
 *   1. visibility gating: polling must pause on `document.hidden` (a 5s poll in
 *      a backgrounded WebView drains the phone), and
 *   2. real failure backoff: 5s → 60s on consecutive failures, replacing the
 *      random-drop simulation below.
 */

interface EnergyDataValue {
  /** Last known snapshot. Retained while stale/offline so the UI never blanks. */
  data: EnergySnapshot | null;
  /** True only on cold open, before the first payload lands. */
  isLoading: boolean;
  status: ConnectionStatus;
  /** Seconds since the retained snapshot was captured. */
  ageSeconds: number;
  lastUpdated: Date | null;
}

const EnergyDataContext = createContext<EnergyDataValue | null>(null);

const REALTIME_POLL_MS = 5000;
const STALE_AFTER_S = 12;
const OFFLINE_AFTER_S = 40;

export function EnergyDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<EnergySnapshot | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const failures = useRef(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = () => {
      if (!alive) return;
      // Mock transport: the network drops regularly in the field, so the mock
      // occasionally fails to exercise the stale + offline states.
      const drop = failures.current > 0 ? Math.random() < 0.55 : Math.random() < 0.06;
      if (drop) {
        failures.current += 1;
        return;
      }
      failures.current = 0;
      setData(getSnapshot());
      setLastUpdated(new Date());
    };

    const cold = setTimeout(poll, 1100);
    timer = setInterval(poll, REALTIME_POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      alive = false;
      clearTimeout(cold);
      if (timer) clearInterval(timer);
      clearInterval(tick);
    };
  }, []);

  const value = useMemo<EnergyDataValue>(() => {
    const ageSeconds = lastUpdated ? Math.max(0, Math.round((now - lastUpdated.getTime()) / 1000)) : 0;
    const status: ConnectionStatus =
      ageSeconds >= OFFLINE_AFTER_S ? "offline" : ageSeconds >= STALE_AFTER_S ? "stale" : "live";
    return {
      data,
      isLoading: data === null,
      status: data === null ? "live" : status,
      ageSeconds,
      lastUpdated,
    };
  }, [data, lastUpdated, now]);

  return <EnergyDataContext.Provider value={value}>{children}</EnergyDataContext.Provider>;
}

export function useEnergyData(): EnergyDataValue {
  const ctx = useContext(EnergyDataContext);
  if (!ctx) throw new Error("useEnergyData must be used inside <EnergyDataProvider>");
  return ctx;
}
