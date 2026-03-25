-- Add Break of Structure knowledge base article
INSERT INTO kb_articles (category, slug, title, content, sort_order) VALUES (
  'ICT Concepts',
  'break-of-structure',
  'Break of Structure (BOS)',
  'A Break of Structure confirms that the market''s trend direction has changed. After a London sweep, BOS is the proof that the reversal is real — not just a wick or a fakeout.

## How It Works

Price makes swing highs and swing lows as it moves. In a downtrend, you see lower highs and lower lows. In an uptrend, higher highs and higher lows.

A **bullish BOS** happens when price breaks ABOVE a recent swing high after making lower lows. This breaks the bearish structure and confirms buyers are taking control.

A **bearish BOS** happens when price breaks BELOW a recent swing low after making higher highs. This breaks the bullish structure and confirms sellers are in charge.

## In Matthew''s Strategy

BOS is Phase 2 — it sits between the London Sweep and the FVG Retracement.

- London Low swept (Phase 1) → price reverses up → breaks above recent 5m swing high → **bullish BOS confirmed** (Phase 2) → now look for FVG retracement (Phase 3)
- London High swept (Phase 1) → price reverses down → breaks below recent 5m swing low → **bearish BOS confirmed** (Phase 2) → now look for FVG retracement (Phase 3)

## Why It Matters

Without BOS, you might enter a trade thinking the sweep was manipulation, but price was actually just trending through the London level. BOS filters out fake reversals.

- Sweep WITHOUT BOS = price might continue trending. Skip.
- Sweep WITH BOS = structure has shifted. Proceed to Phase 3.

## How Mtrade Detects It

The engine tracks swing highs and swing lows on the 5-minute timeframe using a 7-candle window (3 candles before and after). After a sweep, it watches for a candle closing beyond the most recent swing point in the reversal direction.

On the Strategy Chart, BOS appears as an **amber horizontal line** with a diamond marker where the break occurred.

> Tip: BOS on a higher timeframe (15m or 1H) is stronger than on 5m. If you see BOS on both 5m and 15m, the reversal has more conviction.',
  3
);
