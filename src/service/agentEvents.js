// Agent Events service
//
// 橋接 ENSO 前台 (Next.js :3000) 的 /api/events endpoint。
// 這裡故意用 fetch 而不是 axios，避免 axios interceptor 意外 attach hexToken
// 或套用其他 admin-only 行為。跨 repo call 應該是乾淨的 HTTP。

import { getMockAgentEvents, isDemoMode } from './agentDemoMock';

const AGENT_API_BASE =
  import.meta.env.VITE_AGENT_API_BASE || 'http://localhost:3000';

/**
 * 讀取 agent event stream。
 *
 * @param {object} [options]
 * @param {number} [options.limit=500]      — 最多回幾筆（最新優先）
 * @param {string} [options.kind]           — 'conversation_turn' | 'handoff' | 'eval_run'
 * @param {string} [options.since]          — ISO timestamp，只回這之後的事件
 * @returns {Promise<{ events: AgentEvent[], total: number }>}
 */
export async function fetchAgentEvents({ limit = 500, kind, since } = {}) {
  // Demo 模式：跨 repo 後端不可達，直接回 mock 事件，避免 dashboard 跳 404 banner
  if (isDemoMode()) {
    let events = getMockAgentEvents();
    if (kind) events = events.filter((e) => e.kind === kind);
    if (since) {
      const sinceMs = Date.parse(since);
      if (!Number.isNaN(sinceMs)) {
        events = events.filter((e) => Date.parse(e.timestamp) >= sinceMs);
      }
    }
    if (limit && events.length > limit) events = events.slice(0, limit);
    return { events, total: events.length };
  }

  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (kind) params.set('kind', kind);
  if (since) params.set('since', since);

  const url = `${AGENT_API_BASE}/api/events?${params.toString()}`;

  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `fetchAgentEvents ${res.status}: ${body.slice(0, 200) || res.statusText}`
    );
  }

  const data = await res.json();
  return {
    events: Array.isArray(data.events) ? data.events : [],
    total: typeof data.total === 'number' ? data.total : 0,
  };
}

/**
 * 類型：Event shape（跟 Next.js src/types/agent-events.ts 對齊）
 * 此處用 JSDoc 標註，避免兩個 repo 引入 TS 依賴。
 *
 * @typedef {object} ConversationTurnEvent
 * @property {'conversation_turn'} kind
 * @property {string} timestamp
 * @property {'xiaohe' | 'xiaoxiang' | 'xiaoguan'} agentId
 * @property {string} userMessage
 * @property {string} assistantText
 * @property {Array<{ name: string, input: Record<string, unknown> }>} toolCalls
 * @property {number} latencyMs
 * @property {{ inputTokens: number, outputTokens: number }} [tokenUsage]
 * @property {string} [stopReason]
 * @property {string | null} [intent]
 *
 * @typedef {object} HandoffEvent
 * @property {'handoff'} kind
 * @property {string} timestamp
 * @property {'xiaohe' | 'xiaoxiang' | 'xiaoguan'} from
 * @property {'xiaohe' | 'xiaoxiang' | 'xiaoguan'} to
 * @property {string} reason
 *
 * @typedef {object} EvalRunEvent
 * @property {'eval_run'} kind
 * @property {string} timestamp
 * @property {string} agentId
 * @property {number} passRate
 * @property {number} total
 * @property {number} passed
 * @property {number} failed
 * @property {number} errored
 * @property {Array<{ id: string, title: string, reason: string, category?: string }>} failedCases
 * @property {string} systemPromptSnippet
 * @property {string} adapterName
 *
 * @typedef {ConversationTurnEvent | HandoffEvent | EvalRunEvent} AgentEvent
 */

// ============== 指標計算 helpers（純函式，dashboard 共用） ==============

/**
 * 過濾出最近 N 小時的事件。
 */
export function filterRecentEvents(events, hours = 24) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return events.filter((e) => Date.parse(e.timestamp) >= cutoff);
}

/**
 * 計算 KPI：24h 對話量 / handoff 次數 / 平均 tool call / 最新 pass rate。
 */
export function calculateKpis(events) {
  const recent = filterRecentEvents(events, 24);
  const turns = recent.filter((e) => e.kind === 'conversation_turn');
  const handoffs = recent.filter((e) => e.kind === 'handoff');

  const totalToolCalls = turns.reduce(
    (acc, t) => acc + (t.toolCalls?.length ?? 0),
    0
  );
  const avgToolCalls = turns.length > 0 ? totalToolCalls / turns.length : 0;

  // 最新 eval_run 的 pass rate（不限 24h）
  const latestEval = [...events]
    .filter((e) => e.kind === 'eval_run')
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];

  return {
    turns24h: turns.length,
    handoffs24h: handoffs.length,
    avgToolCalls: Number(avgToolCalls.toFixed(2)),
    latestPassRate: latestEval ? latestEval.passRate : null,
    latestEvalTimestamp: latestEval ? latestEval.timestamp : null,
  };
}

/**
 * 取出所有 eval_run 事件（依時間排，舊 → 新），供時間軸圖表用。
 */
