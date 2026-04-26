// AdminAgent — Agent 觀測 dashboard
//
// 從 ENSO 前台 (Next.js :3000) /api/events 拉 AgentEvent，計算 KPI / Eval 時間軸 /
// Intent 分佈 / Live Trace / 待改善 case。這是 "merchant console" 視角，給
// 商家看 agent 的真實表現。
//
// 為什麼要在 backend repo 而不是前台：
// - 前台是 buyer-facing (消費者端)，這個 dashboard 是給商家內部看的
// - 跟 AdminProducts / AdminOrders 共享同一組 admin layout + 權限檢查
// - demo 情境：PalUp 面試時我要能切到「商家視角」講故事

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import XiaodianChat from '../../components/admin/XiaodianChat';
import { isDemoMode, mockCreateCandidate } from '../../service/agentDemoMock';
import {
  calculateFunnel,
  calculateKpis,
  fetchAgentEvents,
  getEvalTimeline,
  getIntentDistribution,
  getLatestFailedCases,
  getRecentTrace,
} from '../../service/agentEvents';
import {
  buildTestCaseSnippet,
  fetchCandidates,
  updateCandidateStatus,
} from '../../service/candidateCases';

import styles from './AdminAgent.module.css';

const REFRESH_INTERVAL_MS = 15_000;

// 配色跟 AdminHome 對齊，延續京都美學
const INTENT_COLORS = ['#111111', '#984443', '#3A4D39', '#735C00', '#D1C7B7'];

const AGENT_LABEL = {
  xiaohe: '小禾',
  xiaoxiang: '小香',
  xiaoguan: '小管',
  xiaodian: '小店',
};

function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString('zh-TW', { hour12: false });
  } catch {
    return ts;
  }
}

function formatPct(v) {
  if (v == null) return '—';
  return `${Math.round(v * 100)}%`;
}

function getCaseTagClass(category) {
  switch (category) {
    case 'happy':
      return styles.caseTagHappy;
    case 'edge':
      return styles.caseTagEdge;
    case 'safety':
      return styles.caseTagSafety;
    case 'handoff':
      return styles.caseTagHandoff;
    default:
      return styles.caseTagEdge;
  }
}

function truncate(text, max = 80) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// Phase L: candidate-cases 後端位址（ENSO-Frontend Next.js）
// 抽 const 方便未來換 env
const CANDIDATE_API = 'http://localhost:3000/api/candidate-cases';

