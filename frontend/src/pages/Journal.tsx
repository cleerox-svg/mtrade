import GlassCard from '../components/ui/GlassCard';

export default function Journal() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <GlassCard title="◆ JOURNAL">
        <div
          style={{
            padding: '48px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 11,
              letterSpacing: '0.25em',
              color: 'var(--red)',
              textTransform: 'uppercase',
            }}
          >
            Coming Soon
          </div>
          <div
            style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--bright)',
            }}
          >
            Trade Journal
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              maxWidth: 420,
              lineHeight: 1.6,
            }}
          >
            Log every setup, review winning and losing trades, and track the
            patterns behind your edge.
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
