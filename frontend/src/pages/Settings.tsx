import {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Toggle from '../components/ui/Toggle';

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

interface UserSettings {
  discord_webhook_url: string | null;
  discord_enabled: number;
  notify_sweep: number;
  notify_ready: number;
  notify_execute: number;
  notify_drawdown: number;
  notify_consistency: number;
  notify_setup_result: number;
}

interface AlphaAccount {
  id: number;
  label: string;
  account_size: number;
  account_type: string;
  drawdown_type: string;
  drawdown_limit: number;
  profit_target: number;
  max_contracts: number;
  scaling_limit: number;
  is_active: number;
}

interface AlphaTemplate {
  id: number;
  label: string;
  account_size: number;
  drawdown_limit: number;
  profit_target: number;
  max_contracts: number;
  scaling_limit: number;
}

type ToastKind = 'success' | 'error' | 'warning';
interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
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

function numberInputStyle(): CSSProperties {
  return {
    background: '#0a0a10',
    color: 'var(--bright)',
    border: '1px solid var(--glass-border)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 14,
    fontFamily: '"JetBrains Mono", monospace',
    outline: 'none',
    width: 80,
    textAlign: 'right',
    boxSizing: 'border-box',
  };
}

function textInputStyle(): CSSProperties {
  return {
    background: '#0a0a10',
    color: 'var(--text)',
    border: '1px solid var(--glass-border)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: '"JetBrains Mono", monospace',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };
}

function InnerPanel({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: 'rgba(8,8,12,0.4)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--red-soft)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 12,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function RowLabel({
  label,
  sub,
}: {
  label: string;
  sub?: string;
}) {
  return (
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
            fontSize: 12,
            color: 'var(--muted)',
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 0',
      }}
    >
      {children}
    </div>
  );
}

// ────────────────────── Strategy Config ──────────────────────

function fragranceFor(v: number): string {
  if (v < 20) return 'No Signal';
  if (v < 30) return 'Zara';
  if (v < 40) return 'H&M';
  if (v < 50) return 'YSL';
  if (v < 65) return 'Armani';
  if (v < 75) return 'Tom Ford';
  if (v < 90) return 'Prestige';
  return 'Baccarat';
}

type Preset = 'conservative' | 'normal' | 'aggressive';

