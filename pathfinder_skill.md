# Skill 名稱: Pathfinder Task Breaker（任務解構引擎）

## 觸發時機
當使用者提出以下類型的請求時，強制啟用此 Skill：
- 「幫我規劃 XXX」、「我想學 XXX 怎麼開始」
- 任何包含「專案」、「計畫」、「學習路徑」、「排程」的模糊目標

## 概述
將使用者的模糊大任務，強制拆解為可執行的 15–30 分鐘微任務，
並建立任務間的拓撲相依關係，供前端視覺化拓撲圖（極光藍）直接渲染。

## 依賴項目
- LLM：gemini-2.0-flash（邏輯推演與任務切割）
- 輸出格式：嚴格 JSON 陣列，不含任何 Markdown 標記或閒聊文字

## 執行步驟
1. **擷取意圖** — 分析使用者的模糊目標，識別最終交付物是什麼
2. **微任務切割** — 拆解為子任務，每個預估時間限制在 15–30 分鐘
3. **依賴性判定** — 判斷每個子任務的類型與前置條件
4. **dependencies 建立** — 填入前置任務的 task_id 字串陣列
5. **summary 撰寫** — 用一句話描述完成此任務後達成的具體成果
6. **JSON 輸出** — 嚴格按照下方格式，不附加任何額外說明

## 欄位定義

| 欄位 | 型別 | 允許值 | 說明 |
|------|------|--------|------|
| task_id | string | "t01", "t02"... | 唯一識別碼，供 dependencies 引用 |
| task_name | string | 動詞開頭的具體任務 | 例：「搜尋並彙整競品資料」 |
| estimated_minutes | integer | 15–45 | 不可超過 45，超過請繼續切碎 |
| type | string | "critical" \| "parallel" | critical = 具前後相依；parallel = 可同時進行 |
| dependencies | array | task_id 字串陣列 | 無前置任務時填 [] |
| summary_when_done | string | 一句話成果描述 | 例：「完成競品分析，解鎖後續簡報任務」 |

## 範例輸出

```json
[
  {
    "task_id": "t01",
    "task_name": "搜尋並彙整競品資料",
    "estimated_minutes": 30,
    "type": "critical",
    "dependencies": [],
    "summary_when_done": "完成競品分析基礎，解鎖後續簡報規劃任務"
  },
  {
    "task_id": "t02",
    "task_name": "建立簡報大綱骨架",
    "estimated_minutes": 15,
    "type": "critical",
    "dependencies": ["t01"],
    "summary_when_done": "確立簡報結構，後續填充內容效率提升"
  },
  {
    "task_id": "t03",
    "task_name": "蒐集視覺素材與圖表",
    "estimated_minutes": 20,
    "type": "parallel",
    "dependencies": [],
    "summary_when_done": "視覺素材備齊，可直接嵌入簡報"
  }
]
```

## 防呆規則
- ❌ 單一任務超過 45 分鐘 → 強制繼續切碎，直到每個任務 ≤ 45 分鐘
- ❌ 輸出空陣列 → 改輸出 `{"error": "任務描述不足，請補充更多細節"}`
- ❌ dependencies 引用不存在的 task_id → 視為格式錯誤，重新生成
- ❌ 輸出包含 Markdown 標記（如 \`\`\`json）→ 不允許，只輸出純 JSON
- ❌ task_name 為抽象名詞（如「準備」、「規劃」）→ 必須改為動詞 + 具體對象
- ❌ summary_when_done 超過 30 字 → 強制精簡

## 注意事項
- 輸出的 JSON 陣列必須合法可解析，供前端直接 `JSON.parse()` 使用
- task_id 必須從 "t01" 開始，依序遞增
- critical 任務代表關鍵路徑，前端會以特殊顏色標示並觸發鎖定邏輯
- parallel 任務可與其他任務同時進行，不阻擋後續任務
