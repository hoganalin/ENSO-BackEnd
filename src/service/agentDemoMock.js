// Demo mode 短路：agent 後端跨 repo 服務專用 mock。
//
// agentEvents / candidateCases / xiaodianChat 都用原生 fetch 打 Next.js :3000，
// 繞過 apiAuth interceptor — 所以也繞過了 apiAuth 的 demo mock。在 demo 環境
// （部署版、本機沒跑 Next.js）那些 fetch 會炸 404 / 連線失敗。
//
// 這檔把 demo 判斷與 mock data 集中起來，讓各 service 仍是「不知道 demo 存在」
// 的乾淨形狀，只在最外層 short-circuit。

const DEMO_TOKEN = 'enso-demo-token';

export function isDemoMode() {
  if (typeof document === 'undefined') return false;
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('myToken='))
      ?.split('=')[1] === DEMO_TOKEN
  );
}

// ---- mock events ----

// 用 factory 而非常數：每次呼叫拿到相對「現在」的時間戳，
// dashboard setInterval 重抓時，「24h 對話量」之類數字才會穩定落在窗口內。
export function getMockAgentEvents() {
  const now = Date.now();
  const min = (m) => new Date(now - m * 60 * 1000).toISOString();
  const hr = (h) => new Date(now - h * 60 * 60 * 1000).toISOString();
  const day = (d) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();

  return [
    // 4 次 eval_run（6 天前 → 6 小時前），pass rate 從 62% 上升到 85%
    {
      kind: 'eval_run',
      timestamp: day(6),
      agentId: 'xiaohe',
      passRate: 0.62,
      total: 16,
      passed: 10,
      failed: 5,
      errored: 1,
      failedCases: [
        {
          id: 'reg_001',
          title: '客人問訂單沒回應',
          reason: 'no_tool_call',
          category: 'edge',
        },
        {
          id: 'reg_007',
          title: '推薦超出庫存品項',
          reason: 'invalid_recommendation',
          category: 'safety',
        },
      ],
      systemPromptSnippet: 'v0.3',
      adapterName: 'anthropic',
    },
    {
      kind: 'eval_run',
      timestamp: day(4),
      agentId: 'xiaohe',
      passRate: 0.71,
      total: 17,
      passed: 12,
      failed: 4,
      errored: 1,
      failedCases: [
        {
          id: 'reg_007',
          title: '推薦超出庫存品項',
          reason: 'invalid_recommendation',
          category: 'safety',
        },
      ],
      systemPromptSnippet: 'v0.4',
      adapterName: 'anthropic',
    },
    {
      kind: 'eval_run',
      timestamp: day(2),
      agentId: 'xiaohe',
      passRate: 0.78,
      total: 18,
      passed: 14,
      failed: 3,
      errored: 1,
      failedCases: [
        {
          id: 'reg_011',
          title: '香氛問句被當訂單',
          reason: 'wrong_intent',
          category: 'edge',
        },
      ],
      systemPromptSnippet: 'v0.5',
      adapterName: 'anthropic',
    },
    {
      kind: 'eval_run',
      timestamp: hr(6),
      agentId: 'xiaohe',
      passRate: 0.85,
      total: 20,
      passed: 17,
      failed: 2,
      errored: 1,
      failedCases: [
        {
          id: 'reg_018',
          title: '助眠香推薦結果偏冷門',
          reason: 'recommendation_drift',
          category: 'edge',
        },
        {
          id: 'reg_022',
          title: '退款流程未轉接小管',
          reason: 'missing_handoff',
          category: 'handoff',
        },
      ],
      systemPromptSnippet: 'v0.6',
      adapterName: 'anthropic',
    },

    // 7 筆對話（過去 24h），三位 agent + 不同 intent，sessionId 給 funnel 用
    {
      kind: 'conversation_turn',
      timestamp: min(8),
      agentId: 'xiaohe',
      sessionId: 's-001',
      userMessage: '想找助眠的香氛',
      assistantText:
        '推薦您試試「晨林沈靜」，前調帶松木氣息，能讓緊繃感緩慢沉下來。',
      toolCalls: [{ name: 'recommend_product', input: { mood: 'sleep' } }],
      latencyMs: 1820,
      tokenUsage: { inputTokens: 420, outputTokens: 180 },
      stopReason: 'end_turn',
    },
    {
      kind: 'conversation_turn',
      timestamp: min(22),
      agentId: 'xiaoxiang',
      sessionId: 's-002',
      userMessage: '沈香的前調是什麼？',
      assistantText: '沈香前調帶有溫潤的木質與微微樹脂氣息，不會太銳利。',
      toolCalls: [],
      latencyMs: 1410,
      tokenUsage: { inputTokens: 320, outputTokens: 220 },
      stopReason: 'end_turn',
    },
    {
      kind: 'conversation_turn',
      timestamp: min(45),
      agentId: 'xiaohe',
      sessionId: 's-003',
      userMessage: '想送禮給客戶，有推薦的嗎',
      assistantText: '送禮場景推薦「龍血沉香」禮盒，木質氣息穩重又不過於厚重。',
      toolCalls: [{ name: 'recommend_product', input: { occasion: 'gift' } }],
      latencyMs: 2010,
      tokenUsage: { inputTokens: 380, outputTokens: 240 },
      stopReason: 'end_turn',
    },
    {
      kind: 'conversation_turn',
      timestamp: hr(2),
      agentId: 'xiaoguan',
      sessionId: 's-004',
      userMessage: '我的訂單什麼時候到？',
      assistantText: '訂單 ORD-20260407001 已出貨，預計 2 個工作天內送達。',
      toolCalls: [{ name: 'lookup_order', input: { id: 'ORD-20260407001' } }],
      latencyMs: 980,
      tokenUsage: { inputTokens: 250, outputTokens: 130 },
      stopReason: 'end_turn',
    },
    {
      kind: 'conversation_turn',
      timestamp: hr(3),
      agentId: 'xiaohe',
      sessionId: 's-001',
      userMessage: '好，我加入購物車',
      assistantText: '已將「晨林沈靜」加入購物車。',
      toolCalls: [{ name: 'add_to_cart', input: { productId: '2' } }],
      latencyMs: 1650,
      tokenUsage: { inputTokens: 410, outputTokens: 90 },
      stopReason: 'end_turn',
    },
    {
      kind: 'conversation_turn',
      timestamp: hr(4),
      agentId: 'xiaoxiang',
      sessionId: 's-005',
      userMessage: '工作時想放鬆的香',
      assistantText: '推薦「琥珀黃昏」，琥珀調溫暖但不黏膩，適合長時間使用。',
      toolCalls: [{ name: 'recommend_product', input: { mood: 'work' } }],
      latencyMs: 1740,
      tokenUsage: { inputTokens: 300, outputTokens: 200 },
      stopReason: 'end_turn',
    },
    {
      kind: 'conversation_turn',
      timestamp: hr(8),
      agentId: 'xiaohe',
      sessionId: 's-006',
      userMessage: '退款流程要怎麼走？',
      assistantText: '退款流程由小管處理，我幫您轉接。',
      toolCalls: [],
      latencyMs: 1200,
      tokenUsage: { inputTokens: 220, outputTokens: 100 },
      stopReason: 'end_turn',
    },

    {
      kind: 'handoff',
      timestamp: hr(8),
      from: 'xiaohe',
      to: 'xiaoguan',
      reason: 'refund_request',
    },

    // funnel：cart + order 事件，sessionId 與前面對話對應
    {
      kind: 'tool_converted',
      timestamp: hr(3),
      sessionId: 's-001',
      toolName: 'add_to_cart',
    },
    {
      kind: 'tool_converted',
      timestamp: hr(2),
      sessionId: 's-003',
      toolName: 'add_to_cart',
    },
    {
      kind: 'tool_converted',
      timestamp: hr(5),
      sessionId: 's-005',
      toolName: 'add_to_cart',
    },
    { kind: 'order_placed', timestamp: hr(2), sessionId: 's-001', total: 1280 },
    { kind: 'order_placed', timestamp: hr(1), sessionId: 's-003', total: 1980 },
  ];
}

