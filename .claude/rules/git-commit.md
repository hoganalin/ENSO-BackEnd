---
paths: []
---

# Git Commit 規則

## Message 格式

```
<type>: <簡短描述>

<可選：補充說明、動機、結果>
```

單行 commit message 常見，描述以**動詞起頭**、**現在式**：「add X」、「fix Y」、「remove Z」。

## Type 類型

| Type | 用途 |
|---|---|
| `feat` | 新功能（對使用者有感的行為） |
| `fix` | Bug 修復 |
| `chore` | 雜項：依賴升級、設定、gitignore |
| `docs` | 純文件變更（README、docs/、code comment） |
| `refactor` | 重構，無行為變更 |
| `style` | 格式化、程式碼風格（不影響邏輯） |
| `perf` | 效能優化 |
| `test` | 測試檔案變更（本專案無） |

## 範圍慣例

簡短 scope 可選：`fix(auth): handle token expire` 或直接省略都可。本專案以省略為主。

## 禁止 commit 的檔案

任何時候都不得 commit：

- `.env` / `.env.local` / `.env.*.local`（含 secret）
- `node_modules/`
- `dist/` / `build/`
- `.vercel/`
- `*.log`
- `.DS_Store`

上述都已在 `.gitignore`。若 `git status` 顯示這類檔案出現在追蹤清單，**先排除、再 commit**。

## Commit 粒度

- 一個 commit 只做一件事。修 bug + 加 feature 不要混。
- 單檔單 commit 太瑣碎 — 相關的多檔變更一起 commit。
- Refactor 與 feature 分開：先 refactor，再 feature，兩個 commit。

## 不要做

- `git commit --amend` 對已 push 的 commit（會導致 force push）。
- `git commit --no-verify` 繞過 pre-commit hook（本專案目前無 hook，但未來若有）。
- commit 時夾帶 `console.log` / `debugger` / TODO-fixme 未解的程式碼。
- commit message 全英文不是必需，中英夾雜 OK（本專案近期 commit 英文為主）。

## Pre-commit 檢查

建議（非強制）：

1. `npm run lint` — 確認無 ESLint error
2. `npm run build` — 確認 production build 不會壞（Vercel 會再跑一次，本地先過濾）
3. `git diff --cached` — 人眼檢查一次，確認沒夾帶垃圾

## 範例（好的）

```
feat: add demo mode one-click login to Login view
fix: remove duplicate default export in AdminLayout
chore: untrack .env and tighten gitignore
docs: update README and add interview report documentation
refactor: extract currency formatter to utils
```

## 範例（不好）

```
update                       ← 太模糊
fix                          ← 修了什麼？
feat: stuff                  ← 一樣模糊
WIP                          ← 不該 commit 半成品到 main
修改一些東西                  ← 同上
Updates                      ← 過去式 + 無內容（雖然歷史上有過一筆，不要再犯）
```
