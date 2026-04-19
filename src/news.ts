import { Env } from './types';
import { getEnabledWebhookUsers } from './notifications';

const RELEVANT_KEYWORDS = [
  'nasdaq', 'nq', 's&p', 'es', 'futures', 'fed', 'fomc',
  'inflation', 'tariff', 'trump', 'rate', 'cpi', 'gdp',
  'jobs', 'payroll', 'treasury',
];

const HIGH_IMPACT_KEYWORDS = [
  'fed', 'fomc', 'tariff', 'trump', 'rate decision',
];

interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface FinnhubCalendarItem {
  actual: number | null;
  country: string;
  estimate: number | null;
  event: string;
  impact: string;
  prev: number | null;
  time: string;
  unit: string;
}

interface FinnhubCalendarResponse {
  economicCalendar: FinnhubCalendarItem[];
}

interface HaikuNewsAnalysis {
  impact: 'high' | 'medium' | 'low';
  direction: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
}

function matchesText(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

async function fetchFinnhubNews(
  env: Env,
  category: 'general' | 'forex'
): Promise<FinnhubNewsItem[]> {
  const url = `https://finnhub.io/api/v1/news?category=${category}&token=${env.FINNHUB_API_KEY}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`Finnhub news ${category}: HTTP ${resp.status}`);
      return [];
    }
    return await resp.json<FinnhubNewsItem[]>();
  } catch (err) {
    console.error(`Finnhub news ${category} error:`, err);
    return [];
  }
}

async function analyzeNewsWithHaiku(
  env: Env,
  title: string,
  summary: string
): Promise<HaikuNewsAnalysis | null> {
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Rate this news for NQ futures impact: ${title}. ${summary}. Respond JSON: { impact: high/medium/low, direction: bullish/bearish/neutral, reasoning: one sentence }`,
        }],
      }),
    });
    if (!resp.ok) {
      console.error(`Haiku analysis HTTP ${resp.status}`);
      return null;
    }
    const data = await resp.json<{ content: { text: string }[] }>();
    let text = data.content[0].text;
    text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return JSON.parse(text) as HaikuNewsAnalysis;
  } catch (err) {
    console.error('Haiku news analysis error:', err);
    return null;
  }
}

