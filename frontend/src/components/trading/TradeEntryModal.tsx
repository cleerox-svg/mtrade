import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Button from '../ui/Button';

type Instrument = 'NQ' | 'ES';
type Direction = 'LONG' | 'SHORT';

const INSTRUMENT_META: Record<
  Instrument,
  { id: number; tickSize: number; tickValue: number }
> = {
  ES: { id: 1, tickSize: 0.25, tickValue: 12.5 },
  NQ: { id: 2, tickSize: 0.25, tickValue: 5.0 },
};

export interface TradeEntryModalProps {
  accountId: number | null;
  onLogged?: () => void;
}

function todayEtDate(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

function formatPnl(pnl: number): string {
  const abs = Math.abs(pnl);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = pnl >= 0 ? '+$' : '-$';
  return `${prefix}${formatted}`;
}

function useIsDesktop(breakpoint = 640): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= breakpoint : true,
  );
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isDesktop;
}

function FloatingButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const style: CSSProperties = {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: 'var(--red)',
    color: 'var(--white)',
    border: 'none',
    cursor: 'pointer',
    zIndex: 50,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: hover
      ? '0 0 28px rgba(251,44,90,0.7), 0 6px 16px rgba(0,0,0,0.4)'
      : '0 0 20px rgba(251,44,90,0.5), 0 4px 12px rgba(0,0,0,0.35)',
    transition: 'box-shadow 0.2s ease, transform 0.15s ease',
    transform: hover ? 'scale(1.05)' : 'scale(1)',
  };
  return (
    <button
      type="button"
      aria-label="Log trade"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={style}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}

function inputStyle(focused: boolean): CSSProperties {
  return {
    width: '100%',
    minHeight: 44,
    backgroundColor: '#0a0a10',
    border: `1px solid ${focused ? 'var(--red)' : 'var(--glass-border)'}`,
    borderRadius: 8,
    padding: 12,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 14,
    color: 'var(--bright)',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    boxShadow: focused ? '0 0 0 3px rgba(251,44,90,0.12)' : 'none',
  };
}

function StyledInput({
  id,
  value,
  onChange,
  type = 'text',
  step,
  min,
  inputMode,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string | number;
  min?: string | number;
  inputMode?:
    | 'text'
    | 'decimal'
    | 'numeric'
    | 'none'
    | 'tel'
    | 'search'
    | 'email'
    | 'url';
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={type}
      step={step}
      min={min}
      inputMode={inputMode}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={inputStyle(focused)}
    />
  );
}

function StyledTextarea({
  id,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...inputStyle(focused), minHeight: 44 * rows, resize: 'vertical' }}
    />
  );
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{
    value: T;
    label: string;
    activeBg?: string;
    activeBorder?: string;
    activeColor?: string;
  }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        const style: CSSProperties = {
          flex: 1,
          minHeight: 44,
          padding: '0 14px',
          borderRadius: 8,
          fontFamily: 'Outfit, sans-serif',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          transition:
            'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
          backgroundColor: active
            ? (opt.activeBg ?? 'rgba(251,44,90,0.1)')
            : 'transparent',
          border: `1px solid ${
            active
              ? (opt.activeBorder ?? 'rgba(251,44,90,0.45)')
              : 'var(--glass-border)'
          }`,
          color: active
            ? (opt.activeColor ?? 'var(--red)')
            : 'var(--label)',
        };
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            style={style}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const style: CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'transparent',
    border: '1px solid var(--glass-border)',
    color: hover ? 'var(--bright)' : 'var(--label)',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s ease, border-color 0.15s ease',
  };
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={style}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}

function Label({ children }: { children: string }) {
  const style: CSSProperties = {
    display: 'block',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--label)',
    marginBottom: 6,
  };
  return <span style={style}>{children}</span>;
}

