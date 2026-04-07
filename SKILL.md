# SKILL.md

自訂 Skill 說明文件。這些 skill 存放於 `~/.claude/skills/`，在任何專案的對話中都可觸發。

---

## /session-insight

**觸發方式：** 在對話中輸入 `/session-insight`

**行為：**
1. 先問你是否要產出（yes / 不用）
2. 確認後，回顧整段對話並輸出結構化摘要
3. 詢問是否要存成記憶檔（`memory/session_insight_YYYY-MM-DD.md`）

**輸出格式：**

```
日期：YYYY-MM-DD

這次做了什麼：
（1–2 句話）

產出成果：
1. ...
2. ...

這次的模式（可複用的工作方式）：
（meta-thinking，這次解決問題的思路與流程）

下一步：
- [ ] ... （建議時間點）
- [ ] ...
```

**使用時機：**
- 每次對話結束前
- 需要紀錄工作脈絡、留存決策理由時
- 想把這次的工作模式沉澱成可複用知識時

**Skill 檔案位置：** `~/.claude/skills/session-insight.md`

---

## 新增 Skill 的方式

在 `~/.claude/skills/` 建立 `<skill-name>.md`，格式如下：

```markdown
---
description: 一行說明，讓 Claude 知道什麼時候觸發這個 skill
---

[skill 的指令內容，用自然語言描述 Claude 要做什麼]
```

觸發方式：對話中輸入 `/<skill-name>`
