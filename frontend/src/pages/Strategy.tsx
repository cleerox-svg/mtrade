import {
  CSSProperties,
  Fragment,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import GlassCard from '../components/ui/GlassCard';
import Toggle from '../components/ui/Toggle';

// ─────────────────────────── Types ───────────────────────────

interface StrategyConfig {
  trade_london_sweep: number;
  trade_ny_sweep: number;
  fvg_scan_1h: number;
  fvg_scan_4h: number;
  continuation_require_ifvg: number;
  min_rr: number;
  sweep_require_close: number;
  min_confidence: number;
  max_contracts_override: number | null;
  default_contracts: number;
  kill_switch: number;
  kill_switch_date: string | null;
  active_preset: string;
}

interface SetupStats {
  total_setups?: number;
  won?: number;
  lost?: number;
  setup_win_rate?: number;
  per_phase_win_rate?: Record<string, number>;
}

interface ActiveSetup {
  id: number;
  phase: number;
  status: string;
}

interface ActiveSetupsResponse {
  setups: ActiveSetup[];
}

type ToastKind = 'success' | 'error' | 'warning';
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

// ─────────────────────────── Phase definitions ───────────────────────────

type Tone = 'amber' | 'red' | 'muted';

interface PhaseDef {
  num: number;
  name: string;
  cologne: string;
  tone: Tone;
  lookingFor: string;
  advanceTo?: string;
}

const PHASES: PhaseDef[] = [
  {
    num: 0,
    name: 'London Range',
    cologne: 'SILLAGE',
    tone: 'muted',
    lookingFor:
      'Establishes the London session high and low. Watches price build a tight range before directional intent reveals itself.',
    advanceTo: 'Price breaks London H/L',
  },
  {
    num: 1,
    name: 'Liquidity Sweep',
    cologne: 'TOP NOTE',
    tone: 'amber',
    lookingFor:
      'Price takes out the London range high or low, sweeping resting liquidity before rotating back inside.',
    advanceTo: 'Candle closes beyond swing H/L',
  },
  {
    num: 2,
    name: 'Break of Structure',
    cologne: 'HEART NOTE',
    tone: 'amber',
    lookingFor:
      'Confirms the shift: a close through the most recent opposing swing, signalling displacement in the new direction.',
    advanceTo: 'FVG forms in direction',
  },
  {
    num: 3,
    name: 'Fair Value Gap',
    cologne: 'BASE NOTE',
    tone: 'amber',
    lookingFor:
      'Scans 1H and 4H for a fresh FVG aligned with the BOS. The gap becomes the retracement target.',
    advanceTo: 'Price retraces into FVG',
  },
  {
    num: 4,
    name: 'IFVG / Entry Setup',
    cologne: 'ACCORD',
    tone: 'red',
    lookingFor:
      'Waits for price to inverse the FVG (IFVG) or tap it cleanly. Validates R:R and AI confidence before arming.',
    advanceTo: 'Trigger fires · entry live',
  },
  {
    num: 5,
    name: 'Execute & Manage',
    cologne: 'DRY DOWN',
    tone: 'red',
    lookingFor:
      'Position is live. Engine tracks stop, partials, and target until the setup resolves as win, loss, or expired.',
  },
];

function toneColor(tone: Tone): string {
  if (tone === 'red') return 'var(--red)';
  if (tone === 'amber') return 'var(--amber)';
  return 'var(--muted)';
}

function toneGlow(tone: Tone): string {
  if (tone === 'red') return 'rgba(251,44,90,0.18)';
  if (tone === 'amber') return 'rgba(251,191,36,0.15)';
  return 'rgba(148,163,184,0.08)';
}

// ─────────────────────────── Hooks ───────────────────────────

function useMediaMin(minWidthPx: number): boolean {
  const [match, setMatch] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia(`(min-width: ${minWidthPx}px)`).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidthPx}px)`);
    const onChange = (e: MediaQueryListEvent) => setMatch(e.matches);
    mq.addEventListener('change', onChange);
    setMatch(mq.matches);
    return () => mq.removeEventListener('change', onChange);
  }, [minWidthPx]);
  return match;
}

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);
  return { toasts, push };
}

// ─────────────────────────── Shared styles ───────────────────────────

const animationsCss = `
@keyframes mtrade-flow-v {
  0% { transform: translateY(-6px); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateY(calc(100% + 6px)); opacity: 0; }
}
@keyframes mtrade-flow-h {
  0% { transform: translateX(-6px); opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { transform: translateX(calc(100% + 6px)); opacity: 0; }
}
@keyframes mtrade-soft-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(251,191,36,0); }
  50% { box-shadow: 0 0 14px rgba(251,191,36,0.35); }
}
`;

function numberInputStyle(): CSSProperties {
  return {
    background: '#0a0a10',
    color: 'var(--bright)',
    border: '1px solid var(--glass-border)',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 13,
    fontFamily: '"JetBrains Mono", monospace',
    outline: 'none',
    width: 80,
    textAlign: 'right',
    boxSizing: 'border-box',
  };
}

function segLabelStyle(): CSSProperties {
  return {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--red-soft)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    marginBottom: 10,
  };
}

// ─────────────────────────── Summary ───────────────────────────

function StrategySummary() {
  const rowStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 12,
    color: 'var(--label)',
    letterSpacing: '0.04em',
  };
  return (
    <GlassCard title="◆ STRATEGY OVERVIEW">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--bright)',
            letterSpacing: '0.02em',
          }}
        >
          NQ · ICT London Sweep → BOS → FVG → IFVG → Entry
        </div>
        <div style={rowStyle}>
          50K Advanced · Target{' '}
          <span style={{ color: 'var(--green)' }}>$4,000</span> · MLL{' '}
          <span style={{ color: 'var(--red)' }}>$1,750</span>
        </div>
        <div style={rowStyle}>
          Sessions: London + NY · Timeframes: 1H/4H · Continuation: IFVG
          preferred
        </div>
      </div>
    </GlassCard>
  );
}

// ─────────────────────────── Flowchart ───────────────────────────

type PhaseState = 'completed' | 'active' | 'pending';

function phaseStateFor(phaseNum: number, currentPhase: number | null): PhaseState {
  if (currentPhase == null) return 'pending';
  if (phaseNum < currentPhase) return 'completed';
  if (phaseNum === currentPhase) return 'active';
  return 'pending';
}

function PhaseNode({
  phase,
  state,
  config,
  winRate,
  horizontal,
}: {
  phase: PhaseDef;
  state: PhaseState;
  config: StrategyConfig | null;
  winRate: string;
  horizontal: boolean;
}) {
  const border =
    state === 'completed'
      ? 'var(--green)'
      : state === 'active'
        ? 'var(--amber)'
        : 'var(--glass-border)';
  const leftBorderWidth = state === 'pending' ? 1 : 3;
  const tone = toneColor(phase.tone);

  const cardStyle: CSSProperties = {
    position: 'relative',
    background: 'var(--bg-card)',
    border: '1px solid var(--glass-border)',
    borderLeft: `${leftBorderWidth}px solid ${border}`,
    borderRadius: 14,
    padding: '14px 14px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: horizontal ? 220 : undefined,
    boxShadow:
      state === 'active'
        ? `0 0 18px ${toneGlow(phase.tone)}`
        : '0 2px 14px rgba(0,0,0,0.25)',
    animation:
      state === 'active' ? 'mtrade-soft-pulse 2.4s ease-in-out infinite' : 'none',
    opacity: state === 'pending' ? 0.78 : 1,
    transition: 'border-color 0.25s, box-shadow 0.25s, opacity 0.25s',
  };

  const headStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  };

  const phaseTitle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--bright)',
    letterSpacing: '0.01em',
  };

  const cologneStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 10,
    fontWeight: 700,
    color: tone,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    padding: '2px 6px',
    border: `1px solid ${tone}`,
    borderRadius: 999,
    whiteSpace: 'nowrap',
  };

  const descStyle: CSSProperties = {
    fontFamily: 'Outfit, sans-serif',
    fontSize: 12,
    color: 'var(--label)',
    lineHeight: 1.5,
  };

  const settingsRow: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 10px',
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    color: 'var(--muted)',
    borderTop: '1px dashed var(--glass-border)',
    paddingTop: 8,
    marginTop: 2,
  };

  const statStyle: CSSProperties = {
    fontFamily: '"JetBrains Mono", monospace',
    fontSize: 11,
    color: state === 'completed' ? 'var(--green)' : 'var(--label)',
    letterSpacing: '0.04em',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const stateTag =
    state === 'completed'
      ? { label: 'DONE', color: 'var(--green)' }
      : state === 'active'
        ? { label: 'LIVE', color: 'var(--amber)' }
        : { label: 'IDLE', color: 'var(--muted)' };

  const settingChips = phaseSettingChips(phase.num, config);

  return (
    <div style={cardStyle}>
      <div style={headStyle}>
        <span style={phaseTitle}>
          Phase {phase.num} — {phase.name}
        </span>
        <span style={cologneStyle}>{phase.cologne}</span>
      </div>

      <div style={descStyle}>{phase.lookingFor}</div>

      {settingChips.length > 0 && (
        <div style={settingsRow}>
          {settingChips.map((c) => (
            <span key={c.key}>
              <span style={{ color: 'var(--muted)' }}>{c.key}: </span>
              <span style={{ color: 'var(--bright)' }}>{c.value}</span>
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 'auto',
          paddingTop: 6,
        }}
      >
        <span style={statStyle}>Win rate · {winRate}</span>
        <span
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            letterSpacing: '0.2em',
            color: stateTag.color,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: 4,
            border: `1px solid ${stateTag.color}`,
          }}
        >
          {stateTag.label}
        </span>
      </div>
    </div>
  );
}

function phaseSettingChips(
  phaseNum: number,
  config: StrategyConfig | null,
): { key: string; value: string }[] {
  if (!config) return [];
  const onOff = (v: number) => (v === 1 ? 'Yes' : 'No');
  switch (phaseNum) {
    case 0:
      return [
        { key: 'London sweeps', value: onOff(config.trade_london_sweep) },
        { key: 'NY sweeps', value: onOff(config.trade_ny_sweep) },
      ];
    case 1:
      return [
        { key: 'Require close', value: onOff(config.sweep_require_close) },
      ];
    case 2:
      return [{ key: 'BOS TF', value: '5m / 15m' }];
    case 3:
      return [
        { key: 'Scan 1H', value: onOff(config.fvg_scan_1h) },
        { key: 'Scan 4H', value: onOff(config.fvg_scan_4h) },
      ];
    case 4:
      return [
        { key: 'Min R:R', value: `1:${config.min_rr.toFixed(1)}` },
        {
          key: 'Require IFVG',
          value: onOff(config.continuation_require_ifvg),
        },
        { key: 'Min conf', value: `${config.min_confidence}` },
      ];
    case 5:
      return [
        { key: 'Default contracts', value: String(config.default_contracts) },
      ];
    default:
      return [];
  }
}

function Connector({
  label,
  horizontal,
}: {
  label: string;
  horizontal: boolean;
}) {
  const trackStyle: CSSProperties = horizontal
    ? {
        position: 'relative',
        flex: '0 0 28px',
        alignSelf: 'center',
        width: 28,
        height: 2,
        background:
          'linear-gradient(90deg, rgba(148,163,184,0.2), rgba(251,44,90,0.45), rgba(148,163,184,0.2))',
        margin: '0 6px',
        overflow: 'visible',
      }
    : {
        position: 'relative',
        alignSelf: 'center',
        width: 2,
        height: 28,
        background:
          'linear-gradient(180deg, rgba(148,163,184,0.2), rgba(251,44,90,0.45), rgba(148,163,184,0.2))',
        margin: '6px 0',
        overflow: 'visible',
      };

  const dotStyle: CSSProperties = {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 999,
    background: 'var(--red)',
    boxShadow: '0 0 8px var(--red)',
    animation: `${horizontal ? 'mtrade-flow-h' : 'mtrade-flow-v'} 2.2s linear infinite`,
  };

  const dotH: CSSProperties = { ...dotStyle, top: -2, left: 0 };
  const dotV: CSSProperties = { ...dotStyle, left: -2, top: 0 };

  const labelStyle: CSSProperties = horizontal
    ? {
        position: 'absolute',
        bottom: 'calc(100% + 6px)',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9,
        color: 'var(--red-soft)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        padding: '2px 6px',
        background: 'rgba(14,14,20,0.85)',
        border: '1px solid var(--glass-border)',
        borderRadius: 6,
      }
    : {
        position: 'absolute',
        left: 'calc(100% + 10px)',
        top: '50%',
        transform: 'translateY(-50%)',
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 10,
        color: 'var(--red-soft)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      };

  return (
    <div style={trackStyle} aria-hidden={false}>
      <span style={horizontal ? dotH : dotV} />
      <span style={labelStyle}>{label}</span>
    </div>
  );
}

function Flowchart({
  config,
  stats,
  currentPhase,
}: {
  config: StrategyConfig | null;
  stats: SetupStats | null;
  currentPhase: number | null;
}) {
  const horizontal = useMediaMin(1100);

  const winRateFor = (num: number): string => {
    const perPhase = stats?.per_phase_win_rate;
    if (perPhase && typeof perPhase[String(num)] === 'number') {
      return `${Math.round(perPhase[String(num)])}%`;
    }
    if (num === 4 && typeof stats?.setup_win_rate === 'number') {
      return `${Math.round(stats.setup_win_rate)}%`;
    }
    return '—';
  };

  const containerStyle: CSSProperties = horizontal
    ? {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 0,
        padding: '18px 4px 8px',
        overflowX: 'auto',
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        padding: '4px 0',
      };

  const nodeWrap: CSSProperties = horizontal
    ? { flex: '1 1 0', minWidth: 200 }
    : {};

  return (
    <GlassCard title="◆ SIGNAL FLOW">
      <div style={containerStyle}>
        {PHASES.map((phase, idx) => (
          <Fragment key={phase.num}>
            <div style={nodeWrap}>
              <PhaseNode
                phase={phase}
                state={phaseStateFor(phase.num, currentPhase)}
                config={config}
                winRate={winRateFor(phase.num)}
                horizontal={horizontal}
              />
            </div>
            {idx < PHASES.length - 1 && phase.advanceTo && (
              <Connector label={phase.advanceTo} horizontal={horizontal} />
            )}
          </Fragment>
        ))}
      </div>
    </GlassCard>
  );
}

// ─────────────────────────── Quick Settings ───────────────────────────

function PhaseSettingsPanel({
  phase,
  children,
}: {
  phase: PhaseDef;
  children: ReactNode;
}) {
  const tone = toneColor(phase.tone);
  return (
    <div
      style={{
        background: 'rgba(8,8,12,0.4)',
        border: '1px solid var(--glass-border)',
        borderLeft: `3px solid ${tone}`,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div style={segLabelStyle()}>
        Phase {phase.num} · {phase.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  control,
  sub,
}: {
  label: string;
  sub?: string;
  control: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '6px 0',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--bright)',
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 11,
              color: 'var(--muted)',
            }}
          >
            {sub}
          </span>
        )}
      </div>
      {control}
    </div>
  );
}

function QuickSettings({
  config,
  saveUpdate,
}: {
  config: StrategyConfig | null;
  saveUpdate: (updates: Partial<StrategyConfig>, debounceMs?: number) => void;
}) {
  const isDesktop = useMediaMin(820);

  if (!config) {
    return (
      <GlassCard title="◆ QUICK-EDIT PARAMETERS">
        <div
          className="skeleton-shimmer"
          style={{ height: 160, borderRadius: 10 }}
          aria-hidden="true"
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard title="◆ QUICK-EDIT PARAMETERS">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          gap: 12,
        }}
      >
        <PhaseSettingsPanel phase={PHASES[1]}>
          <SettingRow
            label="Sweep require close"
            sub="Candle must close beyond the range"
            control={
              <Toggle
                checked={config.sweep_require_close === 1}
                onChange={(v) =>
                  saveUpdate({ sweep_require_close: v ? 1 : 0 })
                }
              />
            }
          />
        </PhaseSettingsPanel>

        <PhaseSettingsPanel phase={PHASES[2]}>
          <SettingRow
            label="BOS timeframe"
            sub="Timeframe used to confirm break of structure"
            control={
              <SegmentedBosTf
                value="5m"
                onChange={() => {
                  /* no backend field yet — UI only */
                }}
              />
            }
          />
        </PhaseSettingsPanel>

        <PhaseSettingsPanel phase={PHASES[3]}>
          <SettingRow
            label="Scan 1H FVGs"
            control={
              <Toggle
                checked={config.fvg_scan_1h === 1}
                onChange={(v) => saveUpdate({ fvg_scan_1h: v ? 1 : 0 })}
              />
            }
          />
          <SettingRow
            label="Scan 4H FVGs"
            control={
              <Toggle
                checked={config.fvg_scan_4h === 1}
                onChange={(v) => saveUpdate({ fvg_scan_4h: v ? 1 : 0 })}
              />
            }
          />
        </PhaseSettingsPanel>

        <PhaseSettingsPanel phase={PHASES[4]}>
          <SettingRow
            label="Require IFVG"
            sub="Only fire on inverse FVG confirmation"
            control={
              <Toggle
                checked={config.continuation_require_ifvg === 1}
                onChange={(v) =>
                  saveUpdate({ continuation_require_ifvg: v ? 1 : 0 })
                }
              />
            }
          />
          <SettingRow
            label="Min R:R"
            control={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  max={10}
                  value={config.min_rr}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!Number.isNaN(v) && v >= 1 && v <= 10) {
                      saveUpdate({ min_rr: v }, 500);
                    }
                  }}
                  style={numberInputStyle()}
                />
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                    color: 'var(--muted)',
                    minWidth: 40,
                  }}
                >
                  1:{config.min_rr.toFixed(1)}
                </span>
              </div>
            }
          />
          <SettingRow
            label="Min confidence"
            control={
              <input
                type="number"
                step={5}
                min={0}
                max={100}
                value={config.min_confidence}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 0 && v <= 100) {
                    saveUpdate({ min_confidence: v }, 500);
                  }
                }}
                style={numberInputStyle()}
              />
            }
          />
        </PhaseSettingsPanel>

        <PhaseSettingsPanel phase={PHASES[5]}>
          <SettingRow
            label="Default contracts"
            sub="Size used when no override is set"
            control={
              <input
                type="number"
                step={1}
                min={1}
                max={10}
                value={config.default_contracts}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v >= 1 && v <= 10) {
                    saveUpdate({ default_contracts: v }, 500);
                  }
                }}
                style={numberInputStyle()}
              />
            }
          />
        </PhaseSettingsPanel>
      </div>
    </GlassCard>
  );
}

function SegmentedBosTf({
  value,
  onChange,
}: {
  value: '5m' | '15m';
  onChange: (v: '5m' | '15m') => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'rgba(8,8,12,0.6)',
        border: '1px solid var(--glass-border)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {(['5m', '15m'] as const).map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              background: active ? 'rgba(251,44,90,0.14)' : 'transparent',
              color: active ? 'var(--red)' : 'var(--label)',
              border: active
                ? '1px solid rgba(251,44,90,0.4)'
                : '1px solid transparent',
              borderRadius: 6,
              padding: '4px 10px',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
            aria-pressed={active}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Toasts ───────────────────────────

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => {
        const color =
          t.kind === 'success'
            ? 'var(--green)'
            : t.kind === 'warning'
              ? 'var(--amber)'
              : 'var(--danger)';
        return (
          <div
            key={t.id}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(14,14,20,0.95)',
              border: `1px solid ${color}`,
              color,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              letterSpacing: '0.05em',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            {t.message}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Page ───────────────────────────

export default function Strategy() {
  const [config, setConfig] = useState<StrategyConfig | null>(null);
  const [stats, setStats] = useState<SetupStats | null>(null);
  const [currentPhase, setCurrentPhase] = useState<number | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const { toasts, push } = useToasts();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/strategy/config', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('fail');
        return r.json() as Promise<StrategyConfig>;
      })
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) setConfigError('Failed to load strategy config');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats/setups', { credentials: 'same-origin' })
      .then((r) => (r.ok ? (r.json() as Promise<SetupStats>) : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {
        /* silent — shows dashes */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch('/api/setups/active', { credentials: 'same-origin' })
        .then((r) => (r.ok ? (r.json() as Promise<ActiveSetupsResponse>) : null))
        .then((data) => {
          if (cancelled) return;
          if (data && Array.isArray(data.setups) && data.setups.length > 0) {
            const top = data.setups.reduce((max, s) => {
              const p = typeof s.phase === 'number' ? s.phase : 0;
              return p > max ? p : max;
            }, 0);
            setCurrentPhase(top);
          } else {
            setCurrentPhase(null);
          }
        })
        .catch(() => {
          /* silent */
        });
    };
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const saveUpdate = useCallback(
    (updates: Partial<StrategyConfig>, debounceMs = 0) => {
      setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      const doFetch = () => {
        fetch('/api/strategy/config', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        })
          .then((r) => {
            if (!r.ok) throw new Error('fail');
            return r.json() as Promise<StrategyConfig>;
          })
          .then((updated) => {
            setConfig(updated);
            push('\u2713 Saved', 'success');
          })
          .catch(() => push('\u2717 Save failed', 'error'));
      };
      if (debounceMs > 0) {
        debounceRef.current = window.setTimeout(doFetch, debounceMs);
      } else {
        doFetch();
      }
    },
    [push],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 1200,
      }}
    >
      <style>{animationsCss}</style>

      <h1
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--bright)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        My Strategy
      </h1>

      <StrategySummary />

      {configError && (
        <div style={{ color: 'var(--danger)', fontSize: 12 }}>{configError}</div>
      )}

      <Flowchart
        config={config}
        stats={stats}
        currentPhase={currentPhase}
      />

      <QuickSettings config={config} saveUpdate={saveUpdate} />

      <ToastStack toasts={toasts} />
    </div>
  );
}
