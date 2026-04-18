import { CSSProperties, useEffect, useState } from 'react';
import GlassCard from '../ui/GlassCard';

interface PnLEntry {
  id?: number;
  alpha_account_id?: number;
  date: string;
  pnl: number;
  trades_count?: number;
  trade_count?: number;
  instrument?: string;
  best_trade?: number;
  worst_trade?: number;
  notes?: string;
}

export interface PnLLogProps {
  accountId: number | null;
  refreshKey?: number;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(pnl: number): string {
  const abs = Math.abs(pnl);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = pnl >= 0 ? '+$' : '-$';
  return `${prefix}${formatted}`;
}

export default function PnLLog({ accountId, refreshKey = 0 }: PnLLogProps) {
  const [rows, setRows] = useState<PnLEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accountId === null) {
      setRows(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/alpha/${accountId}/daily-pnl?days=30`, {
      credentials: 'same-origin',
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed: ${r.status}`);
        return r.json() as Promise<PnLEntry[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, refreshKey]);

  const listStyle: CSSProperties = {
    maxHeight: 300,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 2px',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  };

  const dateStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    color: 'var(--text)',
    minWidth: 56,
  };

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 7px',
    borderRadius: 999,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--red-soft)',
    backgroundColor: 'rgba(251,44,90,0.1)',
    border: '1px solid rgba(251,44,90,0.25)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  const tradesStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    color: 'var(--muted)',
  };

  const amountStyle = (positive: boolean): CSSProperties => ({
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 14,
    fontWeight: 700,
    color: positive ? 'var(--red)' : 'var(--label)',
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  });

  const emptyStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    fontStyle: 'italic',
    color: 'var(--muted)',
    textAlign: 'center',
    padding: '24px 0',
  };

  const isEmpty = !loading && (!rows || rows.length === 0);

  return (
    <GlassCard title="◧ DAILY P&L">
      {loading && !rows ? (
        <div style={emptyStyle}>Loading…</div>
      ) : isEmpty ? (
        <div style={emptyStyle}>No P&L entries yet</div>
      ) : (
        <div style={listStyle}>
          {rows!.map((r, i) => {
            const positive = r.pnl >= 0;
            const tradeCount = r.trades_count ?? r.trade_count ?? 0;
            const last = i === rows!.length - 1;
            return (
              <div
                key={`${r.date}-${i}`}
                style={last ? { ...rowStyle, borderBottom: 'none' } : rowStyle}
              >
                <span style={dateStyle}>{formatDate(r.date)}</span>
                {r.instrument && <span style={pillStyle}>{r.instrument}</span>}
                <span style={tradesStyle}>
                  {tradeCount} trade{tradeCount !== 1 ? 's' : ''}
                </span>
                <span style={amountStyle(positive)}>{formatAmount(r.pnl)}</span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
