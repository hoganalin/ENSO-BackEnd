// 小店 tool executors
//
// 每個 executor:
//   input (object from LLM) → Promise<{ ok: true, data } | { ok: false, error }>
//
// 不直接回 string；由 chat loop 統一 JSON.stringify 後塞進 tool_result。
// 這樣方便單元測試，也讓 UI widget 可以直接拿 data 做視覺化。

import {
  calculateKpis,
  classifyIntent,
  fetchAgentEvents,
  filterRecentEvents,
  getEvalTimeline,
  getLatestFailedCases,
} from './agentEvents';

/**
 * 共用的事件抓取：抓夠多筆支援 1 週回看。
 * 若後續需求更長再調整 limit 或改 since。
 */
async function loadEvents() {
  const { events } = await fetchAgentEvents({ limit: 1000 });
  return events;
}

/**
 * get_sales_summary
 *
 * 24h 營運摘要：對話、handoff、平均 tool 使用、最新 pass rate。
 */
export async function getSalesSummary() {
  const events = await loadEvents();
  const kpi = calculateKpis(events);
  const handoffRate =
    kpi.turns24h > 0
      ? Number(((kpi.handoffs24h / kpi.turns24h) * 100).toFixed(1))
      : 0;
  return {
    ok: true,
    data: {
      window: '過去 24 小時',
      turns: kpi.turns24h,
      handoffs: kpi.handoffs24h,
      handoffRatePercent: handoffRate,
      avgToolCallsPerTurn: kpi.avgToolCalls,
      latestEvalPassRatePercent:
        kpi.latestPassRate == null
          ? null
          : Number((kpi.latestPassRate * 100).toFixed(1)),
      latestEvalAt: kpi.latestEvalTimestamp,
    },
  };
}

/**
 * get_top_intents
 *
 * 意圖分佈 Top-N（預設 24h / Top 5）。
 */
export async function getTopIntents({ hours = 24, top_n = 5 } = {}) {
  const events = await loadEvents();
  const recent = filterRecentEvents(events, hours);

  const counter = {};
  let totalTurns = 0;
  for (const e of recent) {
    if (e.kind !== 'conversation_turn') continue;
    const intent = classifyIntent(e.userMessage);
    counter[intent] = (counter[intent] ?? 0) + 1;
    totalTurns += 1;
  }

  const distribution = Object.entries(counter)
    .map(([name, count]) => ({
      intent: name,
      count,
      percent:
        totalTurns > 0 ? Number(((count / totalTurns) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top_n);

  return {
    ok: true,
    data: {
      window: `過去 ${hours} 小時`,
      totalTurns,
      topIntents: distribution,
    },
  };
}

/**
 * get_agent_performance
 *
 * 每位 agent (xiaohe / xiaoxiang / xiaoguan) 的 24h 表現對照。
 */
export async function getAgentPerformance({ hours = 24 } = {}) {
  const events = await loadEvents();
  const recent = filterRecentEvents(events, hours);
  const turns = recent.filter((e) => e.kind === 'conversation_turn');

  const groups = {};
  for (const t of turns) {
    const id = t.agentId || 'unknown';
    if (!groups[id]) {
      groups[id] = {
        agentId: id,
        turns: 0,
        totalLatencyMs: 0,
        totalToolCalls: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
      };
    }
    const g = groups[id];
    g.turns += 1;
    g.totalLatencyMs += t.latencyMs || 0;
    g.totalToolCalls += t.toolCalls?.length ?? 0;
    g.totalInputTokens += t.tokenUsage?.inputTokens ?? 0;
    g.totalOutputTokens += t.tokenUsage?.outputTokens ?? 0;
  }

  const AGENT_LABEL = { xiaohe: '小禾', xiaoxiang: '小香', xiaoguan: '小管' };

  const perAgent = Object.values(groups)
    .map((g) => ({
      agentId: g.agentId,
      agentName: AGENT_LABEL[g.agentId] ?? g.agentId,
      turns: g.turns,
      avgLatencyMs:
        g.turns > 0 ? Math.round(g.totalLatencyMs / g.turns) : 0,
      avgToolCallsPerTurn:
        g.turns > 0 ? Number((g.totalToolCalls / g.turns).toFixed(2)) : 0,
      totalInputTokens: g.totalInputTokens,
      totalOutputTokens: g.totalOutputTokens,
    }))
    .sort((a, b) => b.turns - a.turns);

  return {
    ok: true,
    data: {
      window: `過去 ${hours} 小時`,
      perAgent,
    },
  };
}

/**
 * get_recent_complaints
 *
 * 最新 eval_run 的 failed cases。
 */
export async function getRecentComplaints({ limit } = {}) {
  const events = await loadEvents();
  const { cases, timestamp } = getLatestFailedCases(events);
  const sliced = typeof limit === 'number' ? cases.slice(0, limit) : cases;

  return {
    ok: true,
    data: {
      evalRunAt: timestamp,
      totalFailedCases: cases.length,
      returned: sliced.length,
      cases: sliced.map((c) => ({
        id: c.id,
        title: c.title,
        reason: c.reason,
        category: c.category ?? null,
      })),
    },
  };
}

/**
 * get_eval_history
 *
 * 最近 N 次 eval_run 的 pass rate 趨勢。
 */
export async function getEvalHistory({ limit = 20 } = {}) {
  const events = await loadEvents();
  const timeline = getEvalTimeline(events);
  const sliced = timeline.slice(-limit);

  // 附一個簡單的 delta 提示，讓 LLM 一眼看出趨勢
  const latest = sliced[sliced.length - 1];
  const prev = sliced[sliced.length - 2];
  const deltaPp =
    latest && prev ? Number((latest.passRate - prev.passRate).toFixed(1)) : null;

  return {
    ok: true,
    data: {
      runs: sliced,
      latestPassRatePercent: latest ? latest.passRate : null,
      previousPassRatePercent: prev ? prev.passRate : null,
      deltaPercentagePoints: deltaPp,
    },
  };
}

// -------------------------------------------------------------
// Dispatcher：依 tool_use 的 name 找對應 executor 並執行。
// chat loop 只需呼叫這一支。
// -------------------------------------------------------------

const TOOL_REGISTRY = {
  get_sales_summary: getSalesSummary,
  get_top_intents: getTopIntents,
  get_agent_performance: getAgentPerformance,
  get_recent_complaints: getRecentComplaints,
  get_eval_history: getEvalHistory,
};

/**
 * 執行一個 tool_use。永遠回傳 { content: string, is_error: boolean }
 * 給 Anthropic tool_result block 直接用。
 */
export async function executeXiaodianTool(name, input) {
  const fn = TOOL_REGISTRY[name];
  if (!fn) {
    return {
      content: JSON.stringify({ error: `未知 tool: ${name}` }),
      is_error: true,
    };
  }
  try {
    const result = await fn(input || {});
    return {
      content: JSON.stringify(result),
      is_error: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: JSON.stringify({ ok: false, error: message }),
      is_error: true,
    };
  }
}
