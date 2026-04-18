import { CSSProperties, useEffect, useState } from 'react';
import TradingViewChart from '../components/charts/TradingViewChart';
import StrategyChart from '../components/charts/StrategyChart';
import Button from '../components/ui/Button';
import GlassCard from '../components/ui/GlassCard';

type Instrument = 'ES' | 'NQ' | 'MES' | 'MNQ';
const INSTRUMENTS: Instrument[] = ['ES', 'NQ', 'MES', 'MNQ'];

const HEADER_HEIGHT = 56;
const MAIN_PADDING = 20;

function useViewportHeight() {
  const [height, setHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight : 800,
  );
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return height;
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

export default function Charts() {
  const [instrument, setInstrument] = useState<Instrument>('NQ');
  const viewportHeight = useViewportHeight();

  const tvHeight = Math.max(
    360,
    viewportHeight - HEADER_HEIGHT - MAIN_PADDING * 2,
  );

  const pageStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  };

  const controlRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'flex-end',
  };

  return (
    <div style={pageStyle}>
      <div style={controlRowStyle}>
        <InstrumentSelector value={instrument} onChange={setInstrument} />
      </div>
      <div
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
        }}
      >
        <TradingViewChart symbol={instrument} height={tvHeight} expanded />
      </div>
      <GlassCard>
        <StrategyChart instrument={instrument} height={480} expanded />
      </GlassCard>
    </div>
  );
}
