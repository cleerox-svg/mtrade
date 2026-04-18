import { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/ui/GlassCard';
import StatCube from '../components/ui/StatCube';
import Gauge from '../components/ui/Gauge';
import Button from '../components/ui/Button';
import TradingViewChart from '../components/charts/TradingViewChart';
import StrategyChart, { StrategyAlertData } from '../components/charts/StrategyChart';
import PhaseTracker from '../components/signals/PhaseTracker';
import AlertOverlay from '../components/signals/AlertOverlay';
import AIAnalysis from '../components/ai/AIAnalysis';
import PnLLog from '../components/trading/PnLLog';
import TradeEntryModal from '../components/trading/TradeEntryModal';
import { useDashboard, AlphaAccount, Alert, PriceEntry } from '../hooks/useDashboard';

type Instrument = 'ES' | 'NQ' | 'MES' | 'MNQ';
const INSTRUMENTS: Instrument[] = ['ES', 'NQ', 'MES', 'MNQ'];

function priceSymbolFor(inst: Instrument): string {
  if (inst === 'MES') return 'ES';
  if (inst === 'MNQ') return 'NQ';
  return inst;
}

function formatUsd(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? '-' : sign}$${formatted}`;
}

function formatUsdCompact(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function Shimmer({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number | string;
  style?: CSSProperties;
}) {
  return (
    <div
      className="skeleton-shimmer"
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

function priceAgeMinutes(timestamp: string): number {
  const t = new Date(timestamp).getTime();
  if (Number.isNaN(t)) return 0;
  return (Date.now() - t) / 60000;
}

function LivePrice({
  price,
  instrument,
  loading,
}: {
  price: PriceEntry | null;
  instrument: Instrument;
  loading: boolean;
}) {
  const valueStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 36,
    fontWeight: 700,
    color: 'var(--white)',
    textShadow: '0 0 18px rgba(251,44,90,0.45)',
    lineHeight: 1.1,
  };

  const isPositive = price ? price.change_pct > 0 : false;
  const isNegative = price ? price.change_pct < 0 : false;

  const pillColor = isPositive
    ? 'var(--green)'
    : isNegative
      ? 'var(--danger)'
      : 'var(--muted)';
  const pillBg = isPositive
    ? 'rgba(52,211,153,0.12)'
    : isNegative
      ? 'rgba(239,68,68,0.14)'
      : 'rgba(255,255,255,0.04)';
  const pillBorder = isPositive
    ? 'rgba(52,211,153,0.35)'
    : isNegative
      ? 'rgba(239,68,68,0.4)'
      : 'var(--glass-border)';

  const pillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 999,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    fontWeight: 700,
    color: pillColor,
    backgroundColor: pillBg,
    border: `1px solid ${pillBorder}`,
    letterSpacing: '0.02em',
  };

  const age = price ? priceAgeMinutes(price.timestamp) : 0;
  const isDelayed = price ? age >= 5 : true;
  const statusColor = isDelayed ? 'var(--amber)' : 'var(--green)';
  const statusText = price
    ? isDelayed
      ? `DELAYED ${Math.max(15, Math.round(age))}M`
      : 'LIVE'
    : 'LOADING';

  const statusStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: statusColor,
    textTransform: 'uppercase',
  };

  const dotStyle: CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: 9999,
    background: statusColor,
    boxShadow: `0 0 6px ${statusColor}, 0 0 10px ${statusColor}`,
    display: 'inline-block',
  };

  const levelRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 20,
    marginTop: 12,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    color: 'var(--label)',
  };

  const levelLabelStyle: CSSProperties = {
    color: 'var(--muted)',
    marginRight: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  return (
    <GlassCard title="◆ LIVE PRICE" icon={null}>
      {loading && !price ? (
        <div>
          <Shimmer width={200} height={36} style={{ marginBottom: 10 }} />
          <Shimmer width={120} height={14} style={{ marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 16 }}>
            <Shimmer width={80} height={12} />
            <Shimmer width={80} height={12} />
            <Shimmer width={80} height={12} />
            <Shimmer width={80} height={12} />
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span style={valueStyle}>
              {price ? price.price.toFixed(2) : '—'}
            </span>
            {price && (
              <span style={pillStyle}>
                {price.change_pct > 0 ? '+' : ''}
                {price.change_pct.toFixed(2)}%
              </span>
            )}
            <span
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 11,
                color: 'var(--muted)',
                letterSpacing: '0.15em',
                marginLeft: 'auto',
              }}
            >
              {instrument}
            </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={statusStyle}>
              <span style={dotStyle} aria-hidden="true" />
              {statusText}
            </span>
          </div>
          <div style={levelRowStyle}>
            <span>
              <span style={levelLabelStyle}>LDN H</span>—
            </span>
            <span>
              <span style={levelLabelStyle}>LDN L</span>—
            </span>
            <span>
              <span style={levelLabelStyle}>NY H</span>—
            </span>
            <span>
              <span style={levelLabelStyle}>NY L</span>—
            </span>
          </div>
        </>
      )}
    </GlassCard>
  );
}

function AccountPill({
  account,
  active,
  onClick,
}: {
  account: AlphaAccount;
  active: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);

  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 999,
    fontFamily: 'Outfit, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition:
      'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease',
    backgroundColor: active
      ? 'rgba(251,44,90,0.14)'
      : hover
        ? 'rgba(255,255,255,0.04)'
        : 'transparent',
    border: `1px solid ${
      active ? 'rgba(251,44,90,0.55)' : 'var(--glass-border)'
    }`,
    color: active ? 'var(--red)' : 'var(--bright)',
    boxShadow: active
      ? '0 0 14px rgba(251,44,90,0.35), inset 0 0 8px rgba(251,44,90,0.08)'
      : 'none',
  };

  const typeStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: active ? 'var(--red-soft)' : 'var(--muted)',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={base}
      aria-pressed={active}
    >
      <span>{account.label}</span>
      <span style={typeStyle}>{account.account_type}</span>
    </button>
  );
}

function AccountSelector({
  accounts,
  loading,
  selectedId,
  onSelect,
}: {
  accounts: AlphaAccount[] | null;
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  if (loading && !accounts) {
    return (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Shimmer width={140} height={36} />
        <Shimmer width={140} height={36} />
        <Shimmer width={140} height={36} />
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontFamily: 'Outfit, sans-serif',
          fontSize: 13,
          color: 'var(--label)',
        }}
      >
        <span>No Alpha Futures accounts.</span>
        <Link
          to="/app/settings"
          style={{
            color: 'var(--red)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Create account in Settings →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {accounts.map((a) => (
        <AccountPill
          key={a.id}
          account={a}
          active={a.id === selectedId}
          onClick={() => onSelect(a.id)}
        />
      ))}
    </div>
  );
}

function InstrumentSelector({
  value,
  onChange,
}: {
  value: Instrument;
  onChange: (v: Instrument) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {INSTRUMENTS.map((sym) => {
        const active = sym === value;
        return (
          <Button
            key={sym}
            variant="secondary"
            size="sm"
            onClick={() => onChange(sym)}
            aria-pressed={active}
            style={
              active
                ? {
                    color: 'var(--red)',
                    borderColor: 'rgba(251,44,90,0.55)',
                    backgroundColor: 'rgba(251,44,90,0.1)',
                    boxShadow: '0 0 12px rgba(251,44,90,0.3)',
                  }
                : undefined
            }
          >
            {sym}
          </Button>
        );
      })}
    </div>
  );
}

function StatsSection({
  dashboard,
  loading,
}: {
  dashboard: ReturnType<typeof useDashboard>['dashboard'];
  loading: boolean;
}) {
  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
  };

  if (loading && !dashboard) {
    return (
      <div style={gridStyle} className="dashboard-stats-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} width="100%" height={78} />
        ))}
      </div>
    );
  }

  if (!dashboard) {
    return (
      <GlassCard>
        <div
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            color: 'var(--muted)',
            textAlign: 'center',
            padding: '16px 0',
          }}
        >
          No trades yet — log your first trade to see stats.
        </div>
      </GlassCard>
    );
  }

  const pnl = dashboard.total_pnl;
  const pnlColor = pnl > 0 ? 'var(--red)' : 'var(--muted)';
  const winRateColor =
    dashboard.win_rate >= 50 ? 'var(--red)' : 'var(--bright)';

  const pf = dashboard.profit_factor;
  const pfDisplay =
    Number.isFinite(pf) && pf !== null ? pf.toFixed(2) : '∞';

  const gripLocked = !dashboard.payout_checks.grip;
  const gripColor = gripLocked ? 'var(--red)' : 'var(--amber)';
  const gripValue = gripLocked ? 'LOCKED' : 'UNLOCKED';

  return (
    <div style={gridStyle} className="dashboard-stats-grid">
      <StatCube
        label="Balance"
        value={formatUsd(dashboard.balance)}
        color="var(--white)"
      />
      <StatCube
        label="P&L"
        value={formatUsd(pnl, { sign: true })}
        color={pnlColor}
      />
      <StatCube
        label="Win Rate"
        value={`${dashboard.win_rate}%`}
        color={winRateColor}
      />
      <StatCube label="Profit Factor" value={pfDisplay} color="var(--bright)" />
      <StatCube
        label="Best Day"
        value={formatUsd(dashboard.best_day, { sign: true })}
        color="var(--red)"
      />
      <StatCube label="GRIP" value={gripValue} color={gripColor} />
    </div>
  );
}

function GaugesSection({
  dashboard,
  loading,
}: {
  dashboard: ReturnType<typeof useDashboard>['dashboard'];
  loading: boolean;
}) {
  if (loading && !dashboard) {
    return (
      <GlassCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Shimmer width="100%" height={24} />
          <Shimmer width="100%" height={24} />
          <Shimmer width="100%" height={24} />
        </div>
      </GlassCard>
    );
  }

  if (!dashboard) return null;

  const consistencyRatio = dashboard.consistency_applies
    ? Math.max(0, 100 - dashboard.consistency_pct)
    : 0;

  const drawdownUsed = dashboard.drawdown_used;
  const drawdownLimit = dashboard.drawdown_limit;

  const profitTarget = dashboard.profit_target;
  const profit = Math.max(0, dashboard.total_pnl);

  return (
    <GlassCard>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Gauge
          label="REV LIMIT · 50% MAX"
          value={consistencyRatio}
          max={50}
          warningAt={0.9}
          criticalAt={1}
          format={(v) => `${Math.round(v)}%`}
        />
        <Gauge
          label={`REDLINE · MLL ${drawdownLimit > 0 ? ((drawdownLimit / (dashboard.balance - dashboard.total_pnl || 1)) * 100).toFixed(1) : '0'}%`}
          value={drawdownUsed}
          max={drawdownLimit || 1}
          warningAt={0.7}
          criticalAt={0.85}
          format={(v, m) => `${formatUsdCompact(v)} / ${formatUsdCompact(m)}`}
        />
        <Gauge
          label={`BOOST · ${formatUsdCompact(profitTarget)} TARGET`}
          value={profit}
          max={profitTarget || 1}
          format={(v, m) => `${formatUsdCompact(v)} / ${formatUsdCompact(m)}`}
        />
      </div>
    </GlassCard>
  );
}

function PayoutDot({ passed, label }: { passed: boolean; label: string }) {
  const color = passed ? 'var(--green)' : 'var(--subtle)';
  const glow = passed ? '0 0 8px var(--green), 0 0 14px rgba(52,211,153,0.5)' : 'none';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        color: passed ? 'var(--bright)' : 'var(--muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 9999,
          background: color,
          boxShadow: glow,
          display: 'inline-block',
        }}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}

function PayoutStatus({
  dashboard,
  account,
  loading,
}: {
  dashboard: ReturnType<typeof useDashboard>['dashboard'];
  account: AlphaAccount | undefined;
  loading: boolean;
}) {
  if (loading && !dashboard) {
    return (
      <GlassCard title="◆ PAYOUT STATUS">
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Shimmer width={110} height={14} />
          <Shimmer width={110} height={14} />
          <Shimmer width={110} height={14} />
        </div>
      </GlassCard>
    );
  }

  if (!dashboard || !account) return null;

  const isAdvanced = account.account_type === 'advanced';
  const winDaysPassed = dashboard.winning_days_count >= 5;
  const minPayoutPassed = dashboard.payout_checks.min_payout;
  const consistencyPassed = dashboard.payout_checks.consistency;

  return (
    <GlassCard title="◆ PAYOUT STATUS">
      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {isAdvanced ? (
          <>
            <PayoutDot
              passed={winDaysPassed}
              label={`${dashboard.winning_days_count}/5 Win Days`}
            />
            <PayoutDot passed={minPayoutPassed} label="Min $1,000" />
          </>
        ) : (
          <>
            <PayoutDot
              passed={consistencyPassed}
              label={`Consistency ${dashboard.consistency_pct}%`}
            />
            <PayoutDot
              passed={winDaysPassed}
              label={`${dashboard.winning_days_count}/5 Win Days`}
            />
            <PayoutDot passed={minPayoutPassed} label="Min $200" />
          </>
        )}
        <PayoutDot
          passed={dashboard.payout_checks.grip}
          label={`GRIP · ${formatUsdCompact(dashboard.profit_target)}`}
        />
      </div>
    </GlassCard>
  );
}

function useViewport() {
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

function ChartCard({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  };
  const titleStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--red-soft)',
  };
  const btnStyle: CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--glass-border)',
    color: 'var(--label)',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 6,
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    lineHeight: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  return (
    <GlassCard>
      <div style={headerStyle}>
        <span style={titleStyle}>{title}</span>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={expanded}
          aria-label={expanded ? 'Collapse chart' : 'Expand chart'}
          style={btnStyle}
        >
          {expanded ? '\u2921' : '\u2922'}
        </button>
      </div>
      {children}
    </GlassCard>
  );
}

function toStrategyAlert(alert: Alert | null): StrategyAlertData | null {
  if (!alert) return null;
  const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
  return {
    entry_price: numOrNull(alert.entry_price),
    target_price: numOrNull(alert.target_price),
    stop_price: numOrNull(alert.stop_price),
    bos_level: numOrNull(alert.bos_level),
    is_active: alert.is_active,
  };
}

function findAlertForSymbol(
  alerts: Alert[] | null,
  symbol: string,
): Alert | null {
  if (!alerts) return null;
  const active = alerts.filter((a) => a.is_active === 1);
  const match = active.find((a) => a.symbol === symbol);
  return match ?? active[0] ?? null;
}

export default function Dashboard() {
  const {
    price,
    accounts,
    selectedAccount,
    setSelectedAccount,
    dashboard,
    alerts,
    loading,
    refetch,
  } = useDashboard();
  const [instrument, setInstrument] = useState<Instrument>('NQ');
  const [tvExpanded, setTvExpanded] = useState(false);
  const [stratExpanded, setStratExpanded] = useState(false);
  const [pnlLogVersion, setPnlLogVersion] = useState(0);
  const viewportWidth = useViewport();
  const isDesktop = viewportWidth >= 1024;

  useEffect(() => {
    setPnlLogVersion((v) => v + 1);
  }, [dashboard]);

  const selectedAccountData = accounts?.find((a) => a.id === selectedAccount);
  const priceEntry = price ? price[priceSymbolFor(instrument)] ?? null : null;
  const strategyAlert = toStrategyAlert(
    findAlertForSymbol(alerts, priceSymbolFor(instrument)),
  );

  const tvHeight = tvExpanded ? 500 : isDesktop ? 400 : 320;
  const stratHeight = stratExpanded ? 450 : isDesktop ? 360 : 260;

  const sectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const controlRowStyle: CSSProperties = {
    display: 'flex',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: isDesktop ? '60fr 40fr' : '1fr',
    gap: 16,
    alignItems: 'start',
  };

  const columnStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    minWidth: 0,
  };

  const chartsColumn = (
    <div style={columnStyle}>
      <ChartCard
        title="◆ TRADINGVIEW"
        expanded={tvExpanded}
        onToggle={() => setTvExpanded((v) => !v)}
      >
        <TradingViewChart
          symbol={instrument}
          height={tvHeight}
          expanded={tvExpanded}
        />
      </ChartCard>
      <ChartCard
        title="◆ STRATEGY CHART"
        expanded={stratExpanded}
        onToggle={() => setStratExpanded((v) => !v)}
      >
        <StrategyChart
          instrument={instrument}
          height={stratHeight}
          expanded={stratExpanded}
          alertData={strategyAlert}
        />
      </ChartCard>
    </div>
  );

  const priceBlock = (
    <LivePrice price={priceEntry} instrument={instrument} loading={loading} />
  );

  const controlRow = (
    <div style={controlRowStyle}>
      <AccountSelector
        accounts={accounts}
        loading={loading}
        selectedId={selectedAccount}
        onSelect={setSelectedAccount}
      />
      <InstrumentSelector value={instrument} onChange={setInstrument} />
    </div>
  );

  const statsBlock = <StatsSection dashboard={dashboard} loading={loading} />;
  const gaugesBlock = <GaugesSection dashboard={dashboard} loading={loading} />;
  const payoutBlock = (
    <PayoutStatus
      dashboard={dashboard}
      account={selectedAccountData}
      loading={loading}
    />
  );
  const pnlLogBlock = (
    <PnLLog accountId={selectedAccount} refreshKey={pnlLogVersion} />
  );

  const sideColumn = (
    <div style={columnStyle}>
      {priceBlock}
      {controlRow}
      <PhaseTracker />
      <AIAnalysis />
      {statsBlock}
      {gaugesBlock}
      {pnlLogBlock}
      {payoutBlock}
    </div>
  );

  const mobileStack = (
    <div style={columnStyle}>
      {priceBlock}
      {controlRow}
      {chartsColumn}
      <PhaseTracker />
      <AIAnalysis />
      {statsBlock}
      {pnlLogBlock}
      {gaugesBlock}
      {payoutBlock}
    </div>
  );

  return (
    <div style={sectionStyle}>
      <style>{`
        @media (min-width: 640px) {
          .dashboard-stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
        @media (min-width: 1024px) {
          .dashboard-stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
        }
      `}</style>

      <AlertOverlay />

      {isDesktop ? (
        <div style={gridStyle}>
          {chartsColumn}
          {sideColumn}
        </div>
      ) : (
        mobileStack
      )}

      <TradeEntryModal accountId={selectedAccount} onLogged={refetch} />
    </div>
  );
}