export function getEvalTimeline(events) {
  return events
    .filter((e) => e.kind === 'eval_run')
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .map((e, i) => ({
      idx: i + 1,
      label: new Date(e.timestamp).toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      passRate: Math.round(e.passRate * 100),
      passed: e.passed,
      failed: e.failed,
      errored: e.errored,
    }));
}

/**
 * Keyword-based intent 分類（快速版，不走 LLM）。
 * 給 PieChart 用。
 */
const INTENT_RULES = [
  { intent: '訂單查詢', keywords: ['訂單', '出貨', '到貨', '配送', '退款'] },
  {
    intent: '香氛知識',
    keywords: [
      '香調',
      '前調',
      '沈香',
      '檀香',
      '香氛',
      '氣味',
      '燃燒',
      '歷史',
      '故事',
    ],
  },
  {
    intent: '購物諮詢',
    keywords: [
      '推薦',
      '買',
      '購買',
      '加購',
      '加入購物車',
      '多少錢',
      '價錢',
      '哪個',
      '送人',
      '禮物',
    ],
  },
  {
    intent: '情境/心情',
    keywords: ['助眠', '放鬆', '冥想', '工作', '睡覺', '緊張', '療癒', '焦慮'],
  },
];

export function classifyIntent(userMessage) {
  if (!userMessage) return '其他';
  const text = userMessage.toLowerCase();
  for (const rule of INTENT_RULES) {
    if (rule.keywords.some((k) => text.includes(k.toLowerCase()))) {
      return rule.intent;
    }
  }
  return '其他';
}

/**
 * 聚合 user messages 的 intent 分佈。
 */
export function getIntentDistribution(events) {
  const counter = {};
  for (const e of events) {
    if (e.kind !== 'conversation_turn') continue;
    const intent = classifyIntent(e.userMessage);
    counter[intent] = (counter[intent] ?? 0) + 1;
  }
  return Object.entries(counter)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * 取最近 N 筆事件供 live trace log。
 */
export function getRecentTrace(events, limit = 12) {
  return [...events]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, limit);
}

/**
 * 從最新 eval_run 事件抓 failedCases。
 */
export function getLatestFailedCases(events) {
  const latestEval = [...events]
    .filter((e) => e.kind === 'eval_run')
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
  if (!latestEval) return { cases: [], timestamp: null };
  return {
    cases: latestEval.failedCases ?? [],
    timestamp: latestEval.timestamp,
  };
}

// ============== Phase F：商業成果 funnel ==============

/**
 * 計算最近 N 天的 funnel：chat session → 加入購物車 → 下單。
 *
 * 算法重點：
 * 1. 用 sessionId 把事件分組（一個 session 內多次對話只算 1 次 conversations）。
 *    沒有 sessionId 的舊事件會被 skip（不混進分母）。
 * 2. 三個 stage 之間是「嚴格漏斗」：
 *       addedToCart 必須有 tool_converted
 *       ordered 必須有 order_placed
 *    但我們不要求「addedToCart 一定也對話過」——即使有人直接開頁面加車，也會被算
 *    到 addedToCart。一般使用者一定會有 conversation_turn 在前，不會失真。
 * 3. 轉換率 = 下游 / 上游，用比率顯示（%，兩位小數）。
 * 4. averageOrderValue 取所有 order_placed 的 total 平均。
 *
 * @param {AgentEvent[]} events
 * @param {number} days
 * @returns {{ windowDays, conversations, addedToCart, ordered,
 *             chatToCartRate, cartToOrderRate, overallConversionRate,
 *             averageOrderValue, totalRevenue }}
 */
export function calculateFunnel(events, days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => Date.parse(e.timestamp) >= cutoff);

  // 用 Set 避免同一 session 重複計入
  const chatSessions = new Set();
  const cartSessions = new Set();
  const orderSessions = new Set();

  let totalRevenue = 0;
  let orderCount = 0;

  for (const e of recent) {
    const sid = e.sessionId;
    if (!sid) continue; // 沒 sessionId（pre-Phase-F 事件）跳過，避免污染比率

    if (e.kind === 'conversation_turn') {
      chatSessions.add(sid);
    } else if (e.kind === 'tool_converted') {
      // tool_converted 可能是 remove_from_cart——對 funnel「加車率」只算 add
      if (e.toolName === 'add_to_cart') {
        cartSessions.add(sid);
      }
    } else if (e.kind === 'order_placed') {
      orderSessions.add(sid);
      if (typeof e.total === 'number') {
        totalRevenue += e.total;
        orderCount += 1;
      }
    }
  }

  const conversations = chatSessions.size;
  const addedToCart = cartSessions.size;
  const ordered = orderSessions.size;

  const safeRate = (num, den) =>
    den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0;

  return {
    windowDays: days,
    conversations,
    addedToCart,
    ordered,
    chatToCartRate: safeRate(addedToCart, conversations),
    cartToOrderRate: safeRate(ordered, addedToCart),
    overallConversionRate: safeRate(ordered, conversations),
    averageOrderValue:
      orderCount > 0 ? Number((totalRevenue / orderCount).toFixed(0)) : 0,
    totalRevenue,
  };
}