// ---- mock candidates ----

export function getMockCandidates() {
  const now = Date.now();
  const day = (d) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();
  return [
    {
      id: 'cand_001',
      status: 'proposed',
      source: 'live_trace',
      sourceEventTimestamp: day(1),
      agentId: 'xiaohe',
      userMessage: '想找助眠的香氛',
      assistantText: '推薦您試試「晨林沈靜」，前調帶松木氣息。',
      expectedBehavior: '應該主動詢問是否需要試香組',
      why: '推薦命中但缺少 upsell 機會',
      tags: ['edge-case'],
      createdAt: day(1),
    },
    {
      id: 'cand_002',
      status: 'proposed',
      source: 'live_trace',
      sourceEventTimestamp: day(2),
      agentId: 'xiaoguan',
      userMessage: '我的訂單什麼時候到？',
      assistantText: '訂單 ORD-20260407001 已出貨，預計 2 個工作天內送達。',
      expectedBehavior: '正確查詢訂單狀態並回覆預計到貨日',
      why: '常見訂單查詢路徑，應納入 happy path regression',
      tags: ['happy-path'],
      createdAt: day(2),
    },
    {
      id: 'cand_003',
      status: 'approved',
      source: 'live_trace',
      sourceEventTimestamp: day(3),
      agentId: 'xiaohe',
      userMessage: '退款流程要怎麼走？',
      assistantText: '退款流程由小管處理，我幫您轉接。',
      expectedBehavior: '識別退款意圖後 handoff 給小管',
      why: '驗證 handoff 路徑',
      tags: ['handoff'],
      createdAt: day(3),
    },
    {
      id: 'cand_004',
      status: 'exported',
      source: 'live_trace',
      sourceEventTimestamp: day(5),
      agentId: 'xiaoxiang',
      userMessage: '沈香的前調是什麼？',
      assistantText: '沈香前調帶有溫潤的木質與微微樹脂氣息。',
      expectedBehavior: '用知識庫資料回覆，不亂編造',
      why: '香氛知識題型 baseline',
      tags: ['happy-path'],
      createdAt: day(5),
    },
    {
      id: 'cand_005',
      status: 'archived',
      source: 'live_trace',
      sourceEventTimestamp: day(7),
      agentId: 'xiaohe',
      userMessage: 'test',
      assistantText: '請問您想了解什麼？',
      expectedBehavior: '—',
      why: '測試訊息，不納入 regression',
      tags: ['edge-case'],
      createdAt: day(7),
    },
  ];
}

// ---- XiaodianChat /api/agent canned response ----

export function getMockAgentResponse() {
  return {
    text: '（Demo 模式・小店）這是預設回覆：過去 24 小時三位 agent 對話量穩定、handoff 率約 12%、最新 eval pass rate 85%。連線實際後端後即可走完整 tool_use 迴圈。',
    toolCalls: [],
    stopReason: 'end_turn',
    usage: { inputTokens: 0, outputTokens: 0 },
  };
}

// ---- candidate POST / PATCH 模擬寫入 ----

export function mockUpdateCandidateStatus(id, status) {
  return { ok: true, case: { id, status } };
}

export function mockCreateCandidate(payload) {
  return {
    ok: true,
    case: {
      id: `cand_demo_${Date.now().toString(36)}`,
      status: 'proposed',
      ...payload,
      createdAt: new Date().toISOString(),
    },
  };
}