const AdminAgent = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  // Phase L-2: Live Trace「加進 regression」modal 狀態。
  // 存整個 event，modal 內用 agentId / userMessage / assistantText / timestamp
  // 來 pre-fill，使用者只要補 expectedBehavior / why / tags。
  const [candidateEvent, setCandidateEvent] = useState(null);
  // Phase L-3: 候選 case 清單狀態。
  // tabs: proposed (預設，待審) / approved / exported / archived
  // 不走 Redux——這張表只在 AdminAgent 用，local state 最省事。
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatesError, setCandidatesError] = useState(null);
  const [candidateFilter, setCandidateFilter] = useState('proposed');

  const load = useCallback(async () => {
    try {
      setError(null);
      const { events: data } = await fetchAgentEvents({ limit: 500 });
      setEvents(data);
      setLastFetch(new Date());
    } catch (err) {
      setError(err?.message || '無法連線 Agent Events API');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  // Phase L-3: candidates loader（不帶 filter，一次拿全部，前端切 tab）
  const loadCandidates = useCallback(async () => {
    try {
      setCandidatesError(null);
      const { cases } = await fetchCandidates();
      setCandidates(cases);
    } catch (err) {
      setCandidatesError(err?.message || '無法載入 candidates');
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCandidates();
    // 跟 events 同一個 interval 節奏，讓兩邊資料看起來同步
    const timer = setInterval(loadCandidates, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadCandidates]);

  // status 變更：optimistic 先改 UI，若失敗 rollback + 提示
  const handleCandidateStatusChange = useCallback(
    async (id, nextStatus) => {
      const prev = candidates;
      setCandidates((list) =>
        list.map((c) => (c.id === id ? { ...c, status: nextStatus } : c))
      );
      try {
        await updateCandidateStatus(id, nextStatus);
      } catch (err) {
        // rollback
        setCandidates(prev);
        setCandidatesError(err?.message || '更新狀態失敗');
      }
    },
    [candidates]
  );

  // 全部 selector 都 memo 化，避免每次 render 重算
  const kpis = useMemo(() => calculateKpis(events), [events]);
  const timeline = useMemo(() => getEvalTimeline(events), [events]);
  const intents = useMemo(() => getIntentDistribution(events), [events]);
  const trace = useMemo(() => getRecentTrace(events, 15), [events]);
  // Phase F：funnel 以 7 天為窗口（demo 時可看出完整路徑）
  const funnel = useMemo(() => calculateFunnel(events, 7), [events]);
  const { cases: failedCases, timestamp: failedTs } = useMemo(
    () => getLatestFailedCases(events),
    [events]
  );

  const passRateFootClass =
    kpis.latestPassRate == null
      ? ''
      : kpis.latestPassRate >= 0.8
        ? styles.kpiFootPassRate
        : `${styles.kpiFootPassRate} ${styles.kpiFootPassRateLow}`;

  return (
    <div className="min-h-screen bg-[#FAF9F6] px-3 py-3 md:px-6 md:py-12 font-sans text-[#111111]">
      {/* ===== Header ===== */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-20">
        <div className="flex flex-row md:items-end justify-between gap-3 md:gap-8 border-b border-[#D1C7B7] pb-3 md:pb-10 relative">
          <div className="absolute -bottom-[1px] left-0 w-24 h-[1px] bg-[#984443]"></div>
          <div className="min-w-0">
            <div className="text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.3em] md:tracking-[0.6em] text-[#984443] font-bold mb-1 md:mb-4 opacity-80">
              Agent Telemetry
            </div>
            <h2 className="font-serif text-lg md:text-5xl font-medium tracking-tight text-[#111111]">
              使者觀測
              <span className="hidden md:inline text-[0.5em] ml-4 opacity-20 font-sans tracking-widest uppercase">
                AGENT OBSERVABILITY
              </span>
            </h2>
          </div>
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 shrink-0 self-end items-end">
            <span className={styles.liveDot}>
              <span className={styles.liveDotPing} />
              {error ? '事件流中斷' : '事件流接收中'}
            </span>
            <button
              type="button"
              className="group relative px-3 md:px-8 py-2 md:py-4 overflow-hidden transition-all duration-700 bg-[#111111] shadow-xl hover:shadow-[#984443]/20 disabled:opacity-40"
              onClick={handleRefresh}
              disabled={refreshing || loading}
            >
              <span className="relative text-[0.75rem] md:text-[0.75rem] uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold text-white whitespace-nowrap">
                {refreshing ? '載入中…' : '重新整理'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== Error banner（僅在 fetch 失敗時出現） ===== */}
      {error && (
        <div className={styles.errorBanner}>
          <strong>EVENT API ERROR</strong>
          {error}
          <br />
          <small>
            請確認 ENSO 前台 (Next.js) 已啟動於 VITE_AGENT_API_BASE 指定的
            host。
          </small>
        </div>
      )}

      {/* ===== KPI 4 格 ===== */}
      <div className={styles.kpiGrid}>
        <div
          className={`${styles.kpiCard} ${styles.kpiCardDark}`}
          data-glyph="使"
        >
          <div className={styles.kpiLabel}>24h 對話量</div>
          <div className={styles.kpiValue}>
            {kpis.turns24h}
            <span className={styles.kpiValueUnit}>turns</span>
          </div>
          <div className={styles.kpiFoot}>Conversation turns</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>24h Handoff</div>
          <div className={styles.kpiValue}>
            {kpis.handoffs24h}
            <span className={styles.kpiValueUnit}>次</span>
          </div>
          <div className={styles.kpiFoot}>Agent-to-agent transfers</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>平均 Tool Call</div>
          <div className={styles.kpiValue}>
            {kpis.avgToolCalls.toFixed(2)}
            <span className={styles.kpiValueUnit}>/ turn</span>
          </div>
          <div className={styles.kpiFoot}>Tool invocations per turn</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>最新 Eval Pass Rate</div>
          <div className={styles.kpiValue}>
            {formatPct(kpis.latestPassRate)}
          </div>
          <div className={`${styles.kpiFoot} ${passRateFootClass}`}>
            {kpis.latestEvalTimestamp
              ? `Last eval · ${new Date(kpis.latestEvalTimestamp).toLocaleDateString('zh-TW')}`
              : '尚無 eval 資料'}
          </div>
        </div>
      </div>

      {/* ===== Phase F: 商業成果 Funnel =====

          為什麼放在 KPI 下方、Eval 上方？
          - KPI 看當下健康度（流量、handoff、pass rate）
          - Funnel 看商業成果（chat → 加車 → 下單）← 這是 PalUp JD 點名的 "商業成果視角"
          - Eval 看 agent 品質（pass rate 時間軸）
          三個區塊從「量 → 轉 → 質」一條線下來，demo 時講故事比較順。

          分母只用有 sessionId 的事件——這保證 funnel 是真實的 per-session 行為，
          不會混到舊的 event（F-1 之前沒 sessionId 的 conversation_turn 會被 skip）。
       */}
      <div className={styles.widget}>
        <div className={styles.funnelHeaderRow}>
          <div>
            <h3 className={styles.widgetTitle}>商業成果 Funnel</h3>
            <span className={styles.widgetSub}>
              Chat → Add-to-cart → Order · last {funnel.windowDays} days
            </span>
          </div>
          <div className={styles.funnelSummary}>
            <div className={styles.funnelSummaryItem}>
              <span className={styles.funnelSummaryLabel}>Overall</span>
              <span className={styles.funnelSummaryValue}>
                {funnel.overallConversionRate}
                <em>%</em>
              </span>
            </div>
            <div className={styles.funnelSummaryItem}>
              <span className={styles.funnelSummaryLabel}>AOV</span>
              <span className={styles.funnelSummaryValue}>
                NT$ {funnel.averageOrderValue.toLocaleString('zh-TW')}
              </span>
            </div>
            <div className={styles.funnelSummaryItem}>
              <span className={styles.funnelSummaryLabel}>Revenue</span>
              <span className={styles.funnelSummaryValue}>
                NT$ {funnel.totalRevenue.toLocaleString('zh-TW')}
              </span>
            </div>
          </div>
        </div>
        {funnel.conversations === 0 ? (
          <div className={styles.funnelEmptyNote}>
            尚無附 sessionId 的對話事件 — 前台聊一輪會話後重新整理即可看到數據
          </div>
        ) : (
          <div className={styles.funnelStages}>
            {/* Stage 1: Conversations（分母） */}
            <div className={styles.funnelStage}>
              <span className={styles.funnelStageLabel}>Conversations</span>
              <div className={styles.funnelStageBar}>
                <div
                  className={styles.funnelStageFill}
                  style={{ width: '100%' }}
                />
                <span className={styles.funnelStageCount}>
                  {funnel.conversations}
                </span>
              </div>
              <span className={styles.funnelStageRate}>100%</span>
            </div>
            {/* Stage 2: Added-to-cart */}
            <div className={styles.funnelStage}>
              <span className={styles.funnelStageLabel}>Added to cart</span>
              <div className={styles.funnelStageBar}>
                <div
                  className={styles.funnelStageFill}
                  style={{
                    width: `${Math.min(
                      100,
                      (funnel.addedToCart / funnel.conversations) * 100
                    )}%`,
                  }}
                />
                <span className={styles.funnelStageCount}>
                  {funnel.addedToCart}
                </span>
              </div>
              <span className={styles.funnelStageRate}>
                {funnel.chatToCartRate}%
              </span>
            </div>
            {/* Stage 3: Ordered */}
            <div className={styles.funnelStage}>
              <span className={styles.funnelStageLabel}>Ordered</span>
              <div className={styles.funnelStageBar}>
                <div
                  className={styles.funnelStageFill}
                  style={{
                    width: `${Math.min(
                      100,
                      (funnel.ordered / funnel.conversations) * 100
                    )}%`,
                  }}
                />
                <span className={styles.funnelStageCount}>
                  {funnel.ordered}
                </span>
              </div>
              <span className={styles.funnelStageRate}>
                {funnel.cartToOrderRate}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ===== Widget 1: Eval 時間軸 ===== */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h3 className={styles.widgetTitle}>Eval 通過率時間軸</h3>
          <span className={styles.widgetSub}>Pass rate over time</span>
        </div>
        {timeline.length === 0 ? (
          <div className={styles.emptyState}>
            尚無 eval_run 事件 — 請先從前台 Eval Suite 執行一次評測
          </div>
        ) : (
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={timeline}
                margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="evalFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3A4D39" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3A4D39" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#111111', opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 10, fill: '#111111', opacity: 0.4 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FAF9F6',
                    border: '1px solid #D1C7B7',
                    borderRadius: 0,
                    fontSize: 12,
                  }}
                  formatter={(v) => [`${v}%`, 'Pass rate']}
                />
                <Area
                  type="monotone"
                  dataKey="passRate"
                  stroke="#3A4D39"
                  strokeWidth={2}
                  fill="url(#evalFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ===== 2-col: Intent pie + Live Trace ===== */}
      <div className={styles.twoColGrid}>
        {/* Widget 2: Intent 分佈 */}
        <div className={styles.widget}>
          <div className={styles.widgetHeader}>
            <h3 className={styles.widgetTitle}>Intent 分佈</h3>
            <span className={styles.widgetSub}>User intent distribution</span>
          </div>
          {intents.length === 0 ? (
            <div className={styles.emptyState}>尚無對話事件</div>
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={intents}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {intents.map((_, i) => (
                      <Cell
                        key={`intent-${i}`}
                        fill={INTENT_COLORS[i % INTENT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FAF9F6',
                      border: '1px solid #D1C7B7',
                      borderRadius: 0,
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Widget 3: Live Trace（終端機風，呼應 AdminHome 的 MQTT log） */}
        <div className={styles.traceWidget}>
          <h3 className={styles.traceTitle}>Live Trace · Agent Events</h3>
          {trace.length === 0 ? (
            <div className={styles.traceDim}>[ waiting for events... ]</div>
          ) : (
            <div className={styles.traceList}>
              {trace.map((e, idx) => (
                <TraceLine
                  key={`${e.timestamp}-${idx}`}
                  event={e}
                  onPromoteCase={setCandidateEvent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Widget 4.5: 小店 Ops Copilot ===== */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h3 className={styles.widgetTitle}>跟小店對話</h3>
          <span className={styles.widgetSub}>Ask the Ops Copilot</span>
        </div>
        <p
          style={{
            fontSize: '0.82rem',
            lineHeight: 1.65,
            color: 'rgba(17,17,17,0.6)',
            margin: '0 0 1.25rem',
            letterSpacing: '0.02em',
          }}
        >
          小店是商家視角的 AI 營運助理，會呼叫{' '}
          <code style={{ color: '#735C00' }}>get_sales_summary</code>、
          <code style={{ color: '#735C00' }}>get_top_intents</code>、
          <code style={{ color: '#735C00' }}>get_agent_performance</code>、
          <code style={{ color: '#735C00' }}>get_recent_complaints</code>、
          <code style={{ color: '#735C00' }}>get_eval_history</code> 這 5 支
          tool 讀上方儀表板同一份事件流，回答你對 agent 表現的提問。
        </p>
        <XiaodianChat />
      </div>

      {/* ===== Widget 4: 待改善 case ===== */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h3 className={styles.widgetTitle}>待改善 Case</h3>
          <span className={styles.widgetSub}>
            {failedTs
              ? `From eval · ${new Date(failedTs).toLocaleString('zh-TW', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Latest failed cases'}
          </span>
        </div>
        {failedCases.length === 0 ? (
          <div className={styles.emptyState}>
            {failedTs
              ? '上一輪 eval 全通過 — 值得一杯抹茶。'
              : '尚無 eval_run 事件'}
          </div>
        ) : (
          <div className={styles.caseList}>
            {failedCases.map((c) => (
              <div key={c.id} className={styles.caseItem}>
                <div className={styles.caseBody}>
                  <div className={styles.caseMeta}>{c.id}</div>
                  <div className={styles.caseTitle}>{c.title}</div>
                  <div className={styles.caseReason}>{c.reason}</div>
                </div>
                <span
                  className={`${styles.caseTag} ${getCaseTagClass(c.category)}`}
                >
                  {c.category || 'edge'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Widget 5 (Phase L-3): Candidates Pool — Self-improvement loop 的審查面板 ===== */}
      <div className={styles.widget}>
        <div className={styles.widgetHeader}>
          <h3 className={styles.widgetTitle}>Regression Candidates</h3>
          <span className={styles.widgetSub}>
            從 Live Trace promote 進來的待審 cases
          </span>
        </div>
        <p
          style={{
            fontSize: '0.82rem',
            lineHeight: 1.65,
            color: 'rgba(17,17,17,0.6)',
            margin: '0 0 1rem',
            letterSpacing: '0.02em',
          }}
        >
          審過的 case 按 <strong>Copy TS Snippet</strong> 複製貼進{' '}
          <code style={{ color: '#735C00' }}>
            src/services/agent/evals/testCases.ts
          </code>
          ，就成為下一輪 regression 測試的一部分。這就是 agent 自我改善的閉環：
          Live Trace → 審查 → Regression → 下次部署前擋住同樣錯誤。
        </p>

        <CandidatesPanel
          candidates={candidates}
          loading={candidatesLoading}
          error={candidatesError}
          filter={candidateFilter}
          onFilterChange={setCandidateFilter}
          onStatusChange={handleCandidateStatusChange}
        />
      </div>

      {/* ===== Phase L-2: Candidate Case Modal（fixed overlay，放 root 末尾確保在最上層） ===== */}
      {candidateEvent && (
        <CandidateCaseModal
          event={candidateEvent}
          apiUrl={CANDIDATE_API}
          onClose={() => setCandidateEvent(null)}
          onSubmitted={loadCandidates}
        />
      )}
    </div>
  );
};

// Trace row — 依 event kind 著色
// Phase L-2: conversation_turn row 帶「加進 regression」按鈕，點了會 bubble 上去
// 開 CandidateCaseModal。其他 kind（handoff / eval_run）不給 promote——這些是系統
// 事件，不是「agent 在某個 turn 的表現」，納入 regression 意義不大。
const TraceLine = ({ event, onPromoteCase }) => {
  const time = formatTime(event.timestamp);

  if (event.kind === 'conversation_turn') {
    const agentName = AGENT_LABEL[event.agentId] || event.agentId;
    return (
      <div className={styles.traceItem}>
        <span className={styles.traceTime}>[{time}]</span>
        <span className={styles.traceKindTurn}>TURN</span>
        <span className={styles.traceDim}> · {agentName}</span>
        {onPromoteCase && (
          <button
            type="button"
            className={styles.tracePromoteBtn}
            onClick={() => onPromoteCase(event)}
            aria-label="將這個對話加進 regression test"
            title="加進 regression"
          >
            + regression
          </button>
        )}
        <div className={styles.traceBody}>
          &gt; {truncate(event.userMessage, 80)}
          {event.toolCalls?.length > 0 && (
            <div>
              {event.toolCalls.map((t, i) => (
                <span key={`tc-${i}`} className={styles.traceToolCall}>
                  {t.name}()
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (event.kind === 'handoff') {
    const fromName = AGENT_LABEL[event.from] || event.from;
    const toName = AGENT_LABEL[event.to] || event.to;
    return (
      <div className={styles.traceItem}>
        <span className={styles.traceTime}>[{time}]</span>
        <span className={styles.traceKindHandoff}>HANDOFF</span>
        <div className={styles.traceBody}>
          {fromName} → {toName} · {event.reason}
        </div>
      </div>
    );
  }

  if (event.kind === 'eval_run') {
    return (
      <div className={styles.traceItem}>
        <span className={styles.traceTime}>[{time}]</span>
        <span className={styles.traceKindEval}>EVAL</span>
        <div className={styles.traceBody}>
          pass {Math.round(event.passRate * 100)}% · {event.passed}/
          {event.total} · {event.adapterName}
        </div>
      </div>
    );
  }

  return null;
};

// ============================================================================
// Phase L-2: CandidateCaseModal
// ----------------------------------------------------------------------------
// 把 Live Trace 的一則 conversation_turn event promote 成一個「待審查的
// regression test case」——寫到 ENSO-Frontend 的 /api/candidate-cases。
//
// 設計原則：
//  - userMessage / agentId / assistantText / timestamp 全部 pre-fill 且不可編輯。
//    regression 的 ground truth 就是「當時真的發生的事」，改掉就沒 regression 意義。
//  - expectedBehavior / why / tags 由運營人填。
//    expectedBehavior 是人工定義「我要 agent 怎麼做」，不能自動產。
//  - submit 成功後 1.2 秒自動關 modal（給使用者看到「已送出」確認）。
//  - 用原生 fetch + CORS；不走 axios 避免再依賴 ENSO-BackEnd 沒裝的東西。
// ============================================================================
const CandidateCaseModal = ({ event, apiUrl, onClose, onSubmitted }) => {
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [why, setWhy] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const agentName = AGENT_LABEL[event.agentId] || event.agentId;
  const eventTimeStr = (() => {
    try {
      return new Date(event.timestamp).toLocaleString('zh-TW', {
        hour12: false,
      });
    } catch {
      return event.timestamp;
    }
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitStatus === 'submitting') return;
    // （後面 submit 成功時會 call onSubmitted，用來刷新 candidates 清單）

    // 基本驗證：expectedBehavior 與 why 都必填（regression case 沒理由就沒用）
    if (!expectedBehavior.trim()) {
      setErrorMsg('請填寫「預期的行為」');
      setSubmitStatus('error');
      return;
    }
    if (!why.trim()) {
      setErrorMsg('請填寫「為什麼納入 regression」');
      setSubmitStatus('error');
      return;
    }

    // tags 用逗號分隔，trim 後過濾空字串
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      source: 'live_trace',
      sourceEventTimestamp: event.timestamp,
      agentId: event.agentId,
      userMessage: event.userMessage,
      assistantText: event.assistantText || '',
      expectedBehavior: expectedBehavior.trim(),
      why: why.trim(),
      tags,
    };

    setSubmitStatus('submitting');
    setErrorMsg('');
    try {
      if (isDemoMode()) {
        // Demo 模式：模擬寫入成功，不打跨 repo POST
        mockCreateCandidate(payload);
      } else {
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${res.status}`);
        }
      }
      setSubmitStatus('success');
      // 通知上層刷新 candidates list
      if (typeof onSubmitted === 'function') {
        onSubmitted();
      }
      // 1.2s 後自動關閉，讓使用者看到成功訊息
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setErrorMsg(err?.message || '送出失敗，請稍後再試');
      setSubmitStatus('error');
    }
  };

  const handleBackdropClick = (e) => {
    // 只有點到 backdrop 本身（不是 content）才關
    if (e.target === e.currentTarget && submitStatus !== 'submitting') {
      onClose();
    }
  };

  return (
    <div
      className={styles.candidateModalBackdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-modal-title"
    >
      <div className={styles.candidateModalContent}>
        <div className={styles.candidateModalHeader}>
          <h3 id="candidate-modal-title" className={styles.candidateModalTitle}>
            加進 Regression Test
          </h3>
          <button
            type="button"
            className={styles.candidateModalClose}
            onClick={onClose}
            disabled={submitStatus === 'submitting'}
            aria-label="關閉視窗"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.candidateModalForm}>
          {/* ----- 顯示區：來源 event 的 ground truth，唯讀 ----- */}
          <div className={styles.candidateModalSection}>
            <div className={styles.candidateModalLabel}>來源 Agent</div>
            <div className={styles.candidateModalValue}>
              {agentName} ·{' '}
              <span style={{ opacity: 0.6 }}>{event.agentId}</span>
            </div>
          </div>

          <div className={styles.candidateModalSection}>
            <div className={styles.candidateModalLabel}>發生時間</div>
            <div className={styles.candidateModalValue}>{eventTimeStr}</div>
          </div>

          <div className={styles.candidateModalSection}>
            <div className={styles.candidateModalLabel}>User Message</div>
            <div className={styles.candidateModalValueBlock}>
              {event.userMessage}
            </div>
          </div>

          {event.assistantText && (
            <div className={styles.candidateModalSection}>
              <div className={styles.candidateModalLabel}>
                Assistant 回覆（參考，不會寫入 regression）
              </div>
              <div className={styles.candidateModalValueBlock}>
                {event.assistantText}
              </div>
            </div>
          )}

          {/* ----- 填寫區 ----- */}
          <div className={styles.candidateModalSection}>
            <label
              className={styles.candidateModalLabel}
              htmlFor="candidate-expected"
            >
              預期的行為 <span style={{ color: '#984443' }}>*</span>
            </label>
            <textarea
              id="candidate-expected"
              className={styles.candidateModalTextarea}
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              placeholder="這個 case 期待 agent 怎麼表現？例如：應該先問使用情境再推薦，而不是直接丟商品。"
              rows={3}
              disabled={submitStatus === 'submitting'}
              required
            />
          </div>

          <div className={styles.candidateModalSection}>
            <label
              className={styles.candidateModalLabel}
              htmlFor="candidate-why"
            >
              為什麼值得納入 regression{' '}
              <span style={{ color: '#984443' }}>*</span>
            </label>
            <textarea
              id="candidate-why"
              className={styles.candidateModalTextarea}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="為什麼這個 case 重要？例如：這是 agent 常錯的 pattern，或這次修好後不能再壞。"
              rows={2}
              disabled={submitStatus === 'submitting'}
              required
            />
          </div>

          <div className={styles.candidateModalSection}>
            <label
              className={styles.candidateModalLabel}
              htmlFor="candidate-tags"
            >
              Tags（逗號分隔，例如 handoff, memory, tool_use）
            </label>
            <input
              id="candidate-tags"
              type="text"
              className={styles.candidateModalInput}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="handoff, memory, safety"
              disabled={submitStatus === 'submitting'}
            />
          </div>

          {/* ----- 狀態訊息 ----- */}
          {submitStatus === 'error' && errorMsg && (
            <div className={styles.candidateModalError}>⚠ {errorMsg}</div>
          )}
          {submitStatus === 'success' && (
            <div className={styles.candidateModalSuccess}>
              ✓ 已送出！狀態：proposed。到 Candidates 面板審查。
            </div>
          )}

          {/* ----- 動作按鈕 ----- */}
          <div className={styles.candidateModalActions}>
            <button
              type="button"
              className={styles.candidateModalBtnSecondary}
              onClick={onClose}
              disabled={submitStatus === 'submitting'}
            >
              取消
            </button>
            <button
              type="submit"
              className={styles.candidateModalBtnPrimary}
              disabled={
                submitStatus === 'submitting' || submitStatus === 'success'
              }
            >
              {submitStatus === 'submitting'
                ? '送出中…'
                : submitStatus === 'success'
                  ? '已送出'
                  : '送出提案'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// Phase L-3: CandidatesPanel — 列出 candidate cases 並支援審核 / 匯出
// ----------------------------------------------------------------------------
// 四個 status tab（proposed / approved / exported / archived），
// 每個 card 顯示 meta + body + 三個操作按鈕：
//   - Copy TS Snippet: 把 candidate 轉成 TestCase literal 丟到剪貼簿
//   - Approve:  proposed → approved
//   - Archive:  * → archived（軟刪除）
//   - Mark Exported: approved → exported（代表工程師已把 snippet 貼進 testCases.ts）
//
// 設計選擇：為何不在前端直接改 testCases.ts？
//   - 改 TS 需要 parse + 重新 lint + commit，應該由工程師手動確認。
//   - copy-to-clipboard + pull request 才是該走的 flow。
// ============================================================================

const STATUS_LABEL = {
  proposed: '待審',
  approved: '已批准',
  exported: '已匯出',
  archived: '已封存',
};

const CANDIDATE_TABS = ['proposed', 'approved', 'exported', 'archived'];

const CandidatesPanel = ({
  candidates,
  loading,
  error,
  filter,
  onFilterChange,
  onStatusChange,
}) => {
  // 用 state 記錄哪個 candidate 剛被 copy，顯示 checkmark 1.5s
  const [copiedId, setCopiedId] = useState(null);

  // 算每個 status 的數量（tab 顯示用）
  const counts = useMemo(() => {
    const out = { proposed: 0, approved: 0, exported: 0, archived: 0 };
    for (const c of candidates) {
      if (out[c.status] != null) out[c.status] += 1;
    }
    return out;
  }, [candidates]);

  const filtered = useMemo(
    () => candidates.filter((c) => c.status === filter),
    [candidates, filter]
  );

  const handleCopy = async (candidate) => {
    const snippet = buildTestCaseSnippet(candidate);
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedId(candidate.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // fallback：用 textarea + execCommand（舊瀏覽器或 non-HTTPS context）
      const ta = document.createElement('textarea');
      ta.value = snippet;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        setCopiedId(candidate.id);
        setTimeout(() => setCopiedId(null), 1500);
      } catch {
        // 真的不行就算了
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <div>
      {/* ----- Status tabs ----- */}
      <div className={styles.candidateTabs}>
        {CANDIDATE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`${styles.candidateTab} ${
              filter === tab ? styles.candidateTabActive : ''
            }`}
            onClick={() => onFilterChange(tab)}
          >
            {STATUS_LABEL[tab]}
            <span className={styles.candidateTabCount}>
              ({counts[tab] || 0})
            </span>
          </button>
        ))}
      </div>

      {/* ----- Body ----- */}
      {error && <div className={styles.candidateMsgError}>⚠ {error}</div>}

      {loading && candidates.length === 0 ? (
        <div className={styles.emptyState}>載入中…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          {filter === 'proposed'
            ? '目前沒有待審 case — 從 Live Trace 的「+ regression」按鈕新增。'
            : `沒有 ${STATUS_LABEL[filter]} 的 case。`}
        </div>
      ) : (
        <div className={styles.candidateList}>
          {filtered.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              copied={copiedId === c.id}
              onCopy={() => handleCopy(c)}
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CandidateCard — 單一 candidate 的列表項
// ============================================================================
const CandidateCard = ({ candidate, copied, onCopy, onStatusChange }) => {
  const agentName = AGENT_LABEL[candidate.agentId] || candidate.agentId;
  const created = (() => {
    try {
      return new Date(candidate.createdAt).toLocaleString('zh-TW', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return candidate.createdAt;
    }
  })();

  return (
    <div className={styles.candidateCard}>
      {/* Meta row */}
      <div className={styles.candidateMeta}>
        <span className={styles.candidateAgentPill}>{agentName}</span>
        <span className={styles.candidateMetaDim}>· {created}</span>
        {candidate.source === 'live_trace' && (
          <span className={styles.candidateSourceBadge}>live trace</span>
        )}
        {(candidate.tags || []).map((t) => (
          <span key={t} className={styles.candidateTag}>
            #{t}
          </span>
        ))}
        <span
          className={`${styles.candidateStatus} ${
            styles[`candidateStatus_${candidate.status}`] || ''
          }`}
        >
          {STATUS_LABEL[candidate.status] || candidate.status}
        </span>
      </div>

      {/* Body */}
      <div className={styles.candidateBody}>
        <div className={styles.candidateField}>
          <div className={styles.candidateFieldLabel}>User</div>
          <div className={styles.candidateFieldValue}>
            {candidate.userMessage}
          </div>
        </div>
        <div className={styles.candidateField}>
          <div className={styles.candidateFieldLabel}>Expected</div>
          <div className={styles.candidateFieldValue}>
            {candidate.expectedBehavior}
          </div>
        </div>
        {candidate.why && (
          <div className={styles.candidateField}>
            <div className={styles.candidateFieldLabel}>Why</div>
            <div className={styles.candidateFieldValueDim}>{candidate.why}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.candidateActions}>
        <button
          type="button"
          className={styles.candidateBtnPrimary}
          onClick={onCopy}
          title="複製 TS snippet 貼進 testCases.ts"
        >
          {copied ? '✓ 已複製' : 'Copy TS Snippet'}
        </button>

        {candidate.status === 'proposed' && (
          <button
            type="button"
            className={styles.candidateBtnSecondary}
            onClick={() => onStatusChange(candidate.id, 'approved')}
            title="批准：同意加進 regression"
          >
            Approve
          </button>
        )}

        {candidate.status === 'approved' && (
          <button
            type="button"
            className={styles.candidateBtnSecondary}
            onClick={() => onStatusChange(candidate.id, 'exported')}
            title="標記為已匯出（已貼進 testCases.ts）"
          >
            Mark Exported
          </button>
        )}

        {candidate.status !== 'archived' && (
          <button
            type="button"
            className={styles.candidateBtnGhost}
            onClick={() => onStatusChange(candidate.id, 'archived')}
            title="封存（不納入 regression）"
          >
            Archive
          </button>
        )}

        {candidate.status === 'archived' && (
          <button
            type="button"
            className={styles.candidateBtnGhost}
            onClick={() => onStatusChange(candidate.id, 'proposed')}
            title="放回待審佇列"
          >
            Restore
          </button>
        )}
      </div>
    </div>
  );
};

export default AdminAgent;