function PresetButton({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  const [hover, setHover] = useState(false);
  const style: CSSProperties = {
    flex: 1,
    minWidth: 120,
    padding: 12,
    borderRadius: 10,
    background: active
      ? 'rgba(251,44,90,0.12)'
      : hover
        ? 'rgba(255,255,255,0.03)'
        : 'transparent',
    border: `1px solid ${active ? 'rgba(251,44,90,0.55)' : 'var(--glass-border)'}`,
    color: active ? 'var(--red)' : 'var(--bright)',
    cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    boxShadow: active ? '0 0 14px rgba(251,44,90,0.25)' : 'none',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={style}
      aria-pressed={active}
    >
      <span
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </span>
      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{desc}</span>
    </button>
  );
}

function KillSwitchPanel({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div
      style={{
        background: active ? 'rgba(239,68,68,0.08)' : 'rgba(8,8,12,0.4)',
        border: `1px solid ${active ? 'var(--danger)' : 'var(--glass-border)'}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        boxShadow: active ? '0 0 18px rgba(239,68,68,0.2)' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              color: active ? 'var(--danger)' : 'var(--bright)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {active ? 'Kill Switch Active' : 'Kill Switch'}
          </div>
          <div
            style={{
              fontSize: 12,
              color: active ? 'var(--danger)' : 'var(--muted)',
              opacity: active ? 0.8 : 1,
              marginTop: 2,
            }}
          >
            No more trades today
          </div>
        </div>
        <Toggle checked={active} onChange={onToggle} size="lg" />
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          marginTop: 10,
          fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: '0.08em',
        }}
      >
        RESETS AT MIDNIGHT ET
      </div>
    </div>
  );
}

function StrategyConfigCard({
  pushToast,
}: {
  pushToast: (msg: string, kind?: ToastKind) => void;
}) {
  const [config, setConfig] = useState<StrategyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/strategy/config', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json() as Promise<StrategyConfig>;
      })
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load strategy config');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveUpdate = useCallback(
    (updates: Partial<StrategyConfig>, debounceMs = 0) => {
      setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
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
            pushToast('\u2713 Saved', 'success');
          })
          .catch(() => {
            pushToast('\u2717 Save failed', 'error');
          });
      };
      if (debounceMs > 0) {
        debounceRef.current = window.setTimeout(doFetch, debounceMs);
      } else {
        doFetch();
      }
    },
    [pushToast],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      fetch('/api/strategy/config/preset', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset }),
      })
        .then((r) => r.json() as Promise<StrategyConfig>)
        .then((updated) => {
          setConfig(updated);
          pushToast(
            `\u2713 ${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied`,
            'success',
          );
        })
        .catch(() => pushToast('\u2717 Preset failed', 'error'));
    },
    [pushToast],
  );

  const toggleKillSwitch = useCallback(
    (enabled: boolean) => {
      fetch('/api/strategy/kill-switch', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
        .then((r) => r.json() as Promise<StrategyConfig>)
        .then((updated) => {
          setConfig(updated);
          pushToast(
            enabled
              ? '\u26A0 Kill switch activated'
              : '\u2713 Kill switch deactivated',
            enabled ? 'warning' : 'success',
          );
        })
        .catch(() => pushToast('\u2717 Failed', 'error'));
    },
    [pushToast],
  );

  return (
    <GlassCard title="◆ STRATEGY CONFIG" collapsible defaultOpen>
      {loading && (
        <div
          className="skeleton-shimmer"
          style={{ height: 120, borderRadius: 8 }}
          aria-hidden="true"
        />
      )}
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>
      )}
      {config && (
        <>
          <InnerPanel>
            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <PresetButton
                active={config.active_preset === 'conservative'}
                onClick={() => applyPreset('conservative')}
                title="Conservative"
                desc="Higher R:R, IFVG only"
              />
              <PresetButton
                active={config.active_preset === 'normal'}
                onClick={() => applyPreset('normal')}
                title="Normal"
                desc="Balanced defaults"
              />
              <PresetButton
                active={config.active_preset === 'aggressive'}
                onClick={() => applyPreset('aggressive')}
                title="Aggressive"
                desc="Lower R:R, any continuation"
              />
            </div>
          </InnerPanel>

          <KillSwitchPanel
            active={config.kill_switch === 1}
            onToggle={toggleKillSwitch}
          />

          <InnerPanel title="Session Filters">
            <Row>
              <RowLabel label="Trade London sweeps" />
              <Toggle
                checked={config.trade_london_sweep === 1}
                onChange={(v) => saveUpdate({ trade_london_sweep: v ? 1 : 0 })}
              />
            </Row>
            <Row>
              <RowLabel label="Trade NY sweeps" />
              <Toggle
                checked={config.trade_ny_sweep === 1}
                onChange={(v) => saveUpdate({ trade_ny_sweep: v ? 1 : 0 })}
              />
            </Row>
          </InnerPanel>

          <InnerPanel title="FVG Settings">
            <Row>
              <RowLabel label="Scan 1H FVGs" />
              <Toggle
                checked={config.fvg_scan_1h === 1}
                onChange={(v) => saveUpdate({ fvg_scan_1h: v ? 1 : 0 })}
              />
            </Row>
            <Row>
              <RowLabel label="Scan 4H FVGs" />
              <Toggle
                checked={config.fvg_scan_4h === 1}
                onChange={(v) => saveUpdate({ fvg_scan_4h: v ? 1 : 0 })}
              />
            </Row>
            <Row>
              <RowLabel
                label="Require IFVG for continuation"
                sub="Only fires BASE NOTE on Inverse FVGs"
              />
              <Toggle
                checked={config.continuation_require_ifvg === 1}
                onChange={(v) =>
                  saveUpdate({ continuation_require_ifvg: v ? 1 : 0 })
                }
              />
            </Row>
          </InnerPanel>

          <InnerPanel title="Entry Filters">
            <Row>
              <RowLabel label="Min R:R" />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
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
            </Row>
            <Row>
              <RowLabel label="Min AI confidence" />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
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
                <span
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11,
                    color: 'var(--red-soft)',
                    minWidth: 80,
                    textAlign: 'right',
                  }}
                >
                  {fragranceFor(config.min_confidence)}
                </span>
              </div>
            </Row>
          </InnerPanel>

          <InnerPanel title="Position Sizing">
            <Row>
              <RowLabel label="Default contracts" />
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
            </Row>
            <Row>
              <RowLabel label="Max contracts override" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  step={1}
                  min={1}
                  max={20}
                  value={config.max_contracts_override ?? ''}
                  placeholder="—"
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      saveUpdate({ max_contracts_override: null }, 500);
                      return;
                    }
                    const v = parseInt(raw, 10);
                    if (!Number.isNaN(v) && v >= 1 && v <= 20) {
                      saveUpdate({ max_contracts_override: v }, 500);
                    }
                  }}
                  style={numberInputStyle()}
                />
                <button
                  type="button"
                  onClick={() => saveUpdate({ max_contracts_override: null })}
                  aria-label="Clear max contracts override"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--muted)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            </Row>
          </InnerPanel>
        </>
      )}
    </GlassCard>
  );
}

// ────────────────────── Notifications ──────────────────────

function NotificationsCard({
  pushToast,
}: {
  pushToast: (msg: string, kind?: ToastKind) => void;
}) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookDraft, setWebhookDraft] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings', { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok) throw new Error('fail');
        return r.json() as Promise<UserSettings>;
      })
      .then((data) => {
        if (cancelled) return;
        setSettings(data);
        setWebhookDraft(data.discord_webhook_url || '');
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load notifications');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveField = useCallback(
    (update: Partial<UserSettings>) => {
      setSettings((prev) => (prev ? { ...prev, ...update } : prev));
      fetch('/api/settings', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      })
        .then((r) => r.json() as Promise<UserSettings>)
        .then((updated) => {
          setSettings(updated);
          pushToast('\u2713 Settings saved', 'success');
        })
        .catch(() => pushToast('\u2717 Something went wrong', 'error'));
    },
    [pushToast],
  );

  const saveWebhook = () => {
    saveField({ discord_webhook_url: webhookDraft.trim() });
  };

  const testWebhook = () => {
    setTesting(true);
    fetch('/api/settings/test-discord', {
      method: 'POST',
      credentials: 'same-origin',
    })
      .then((r) => r.json() as Promise<{ success: boolean }>)
      .then((data) => {
        pushToast(
          data.success
            ? '\u2713 Discord notification sent'
            : '\u2717 Discord webhook failed',
          data.success ? 'success' : 'error',
        );
      })
      .catch(() => pushToast('\u2717 Discord webhook failed', 'error'))
      .finally(() => setTesting(false));
  };

  const toggles: { key: keyof UserSettings; label: string; sub: string }[] = [
    { key: 'notify_sweep', label: 'Sweep detected', sub: 'Top Note' },
    { key: 'notify_ready', label: 'Setup confirmed', sub: 'Base Note' },
    { key: 'notify_execute', label: 'Entry signal', sub: 'Accord' },
    { key: 'notify_drawdown', label: 'Drawdown warning', sub: 'Redline' },
    { key: 'notify_consistency', label: 'Consistency warning', sub: 'Rev Limit' },
    { key: 'notify_setup_result', label: 'Setup results', sub: 'Win/Loss' },
  ];

  return (
    <GlassCard title="◆ NOTIFICATIONS" collapsible defaultOpen={false}>
      {loading && (
        <div
          className="skeleton-shimmer"
          style={{ height: 120, borderRadius: 8 }}
          aria-hidden="true"
        />
      )}
      {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}
      {settings && (
        <>
          <InnerPanel title="Discord Setup">
            <div
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--label)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
              }}
            >
              Webhook URL
            </div>
            <input
              type="text"
              value={webhookDraft}
              onChange={(e) => setWebhookDraft(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              style={textInputStyle()}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button variant="primary" size="sm" onClick={saveWebhook}>
                Save
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={testWebhook}
                loading={testing}
              >
                Test
              </Button>
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                marginTop: 10,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              Channel Settings → Integrations → Webhooks → New Webhook → Copy URL
            </div>
          </InnerPanel>

          <InnerPanel title="Alert Types">
            <Row>
              <RowLabel label="Notifications enabled" />
              <Toggle
                checked={settings.discord_enabled === 1}
                onChange={(v) => saveField({ discord_enabled: v ? 1 : 0 })}
                size="lg"
              />
            </Row>
            <div
              style={{
                height: 1,
                background: 'var(--glass-border)',
                margin: '8px 0',
              }}
            />
            {toggles.map((t) => (
              <Row key={t.key}>
                <RowLabel label={t.label} sub={t.sub} />
                <Toggle
                  checked={(settings[t.key] as number) === 1}
                  onChange={(v) =>
                    saveField({ [t.key]: v ? 1 : 0 } as Partial<UserSettings>)
                  }
                />
              </Row>
            ))}
          </InnerPanel>
        </>
      )}
    </GlassCard>
  );
}

// ────────────────────── Accounts ──────────────────────

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        background: 'rgba(8,8,12,0.6)',
        border: '1px solid var(--glass-border)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              background: active ? 'rgba(251,44,90,0.14)' : 'transparent',
              color: active ? 'var(--red)' : 'var(--label)',
              border: active ? '1px solid rgba(251,44,90,0.4)' : '1px solid transparent',
              borderRadius: 8,
              padding: '6px 12px',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onClick,
}: {
  template: AlphaTemplate;
  selected: boolean;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const isStatic = (template.label || '').indexOf('Static') !== -1;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        textAlign: 'left',
        background: selected
          ? 'rgba(251,44,90,0.08)'
          : hover
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(8,8,12,0.4)',
        border: `1px solid ${selected ? 'rgba(251,44,90,0.55)' : 'var(--glass-border)'}`,
        borderRadius: 10,
        padding: 12,
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s, border-color 0.15s',
        boxShadow: selected ? '0 0 12px rgba(251,44,90,0.25)' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: selected ? 'var(--red)' : 'var(--bright)',
        }}
      >
        {template.label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          marginTop: 4,
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        DD ${Number(template.drawdown_limit).toLocaleString()} · Target $
        {Number(template.profit_target).toLocaleString()}
      </div>
      {isStatic && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 9,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(52,211,153,0.1)',
            color: 'var(--green)',
            letterSpacing: 1,
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          STATIC
        </div>
      )}
    </button>
  );
}

function AccountListItem({ account }: { account: AlphaAccount }) {
  const active = account.is_active === 1;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid var(--glass-border)',
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'Outfit, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--bright)',
          }}
        >
          {active && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--green)',
                boxShadow: '0 0 8px var(--green)',
                display: 'inline-block',
              }}
              aria-hidden="true"
            />
          )}
          {account.label || `Account #${account.id}`}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontFamily: '"JetBrains Mono", monospace',
            marginTop: 4,
          }}
        >
          ${Number(account.account_size).toLocaleString()} ·{' '}
          {(account.account_type || '').toUpperCase()} · DD $
          {Number(account.drawdown_limit).toLocaleString()} ·{' '}
          {active ? 'ACTIVE' : 'INACTIVE'}
        </div>
      </div>
    </div>
  );
}

function AccountsCard({
  pushToast,
}: {
  pushToast: (msg: string, kind?: ToastKind) => void;
}) {
  const [accounts, setAccounts] = useState<AlphaAccount[] | null>(null);
  const [templates, setTemplates] = useState<AlphaTemplate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<AlphaTemplate | null>(
    null,
  );
  const [label, setLabel] = useState('');
  const [accountType, setAccountType] = useState<'legacy' | 'v4'>('legacy');
  const [drawdownType, setDrawdownType] = useState<'trailing' | 'eod' | 'static'>(
    'trailing',
  );
  const [creating, setCreating] = useState(false);

  const loadAccounts = useCallback(() => {
    return fetch('/api/alpha/accounts', { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<AlphaAccount[]>)
      .then((data) => setAccounts(data))
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/alpha/accounts', { credentials: 'same-origin' }).then(
        (r) => r.json() as Promise<AlphaAccount[]>,
      ),
      fetch('/api/alpha/templates', { credentials: 'same-origin' }).then(
        (r) => r.json() as Promise<AlphaTemplate[]>,
      ),
    ])
      .then(([accts, tpls]) => {
        if (cancelled) return;
        setAccounts(accts);
        setTemplates(tpls);
      })
      .catch(() => {
        if (cancelled) return;
        setAccounts([]);
        setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectTemplate = (tpl: AlphaTemplate) => {
    setSelectedTemplate(tpl);
    setLabel(`${tpl.label} Legacy #1`);
    setAccountType('legacy');
    setDrawdownType('trailing');
  };

  const createAccount = () => {
    if (!selectedTemplate) return;
    setCreating(true);
    const body = {
      template_id: selectedTemplate.id,
      label: label || `${selectedTemplate.label} Account`,
      account_type: accountType,
      drawdown_type: drawdownType,
    };
    fetch('/api/alpha/accounts', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error('fail');
        return r.json();
      })
      .then(() => {
        pushToast(`\u2713 Account created \u2014 ${body.label}`, 'success');
        setSelectedTemplate(null);
        setLabel('');
        loadAccounts();
      })
      .catch(() => pushToast('\u2717 Something went wrong \u2014 try again', 'error'))
      .finally(() => setCreating(false));
  };

  return (
    <GlassCard title="◆ ACCOUNTS" collapsible defaultOpen={false}>
      {loading && (
        <div
          className="skeleton-shimmer"
          style={{ height: 120, borderRadius: 8 }}
          aria-hidden="true"
        />
      )}
      {!loading && accounts && accounts.length > 0 && (
        <InnerPanel title="Your Accounts">
          {accounts.map((a) => (
            <AccountListItem key={a.id} account={a} />
          ))}
        </InnerPanel>
      )}

      <InnerPanel title="Create New Account">
        {!templates || templates.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            No templates available.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 10,
            }}
          >
            {templates.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                selected={selectedTemplate?.id === tpl.id}
                onClick={() => selectTemplate(tpl)}
              />
            ))}
          </div>
        )}

        {selectedTemplate && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                Label
              </div>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                style={textInputStyle()}
              />
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                Account Type
              </div>
              <SegmentedControl
                options={[
                  { value: 'legacy', label: 'Legacy' },
                  { value: 'v4', label: 'V4' },
                ]}
                value={accountType}
                onChange={(v) => setAccountType(v as 'legacy' | 'v4')}
              />
            </div>

            <div>
              <div
                style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                }}
              >
                Drawdown Type
              </div>
              <SegmentedControl
                options={[
                  { value: 'trailing', label: 'Trailing' },
                  { value: 'eod', label: 'EOD' },
                  { value: 'static', label: 'Static' },
                ]}
                value={drawdownType}
                onChange={(v) =>
                  setDrawdownType(v as 'trailing' | 'eod' | 'static')
                }
              />
            </div>

            <div
              style={{
                borderTop: '1px solid var(--glass-border)',
                paddingTop: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 12,
                fontFamily: '"JetBrains Mono", monospace',
              }}
            >
              {[
                ['Account Size', `$${Number(selectedTemplate.account_size).toLocaleString()}`],
                ['Drawdown Limit', `$${Number(selectedTemplate.drawdown_limit).toLocaleString()}`],
                ['Profit Target', `$${Number(selectedTemplate.profit_target).toLocaleString()}`],
                ['Max Contracts', String(selectedTemplate.max_contracts)],
                ['Scaling Limit', String(selectedTemplate.scaling_limit)],
              ].map(([lbl, val]) => (
                <div
                  key={lbl}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ color: 'var(--muted)' }}>{lbl}</span>
                  <span style={{ color: 'var(--bright)' }}>{val}</span>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={createAccount}
              loading={creating}
            >
              Create Account
            </Button>
          </div>
        )}
      </InnerPanel>
    </GlassCard>
  );
}

// ────────────────────── Page ──────────────────────

export default function Settings() {
  const { toasts, push } = useToasts();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 960,
      }}
    >
      <StrategyConfigCard pushToast={push} />
      <NotificationsCard pushToast={push} />
      <AccountsCard pushToast={push} />
      <ToastStack toasts={toasts} />
    </div>
  );
}