async function sendNewsDiscordAlert(
  env: Env,
  item: {
    title: string;
    summary: string;
    url: string;
    source: string;
    impact: string;
    direction: string | null;
    ai_reasoning: string | null;
  }
): Promise<void> {
  const users = await getEnabledWebhookUsers(env);
  const color = item.impact === 'critical' ? 16396084 : 16763904;
  const directionEmoji = item.direction === 'bullish' ? '\ud83d\udcc8'
    : item.direction === 'bearish' ? '\ud83d\udcc9' : '\u27a1\ufe0f';

  const fields: Record<string, unknown>[] = [
    { name: 'Source', value: item.source, inline: true },
    { name: 'Impact', value: item.impact.toUpperCase(), inline: true },
  ];
  if (item.direction) {
    fields.push({ name: 'Direction', value: `${directionEmoji} ${item.direction}`, inline: true });
  }
  if (item.summary) {
    const trimmed = item.summary.length > 500 ? item.summary.slice(0, 497) + '...' : item.summary;
    fields.push({ name: 'Summary', value: trimmed, inline: false });
  }
  if (item.ai_reasoning) {
    fields.push({ name: 'AI Analysis', value: item.ai_reasoning, inline: false });
  }
  fields.push({ name: '', value: `**[Read article \u2192](${item.url})**`, inline: false });

  const embed = {
    title: `\ud83d\udcf0 ${item.impact === 'critical' ? 'CRITICAL' : 'HIGH-IMPACT'} NEWS`,
    description: item.title,
    color,
    fields,
    footer: { text: 'MTRADE \u00b7 LRX Enterprises Inc.' },
    timestamp: new Date().toISOString(),
  };

  for (const u of users) {
    if (!u.discord_webhook_url || !u.notify_execute) continue;
    try {
      await fetch(u.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    } catch (err) {
      console.error('News webhook error:', err);
    }
  }
}

export async function fetchNews(env: Env): Promise<void> {
  if (!env.FINNHUB_API_KEY) {
    console.error('FINNHUB_API_KEY not configured');
    return;
  }

  const [general, forex] = await Promise.all([
    fetchFinnhubNews(env, 'general'),
    fetchFinnhubNews(env, 'forex'),
  ]);

  // Dedup by url within this batch
  const byUrl = new Map<string, FinnhubNewsItem>();
  for (const item of [...general, ...forex]) {
    if (item.url) byUrl.set(item.url, item);
  }

  for (const item of byUrl.values()) {
    const combined = `${item.headline} ${item.summary}`;
    if (!matchesText(combined, RELEVANT_KEYWORDS)) continue;

    const isHighImpact = matchesText(combined, HIGH_IMPACT_KEYWORDS);
    let impact: 'low' | 'medium' | 'high' | 'critical' = isHighImpact ? 'high' : 'low';
    let direction: string | null = null;
    let aiAnalysisJson: string | null = null;
    let aiReasoning: string | null = null;

    if (isHighImpact) {
      const analysis = await analyzeNewsWithHaiku(env, item.headline, item.summary);
      if (analysis) {
        aiAnalysisJson = JSON.stringify(analysis);
        aiReasoning = analysis.reasoning;
        direction = analysis.direction;
        if (analysis.impact === 'high') impact = 'high';
        else if (analysis.impact === 'medium') impact = 'medium';
        else impact = 'low';
      }
    }

    const publishedAt = item.datetime
      ? new Date(item.datetime * 1000).toISOString()
      : null;

    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO market_news
        (source, title, summary, url, published_at, impact, direction, ai_analysis)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      item.source || 'finnhub',
      item.headline,
      item.summary || null,
      item.url,
      publishedAt,
      impact,
      direction,
      aiAnalysisJson
    ).run();

    const inserted = (result.meta.changes ?? 0) > 0;
    const finalImpact: string = impact;
    const highOrCritical = finalImpact === 'high' || finalImpact === 'critical';

    if (inserted && highOrCritical) {
      await sendNewsDiscordAlert(env, {
        title: item.headline,
        summary: item.summary || '',
        url: item.url,
        source: item.source || 'finnhub',
        impact,
        direction,
        ai_reasoning: aiReasoning,
      });
    }
  }
}

export async function fetchEconomicCalendar(env: Env): Promise<void> {
  if (!env.FINNHUB_API_KEY) {
    console.error('FINNHUB_API_KEY not configured');
    return;
  }

  const url = `https://finnhub.io/api/v1/calendar/economic?token=${env.FINNHUB_API_KEY}`;
  let data: FinnhubCalendarResponse;
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`Finnhub calendar: HTTP ${resp.status}`);
      return;
    }
    data = await resp.json<FinnhubCalendarResponse>();
  } catch (err) {
    console.error('Finnhub calendar error:', err);
    return;
  }

  const items = data.economicCalendar || [];
  for (const ev of items) {
    if (ev.country !== 'US') continue;

    // Finnhub time is typically "YYYY-MM-DD HH:MM:SS"
    const [datePart, timePart] = (ev.time || '').split(' ');
    if (!datePart) continue;

    const impact = (['high', 'medium', 'low'].includes(ev.impact) ? ev.impact : 'low') as
      'high' | 'medium' | 'low';

    await env.DB.prepare(
      `INSERT OR IGNORE INTO economic_events
        (date, time, event, country, impact, previous, forecast, actual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      datePart,
      timePart || null,
      ev.event,
      ev.country,
      impact,
      ev.prev != null ? String(ev.prev) : null,
      ev.estimate != null ? String(ev.estimate) : null,
      ev.actual != null ? String(ev.actual) : null
    ).run();
  }
}