export default function TradeEntryModal({
  accountId,
  onLogged,
}: TradeEntryModalProps) {
  const [open, setOpen] = useState(false);
  const [instrument, setInstrument] = useState<Instrument>('NQ');
  const [direction, setDirection] = useState<Direction>('LONG');
  const [contracts, setContracts] = useState('1');
  const [entry, setEntry] = useState('');
  const [stop, setStop] = useState('');
  const [exit, setExit] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDesktop = useIsDesktop();

  const reset = useCallback(() => {
    setInstrument('NQ');
    setDirection('LONG');
    setContracts('1');
    setEntry('');
    setStop('');
    setExit('');
    setNotes('');
    setError(null);
    setSubmitting(false);
  }, []);

  const handleOpen = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setOpen(false);
  }, [submitting]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const pnl = useMemo<number | null>(() => {
    const entryN = parseFloat(entry);
    const exitN = parseFloat(exit);
    const contractsN = parseInt(contracts, 10);
    if (!Number.isFinite(entryN) || !Number.isFinite(exitN)) return null;
    if (!Number.isFinite(contractsN) || contractsN <= 0) return null;
    const meta = INSTRUMENT_META[instrument];
    const sign = direction === 'LONG' ? 1 : -1;
    return ((exitN - entryN) / meta.tickSize) * meta.tickValue * contractsN * sign;
  }, [entry, exit, contracts, instrument, direction]);

  const canSubmit =
    pnl !== null && accountId !== null && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || pnl === null || accountId === null) return;
    setSubmitting(true);
    setError(null);

    const meta = INSTRUMENT_META[instrument];
    const date = todayEtDate();
    const contractsN = parseInt(contracts, 10);
    const entryN = parseFloat(entry);
    const exitN = parseFloat(exit);
    const stopN = parseFloat(stop);

    const tradePayload: Record<string, unknown> = {
      instrument_id: meta.id,
      date,
      direction,
      contracts: contractsN,
      entry_price: entryN,
      exit_price: exitN,
      pnl,
      notes: notes || null,
    };
    if (Number.isFinite(stopN)) tradePayload.stop_price = stopN;

    try {
      const tradeRes = await fetch('/api/trade-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload),
        credentials: 'same-origin',
      });
      if (!tradeRes.ok) throw new Error(`trade-log ${tradeRes.status}`);

      const existing = await fetch(
        `/api/alpha/${accountId}/daily-pnl?days=30`,
        { credentials: 'same-origin' },
      )
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);

      let totalPnl = pnl;
      let tradesCount = 1;
      if (Array.isArray(existing)) {
        const today = existing.find(
          (row: { date: string }) => row.date === date,
        );
        if (today) {
          totalPnl = (today.pnl || 0) + pnl;
          tradesCount = (today.trades_count || today.trade_count || 0) + 1;
        }
      }

      const upsertRes = await fetch(`/api/alpha/${accountId}/daily-pnl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          pnl: totalPnl,
          trades_count: tradesCount,
          best_trade: pnl > 0 ? pnl : null,
          worst_trade: pnl < 0 ? pnl : null,
          notes: notes || null,
        }),
        credentials: 'same-origin',
      });
      if (!upsertRes.ok) throw new Error(`daily-pnl ${upsertRes.status}`);

      setOpen(false);
      reset();
      onLogged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log trade');
      setSubmitting(false);
    }
  }, [
    canSubmit,
    pnl,
    accountId,
    instrument,
    direction,
    contracts,
    entry,
    exit,
    stop,
    notes,
    reset,
    onLogged,
  ]);

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 50,
    display: 'flex',
    alignItems: isDesktop ? 'center' : 'flex-end',
    justifyContent: 'center',
    padding: isDesktop ? 24 : 0,
  };

  const sheetStyle: CSSProperties = {
    width: '100%',
    maxWidth: isDesktop ? 480 : '100%',
    maxHeight: isDesktop ? '90vh' : '92vh',
    overflowY: 'auto',
    backgroundColor: 'var(--bg-card)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid var(--glass-border)',
    borderRadius: isDesktop ? 16 : '16px 16px 0 0',
    padding: 20,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    animation: isDesktop
      ? 'mtrade-fade-in 0.18s ease'
      : 'mtrade-slide-up 0.22s ease',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  };

  const titleStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--bright)',
    letterSpacing: '0.02em',
  };

  const fieldStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 12,
  };

  const pnlValueStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 20,
    fontWeight: 700,
    color:
      pnl === null
        ? 'var(--muted)'
        : pnl >= 0
          ? 'var(--green)'
          : 'var(--danger)',
    padding: '10px 12px',
    backgroundColor: '#0a0a10',
    border: '1px solid var(--glass-border)',
    borderRadius: 8,
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
  };

  return (
    <>
      <style>{`
        @keyframes mtrade-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes mtrade-fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <FloatingButton onClick={handleOpen} />

      {open && (
        <div
          style={overlayStyle}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Log Trade"
        >
          <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
            <div style={headerStyle}>
              <span style={titleStyle}>LOG TRADE</span>
              <CloseButton onClick={handleClose} />
            </div>

            <div style={fieldStyle}>
              <Label>Instrument</Label>
              <ToggleGroup<Instrument>
                options={[
                  { value: 'NQ', label: 'NQ' },
                  { value: 'ES', label: 'ES' },
                ]}
                value={instrument}
                onChange={setInstrument}
              />
            </div>

            <div style={fieldStyle}>
              <Label>Direction</Label>
              <ToggleGroup<Direction>
                options={[
                  {
                    value: 'LONG',
                    label: 'LONG',
                    activeBg: 'rgba(52,211,153,0.12)',
                    activeBorder: 'rgba(52,211,153,0.5)',
                    activeColor: 'var(--green)',
                  },
                  {
                    value: 'SHORT',
                    label: 'SHORT',
                    activeBg: 'rgba(239,68,68,0.12)',
                    activeBorder: 'rgba(239,68,68,0.5)',
                    activeColor: 'var(--danger)',
                  },
                ]}
                value={direction}
                onChange={setDirection}
              />
            </div>

            <div style={fieldStyle}>
              <Label>Contracts</Label>
              <StyledInput
                id="tm-contracts"
                type="number"
                min={1}
                inputMode="numeric"
                value={contracts}
                onChange={setContracts}
              />
            </div>

            <div style={fieldStyle}>
              <Label>Entry Price</Label>
              <StyledInput
                id="tm-entry"
                type="number"
                step="0.25"
                inputMode="decimal"
                value={entry}
                onChange={setEntry}
              />
            </div>

            <div style={fieldStyle}>
              <Label>Stop Price</Label>
              <StyledInput
                id="tm-stop"
                type="number"
                step="0.25"
                inputMode="decimal"
                value={stop}
                onChange={setStop}
              />
            </div>

            <div style={fieldStyle}>
              <Label>Exit Price</Label>
              <StyledInput
                id="tm-exit"
                type="number"
                step="0.25"
                inputMode="decimal"
                value={exit}
                onChange={setExit}
              />
            </div>

            <div style={fieldStyle}>
              <Label>P&L</Label>
              <div style={pnlValueStyle} aria-live="polite">
                {pnl === null ? '—' : formatPnl(pnl)}
              </div>
            </div>

            <div style={fieldStyle}>
              <Label>Notes</Label>
              <StyledTextarea
                id="tm-notes"
                value={notes}
                onChange={setNotes}
                rows={3}
              />
            </div>

            {error && (
              <div
                style={{
                  color: 'var(--danger)',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                {error}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
              style={{ width: '100%' }}
            >
              LOG TRADE
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
