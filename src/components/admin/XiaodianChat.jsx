// XiaodianChat — 商家對話「小店」的 chat widget
//
// 用途：嵌在 AdminAgent 儀表板內，讓商家即時問關於 agent 表現的問題。
// 小店會呼叫 tools（get_sales_summary / get_top_intents / ...）讀 event stream
// 再生成自然語言回覆。Tool calls 會直接在 UI 上顯示，方便 demo 說故事。

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { sendXiaodianMessage } from '../../service/xiaodianChat';
import { XIAODIAN_TOOL_LABEL } from '../../service/xiaodianPersona';

import styles from './XiaodianChat.module.css';

const GREETING = {
  id: 'greeting',
  role: 'assistant',
  agentId: 'xiaodian',
  text: '我是小店 🏮 你的 AI 營運助理。問我「最近表現怎樣」「大家都在問什麼」「誰比較忙」「有哪些客訴」——我會直接查資料回你。',
  createdAt: 0,
};

const SUGGESTED_PROMPTS = [
  '最近 24 小時表現怎樣？',
  '使用者都在問哪類問題？',
  '三位 agent 誰最忙？',
  '最新 eval 有哪些失敗案例？',
  '品質趨勢有沒有變好？',
];

/**
 * 將一則 tool_use input 的物件壓扁成短字串供 UI 顯示。
 * { hours: 168 } → "hours: 168"
 */
function formatToolInput(input) {
  if (!input || typeof input !== 'object') return '';
  const entries = Object.entries(input);
  if (entries.length === 0) return '(無參數)';
  return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ');
}

export default function XiaodianChat() {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // 新訊息進來自動捲到底
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  const handleSend = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || isSending) return;

      setError(null);
      setIsSending(true);
      setInput('');

      // 樂觀 UI：先把使用者訊息塞進去
      const optimistic = [
        ...messages,
        {
          id: `user-opt-${Date.now()}`,
          role: 'user',
          text,
          createdAt: Date.now(),
        },
      ];
      setMessages(optimistic);

      try {
        // 送出時不帶樂觀 user message，讓 service 內部統一造
        const { messages: nextMessages } = await sendXiaodianMessage(
          messages,
          text,
        );
        setMessages(nextMessages);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        // 樂觀 user message 留在 UI 上，讓使用者知道是他剛送了什麼
      } finally {
        setIsSending(false);
      }
    },
    [input, isSending, messages],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // 把 messages 串成 render 用的 rows：
  // assistant message 後面可能緊跟著 tool message（toolResults）——我們把
  // tool_use + 對應 tool_result 合併顯示在同一個 assistant row 下方。
  const rows = [];
  for (let i = 0; i < messages.length; i += 1) {
    const m = messages[i];
    if (m.role === 'tool') {
      // tool 訊息由前一個 assistant row 負責顯示（包含 is_error 狀態）
      continue;
    }
    if (m.role === 'assistant') {
      // 找緊跟著的 tool message（若有）
      const next = messages[i + 1];
      const toolResults =
        next && next.role === 'tool' ? next.toolResults ?? [] : [];
      rows.push({ kind: 'assistant', msg: m, toolResults });
      continue;
    }
    if (m.role === 'user') {
      rows.push({ kind: 'user', msg: m });
    }
  }

  return (
    <div className={styles.chat}>
      <div className={styles.chatHeader}>
        <h3 className={styles.chatTitle}>
          <span className={styles.chatTitleAvatar}>店</span>
          小店・AI 營運助理
        </h3>
        <span className={styles.chatSub}>Xiaodian・Ops Copilot</span>
      </div>

      <div className={styles.messages} ref={scrollRef}>
        {rows.map((row) => {
          if (row.kind === 'user') {
            return (
              <div
                key={row.msg.id}
                className={`${styles.msgRow} ${styles.msgRowUser}`}
              >
                <div className={`${styles.bubble} ${styles.bubbleUser}`}>
                  {row.msg.text}
                </div>
              </div>
            );
          }
          // assistant row
          const { msg, toolResults } = row;
          const hasText = !!msg.text;
          const hasToolCalls =
            Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0;
          return (
            <div
              key={msg.id}
              className={`${styles.msgRow} ${styles.msgRowAssistant}`}
            >
              {hasText && (
                <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
                  {msg.text}
                </div>
              )}
              {hasToolCalls && (
                <div className={styles.toolCalls}>
                  {msg.toolCalls.map((tc, idx) => {
                    const label = XIAODIAN_TOOL_LABEL[tc.name] ?? tc.name;
                    const isError = toolResults[idx]?.is_error === true;
                    return (
                      <div
                        key={tc.id}
                        className={`${styles.toolChip} ${
                          isError ? styles.toolChipError : ''
                        }`}
                      >
                        <span className={styles.toolChipLabel}>
                          ▶ {label}
                        </span>
                        <span className={styles.toolChipInput}>
                          {formatToolInput(tc.input)}
                          {isError ? ' · 失敗' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {!hasText && !hasToolCalls && (
                <div
                  className={`${styles.bubble} ${styles.bubbleAssistant} ${styles.bubbleEmpty}`}
                >
                  （這一輪沒有文字回覆）
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isSending && (
        <div className={`${styles.statusRow} ${styles.statusLoading}`}>
          小店正在查資料
        </div>
      )}
      {error && (
        <div className={`${styles.statusRow} ${styles.statusError}`}>
          對話失敗：{error}
        </div>
      )}

      <div className={styles.suggestions}>
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            className={styles.suggestionBtn}
            disabled={isSending}
            onClick={() => handleSend(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className={styles.composer}>
        <textarea
          className={styles.input}
          rows={2}
          placeholder="問小店關於 agent 的表現…（Enter 送出、Shift+Enter 換行）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
        />
        <button
          type="button"
          className={styles.sendBtn}
          onClick={() => handleSend()}
          disabled={isSending || !input.trim()}
        >
          送出
        </button>
      </div>
    </div>
  );
}
