// Candidate Cases service — Phase L
//
// 橋接 ENSO 前台 (Next.js :3000) 的 /api/candidate-cases endpoint。
// 跟 agentEvents.js 同架構：純 fetch、CORS、不碰 hexToken。
//
// candidates 的生命週期：
//   proposed  — 剛從 Live Trace 被 promote 進來，等人審
//   approved  — 有人審過，覺得值得 export 成 regression case
//   exported  — 已經複製 TS snippet 貼進 testCases.ts
//   archived  — 審查完認為不該加進 regression（例如重複 / 測試資料 / 沒意義）

import {
  getMockCandidates,
  isDemoMode,
  mockUpdateCandidateStatus,
} from './agentDemoMock';

const AGENT_API_BASE =
  import.meta.env.VITE_AGENT_API_BASE || 'http://localhost:3000';

/**
 * 讀取 candidate cases 清單。
 *
 * @param {object} [options]
 * @param {string} [options.status]   — 'proposed' | 'approved' | 'exported' | 'archived'
 * @param {string} [options.agentId]  — 'xiaohe' | 'xiaoxiang' | 'xiaoguan' | 'xiaodian'
 * @returns {Promise<{ cases: CandidateCase[], total: number }>}
 */
export async function fetchCandidates({ status, agentId } = {}) {
  // Demo 模式：跨 repo 後端不可達，回 mock 候選清單
  if (isDemoMode()) {
    let cases = getMockCandidates();
    if (status) cases = cases.filter((c) => c.status === status);
    if (agentId) cases = cases.filter((c) => c.agentId === agentId);
    return { cases, total: cases.length };
  }

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (agentId) params.set('agentId', agentId);

  const qs = params.toString();
  const url = `${AGENT_API_BASE}/api/candidate-cases${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, {
    method: 'GET',
    mode: 'cors',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `fetchCandidates ${res.status}: ${body.slice(0, 200) || res.statusText}`
    );
  }

  const data = await res.json();
  return {
    cases: Array.isArray(data.cases) ? data.cases : [],
    total: typeof data.total === 'number' ? data.total : 0,
  };
}

/**
 * 更新 candidate 的 status（proposed → approved / exported / archived）。
 *
 * @param {string} id
 * @param {'proposed'|'approved'|'exported'|'archived'} status
 * @returns {Promise<{ok: boolean, case: CandidateCase}>}
 */
export async function updateCandidateStatus(id, status) {
  // Demo 模式：模擬寫入成功，不打後端
  if (isDemoMode()) {
    return mockUpdateCandidateStatus(id, status);
  }

  const res = await fetch(`${AGENT_API_BASE}/api/candidate-cases`, {
    method: 'PATCH',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ id, status }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `updateCandidateStatus ${res.status}: ${body.slice(0, 200) || res.statusText}`
    );
  }
  return res.json();
}

// ============================================================================
// buildTestCaseSnippet — 把 candidate 轉成可貼進 testCases.ts 的 TS 片段
// ----------------------------------------------------------------------------
// 輸出的字串是一個 TestCase object literal（含 leading comma 方便 append）。
// checks[] 留空並加上 TODO 註解，由工程師決定要檢查什麼（因為每個 case 要查的
// behavior 不同，自動產生會亂；寧可讓人有意識地選）。
//
// 為什麼不直接產 `hasToolCall(...)`：expectedBehavior 是自然語言，自動轉規則
// 會踩雷。與其 50% 錯，不如明示 TODO。
// ============================================================================

// TestCase.tags 是強型別 union，我們把 candidate.tags 對應到允許值
const ALLOWED_TAGS = new Set([
  'happy-path',
  'edge-case',
  'safety',
  'handoff',
  'memory',
]);

function normalizeTag(raw) {
  if (!raw) return 'edge-case';
  const lower = String(raw).toLowerCase().trim();
  // 常見別名
  if (lower === 'happy' || lower === 'happypath') return 'happy-path';
  if (lower === 'edge' || lower === 'edgecase') return 'edge-case';
  return ALLOWED_TAGS.has(lower) ? lower : 'edge-case';
}

// 把字串變 TS string literal，處理雙引號、反斜線、換行
function toTsLiteral(str) {
  if (typeof str !== 'string') return '""';
  // 用雙引號字串，escape backslash / double-quote / 換行
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `"${escaped}"`;
}

export function buildTestCaseSnippet(candidate) {
  if (!candidate) return '';

  // tags：先 normalize，去重，至少保留一個
  const normalizedTags = Array.from(
    new Set((candidate.tags || []).map(normalizeTag))
  );
  const tagsArr = normalizedTags.length > 0 ? normalizedTags : ['edge-case'];

  // 用 candidate.id 作為 TestCase.id，但把 "cand_" prefix 拿掉，避免跟其他 case 撞
  const testCaseId = String(candidate.id || 'unnamed').replace(
    /^cand_/,
    'reg_'
  );

  // 取 expectedBehavior 的前 30 字當 name（夠人讀就好，不用完美）
  const derivedName =
    (candidate.expectedBehavior || '').slice(0, 30).trim() || 'promoted case';

  const lines = [
    '  {',
    `    id: ${toTsLiteral(testCaseId)},`,
    `    name: ${toTsLiteral(derivedName)},`,
    `    description: ${toTsLiteral(candidate.why || candidate.expectedBehavior || '')},`,
    `    userMessage: ${toTsLiteral(candidate.userMessage || '')},`,
    `    expectedAgent: ${toTsLiteral(candidate.agentId || 'xiaohe')},`,
    `    tags: [${tagsArr.map((t) => toTsLiteral(t)).join(', ')}],`,
    '    checks: [',
    '      // TODO: 根據 expectedBehavior 加 check。可用 primitives：',
    '      //   hasToolCall([...])        — 檢查有呼叫某個 tool',
    '      //   noToolCall([...])         — 檢查沒呼叫某個 tool',
    '      //   responseContainsAny([...])— 回覆包含任一關鍵字',
    '      //   responseDoesNotContain([])— 回覆不能包含某些字',
    '      //   responseLengthUnder(n)    — 回覆不超過 n 字',
    '      //   responseLengthOver(n)     — 回覆至少 n 字',
    '      //   responseNotEmpty()        — 回覆非空',
    `      // expectedBehavior: ${(candidate.expectedBehavior || '').replace(/\n/g, ' ')}`,
    '      responseNotEmpty(),',
    '    ],',
    '  },',
  ];

  return lines.join('\n');
}
