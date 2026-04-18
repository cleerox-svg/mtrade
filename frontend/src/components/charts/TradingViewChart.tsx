import { useEffect, useRef } from 'react';

export interface TradingViewChartProps {
  symbol: 'ES' | 'NQ' | 'MES' | 'MNQ' | string;
  height: number;
  expanded?: boolean;
}

const TV_SCRIPT_SRC =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

function tvSymbolFor(symbol: string): string {
  if (symbol === 'ES' || symbol === 'MES') return 'OANDA:SPX500USD';
  if (symbol === 'NQ' || symbol === 'MNQ') return 'OANDA:NAS100USD';
  return 'OANDA:NAS100USD';
}

export default function TradingViewChart({
  symbol,
  height,
  expanded: _expanded,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    const widgetHost = document.createElement('div');
    widgetHost.className = 'tradingview-widget-container__widget';
    widgetHost.style.height = '100%';
    widgetHost.style.width = '100%';
    container.appendChild(widgetHost);

    const script = document.createElement('script');
    script.src = TV_SCRIPT_SRC;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbolFor(symbol),
      interval: '15',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      width: '100%',
      height,
      hide_top_toolbar: false,
      hide_side_toolbar: false,
      allow_symbol_change: false,
      save_image: false,
      backgroundColor: 'rgba(8,8,12,1)',
      gridColor: 'rgba(255,255,255,0.03)',
      enable_publishing: false,
      withdateranges: true,
      studies: ['Volume@tv-basicstudies'],
      locale: 'en',
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, height]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{
        width: '100%',
        height,
        borderRadius: 10,
        overflow: 'hidden',
      }}
    />
  );
}
