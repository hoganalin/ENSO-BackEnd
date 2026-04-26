// xiaodianChat — 小店 agent 對話 loop
//
// 流程：
//   userText → 呼叫 /api/agent（前台 proxy）→ 拿到 tool_use 就本地執行 → 再送 → ... → end_turn
//   最多跑 MAX_ROUNDS 輪防爆，避免 infinite loop。
//
// 對外 API：
//   sendXiaodianMessage(priorMessages, userText) → Promise<{ messages, finalText }>
//
//   messages 是一個「conversation state」array，shape 對齊前台 ChatMessage：
//     { id, role: 'user' | 'assistant' | 'tool', text?, toolCalls?, toolResults?, createdAt }
//
//   UI 只要無腦把新的 messages 整包塞回 state 就行，render 時依 role 切不同樣式。

import { getMockAgentResponse, isDemoMode } from './agentDemoMock';
import {
  XIAODIAN_SYSTEM_PROMPT,
  XIAODIAN_TOOL_SCHEMAS,
} from './xiaodianPersona';
import { executeXiaodianTool } from './xiaodianTools';

const AGENT_API_BASE =
  import.meta.env.VITE_AGENT_API_BASE || 'http://localhost:3000';

const AGENT_ENDPOINT = `${AGENT_API_BASE}/api/agent`;

// 最多跑幾輪 tool_use <-> tool_result 來回。一般 1-2 輪就 end_turn；設 5 當防呆。
const MAX_ROUNDS = 5;

// 簡單 id 產生器（訊息用）
function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/**
 * 呼叫前台 /api/agent proxy，拿到 Anthropic 的一輪回應。
 *
 * @param {Array} messages — ChatMessage[]，會在 server side 由 toAnthropicMessages 轉格式
 * @returns {Promise<{ text?: string, toolCalls?: Array, stopReason: string, usage?: object }>}
 */
async function callAgentApi(messages) {
  // Demo 模式：/api/agent 不可達，回 canned response 讓 chat 不炸 404
  if (isDemoMode()) {
    return getMockAgentResponse();
  }

  const res = await fetch(AGENT_ENDPOINT, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      systemPrompt: XIAODIAN_SYSTEM_PROMPT,
      tools: XIAODIAN_TOOL_SCHEMAS,
      agentId: 'xiaodian',
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error || body.detail || '';
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(
      `/api/agent ${res.status}: ${detail.slice(0, 200) || res.statusText}`
    );
  }

  return res.json();
}

/**
 * 主入口：送一則 user message，跑完 agent loop 拿到最後回答。
 *
 * @param {Array} priorMessages — 既有對話 state（會被保留，不 mutate）
 * @param {string} userText — 使用者這次輸入
 * @returns {Promise<{ messages: Array, finalText: string }>}
 */
export async function sendXiaodianMessage(priorMessages, userText) {
  const now = Date.now();

  // 1. 先 append user 訊息
  const messages = [
    ...priorMessages,
    {
      id: makeId('user'),
      role: 'user',
      text: userText,
      createdAt: now,
    },
  ];

  // 2. 進 loop
  let finalText = '';
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const res = await callAgentApi(messages);

    // 2a. append assistant 訊息
    const assistantMsg = {
      id: makeId('assistant'),
      role: 'assistant',
      agentId: 'xiaodian',
      text: res.text,
      toolCalls: res.toolCalls,
      createdAt: Date.now(),
    };
    messages.push(assistantMsg);

    if (res.text) finalText = res.text;

    // 2b. 若 Claude 要求 tool_use，就本地執行每一支並 append tool 訊息
    if (
      res.stopReason === 'tool_use' &&
      Array.isArray(res.toolCalls) &&
      res.toolCalls.length > 0
    ) {
      const toolResults = [];
      for (const tc of res.toolCalls) {
        const exec = await executeXiaodianTool(tc.name, tc.input);
        toolResults.push({
          tool_use_id: tc.id,
          content: exec.content,
          is_error: exec.is_error,
        });
      }
      messages.push({
        id: makeId('tool'),
        role: 'tool',
        toolResults,
        createdAt: Date.now(),
      });
      // 繼續下一輪讓 Claude 基於 tool_result 生成最終回答
      continue;
    }

    // 2c. end_turn / max_tokens / 其他 stopReason → 結束
    break;
  }

  if (!finalText) {
    finalText =
      '（小店暫時沒有回覆文字。可能 tool 回傳的資料不足以回答，或者連續 5 輪都在呼叫 tool。）';
  }

  return { messages, finalText };
}
