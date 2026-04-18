import { useCallback, useEffect, useRef, useState } from 'react';

export interface PriceEntry {
  price: number;
  timestamp: string;
  change_pct: number;
}

export type PriceMap = Record<string, PriceEntry>;

export interface AlphaAccount {
  id: number;
  label: string;
  account_size: number;
  account_type: 'zero' | 'standard' | 'advanced' | string;
  drawdown_type: string;
  drawdown_limit: number;
  profit_target: number;
  max_contracts: number;
  scaling_limit: number;
  is_active?: number;
  created_at?: string;
}

export interface PayoutChecks {
  consistency: boolean;
  grip: boolean;
  min_payout: boolean;
}

export interface DashboardData {
  balance: number;
  total_pnl: number;
  best_day: number;
  worst_day: number;
  consistency_pct: number;
  consistency_limit: number | null;
  consistency_applies: boolean;
  drawdown_used: number;
  drawdown_limit: number;
  safety_net: number;
  profit_target: number;
  daily_loss_guard: number;
  daily_loss_guard_remaining: number;
  daily_loss_guard_hit: boolean;
  profit_split_pct: number;
  winning_days_count: number;
  max_payout: number;
  win_rate: number;
  profit_factor: number;
  trading_days: number;
  daily_pnl: Array<{ date: string; pnl: number }>;
  payout_eligible: boolean;
  blockers: string[];
  payout_checks: PayoutChecks;
}

export interface Alert {
  id: number;
  setup_id: number | null;
  instrument_id: number;
  symbol?: string;
  alert_type: string;
  phase?: string | null;
  message?: string | null;
  created_at: string;
  is_active: number;
  [key: string]: unknown;
}

export interface UseDashboardResult {
  price: PriceMap | null;
  accounts: AlphaAccount[] | null;
  selectedAccount: number | null;
  setSelectedAccount: (id: number | null) => void;
  dashboard: DashboardData | null;
  alerts: Alert[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const SELECTED_KEY = 'mtrade.dashboard.accountId';
const POLL_MS = 30_000;

function readStoredAccountId(): number | null {
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeStoredAccountId(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(SELECTED_KEY);
    else localStorage.setItem(SELECTED_KEY, String(id));
  } catch {
    // ignore
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Request failed ${res.status} for ${url}`);
  return (await res.json()) as T;
}

export function useDashboard(): UseDashboardResult {
  const [price, setPrice] = useState<PriceMap | null>(null);
  const [accounts, setAccounts] = useState<AlphaAccount[] | null>(null);
  const [selectedAccount, setSelectedAccountState] = useState<number | null>(
    () => readStoredAccountId(),
  );
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const selectedRef = useRef(selectedAccount);
  selectedRef.current = selectedAccount;

  const setSelectedAccount = useCallback((id: number | null) => {
    setSelectedAccountState(id);
    writeStoredAccountId(id);
  }, []);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const [priceData, accountsData, alertsData] = await Promise.all([
          fetchJson<PriceMap>('/api/market/price').catch(() => ({} as PriceMap)),
          fetchJson<AlphaAccount[]>('/api/alpha/accounts'),
          fetchJson<Alert[]>('/api/alerts/active').catch(() => [] as Alert[]),
        ]);
        if (cancelled) return;

        setPrice(priceData);
        setAccounts(accountsData);
        setAlerts(alertsData);

        let activeId = selectedRef.current;
        const exists =
          activeId !== null && accountsData.some((a) => a.id === activeId);
        if (!exists) {
          activeId = accountsData.length > 0 ? accountsData[0].id : null;
          setSelectedAccountState(activeId);
          writeStoredAccountId(activeId);
        }

        if (activeId !== null) {
          try {
            const dash = await fetchJson<DashboardData>(
              `/api/alpha/${activeId}/dashboard`,
            );
            if (!cancelled) setDashboard(dash);
          } catch {
            if (!cancelled) setDashboard(null);
          }
        } else {
          setDashboard(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setLoading(true);
    load();

    const intervalId = window.setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [tick, selectedAccount]);

  return {
    price,
    accounts,
    selectedAccount,
    setSelectedAccount,
    dashboard,
    alerts,
    loading,
    error,
    refetch,
  };
}
