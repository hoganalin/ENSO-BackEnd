#!/usr/bin/env bash
# Pre-tool-use hook: 阻止對敏感檔的 Edit / Write。
# Claude Code 會把 tool input 以 JSON 餵到 stdin；如果要擋，exit 非 0 並把訊息寫到 stderr。

set -euo pipefail

# 讀 stdin JSON；若沒裝 jq，就用 grep 簡單做字串判斷。
input="$(cat || true)"

extract_path() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r '.tool_input.file_path // empty'
  else
    # 簡單版：抓 "file_path":"..." 的值
    printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
  fi
}

target="$(extract_path)"

if [ -z "$target" ]; then
  exit 0
fi

# 歸一化：把 Windows 反斜線轉成斜線，方便 pattern match
normalized="${target//\\//}"
lower="$(printf '%s' "$normalized" | tr '[:upper:]' '[:lower:]')"

block() {
  local reason="$1"
  echo "🛑 protect-files hook blocked edit on: $target" >&2
  echo "   reason: $reason" >&2
  echo "   如需變更請 (1) 使用 git 指令處理、或 (2) 暫時停用此 hook 後手動處理。" >&2
  exit 2
}

case "$lower" in
  *.env|*/.env)                    block ".env 檔案含 secret，不該被 AI 編輯" ;;
  *.env.local|*/.env.local)        block ".env.local 檔案含 secret" ;;
  *.env.*.local|*/.env.*.local)    block ".env.*.local 變體" ;;
  *package-lock.json)              block "lockfile 應由 npm 自動維護，不手編輯" ;;
  *pnpm-lock.yaml)                 block "pnpm lockfile" ;;
  *yarn.lock)                      block "yarn lockfile" ;;
  *.sqlite|*.sqlite3|*.db)         block "SQLite DB 檔" ;;
  */node_modules/*)                block "node_modules 內檔案不該被編輯" ;;
  */dist/*|*/build/*)              block "build output 應由 build tool 產生" ;;
  */.vercel/*|*/.git/*)            block "工具內部目錄" ;;
esac

exit 0
