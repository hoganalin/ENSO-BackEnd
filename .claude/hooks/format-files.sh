#!/usr/bin/env bash
# Post-tool-use hook: 編輯 / 寫檔後自動跑 Prettier + ESLint --fix。
# 失敗不阻斷（exit 0 永遠），只把警告 log 到 stderr，避免干擾正常流程。

set -u
# 注意：不要 set -e，lint/prettier fail 不想中斷 hook chain

input="$(cat || true)"

extract_path() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$input" | jq -r '.tool_input.file_path // empty'
  else
    printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
  fi
}

target="$(extract_path)"

if [ -z "$target" ]; then
  exit 0
fi

# 只格式化專案內的 JS / JSX / JSON / CSS / MD 檔
case "$target" in
  *.js|*.jsx|*.mjs|*.cjs|*.ts|*.tsx|*.json|*.css|*.md)
    ;;
  *)
    exit 0
    ;;
esac

# 避免格式化 node_modules / dist / build / .git
case "$target" in
  */node_modules/*|*/dist/*|*/build/*|*/.git/*|*/.vercel/*)
    exit 0
    ;;
esac

# Prettier（若存在）
if [ -f "./node_modules/.bin/prettier" ] || [ -f "./node_modules/.bin/prettier.cmd" ]; then
  npx --no-install prettier --write "$target" >/dev/null 2>&1 \
    || echo "⚠️  prettier --write failed on $target" >&2
fi

# ESLint --fix（只針對 JS 類；ESLint 不處理 md/css/json）
case "$target" in
  *.js|*.jsx|*.mjs|*.cjs|*.ts|*.tsx)
    if [ -f "./node_modules/.bin/eslint" ] || [ -f "./node_modules/.bin/eslint.cmd" ]; then
      npx --no-install eslint --fix "$target" >/dev/null 2>&1 \
        || echo "⚠️  eslint --fix failed / reported errors on $target" >&2
    fi
    ;;
esac

exit 0
