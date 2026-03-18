<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Pathfinder AI

**商務排程幕僚 — 將模糊目標拆解為可執行的微任務**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white&style=flat-square)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?logo=google&logoColor=white&style=flat-square)
![License](https://img.shields.io/badge/License-Apache_2.0-green?style=flat-square)

</div>

---

## 概述

Pathfinder AI 是一款深色商務科技風的 AI 排程工具。輸入任何模糊的大型目標，Gemini 會自動將其拆解為 **15–30 分鐘的微任務**，區分關鍵路徑（Critical）與可並行任務（Parallel），並搭配 **Sprint 計時器** 協助你專注執行。

> ⚡ **本專案採自架模式** — 你使用自己的 Gemini API Key，費用完全自行掌控，不依賴任何第三方服務。

---

## 功能特色

- **AI 任務拆解** — 輸入模糊目標，自動生成結構化微任務
- **Critical / Parallel 分類** — 關鍵路徑任務會鎖定後續任務，確保執行順序
- **拓撲相依關係** — 每個任務標示前置任務，視覺化依賴鏈
- **Aurora Sprint 計時器** — 點擊任務即啟動倒數，極光藍進度條視覺化
- **MCP Server 架構** — 核心邏輯封裝為標準 Tool，可供任何 Agent 呼叫
- **SKILL.md 驅動** — 所有 AI 規則集中在一份文件，無需改程式碼即可調整行為

---

## 快速開始

### 前置需求

- **Node.js v18 以上**（[下載](https://nodejs.org)）
- **Gemini API Key**（[免費申請](https://aistudio.google.com/apikey)）

### 安裝步驟

```bash
# 1. Clone 專案
git clone https://github.com/你的帳號/pathfinder-ai.git
cd pathfinder-ai

# 2. 安裝依賴
npm install

# 3. 設定環境變數
cp .env.example .env
```

用任何編輯器打開 `.env`，填入你的 Gemini API Key：

```
GEMINI_API_KEY=你的金鑰貼在這裡
```

### 啟動（需要兩個終端機）

```bash
# 終端機 1：啟動 MCP Server（AI 大腦）
node --env-file=.env mcp_server.mjs

# 終端機 2：啟動前端 UI
npm run dev
```

打開瀏覽器前往 `http://localhost:3000`，確認右上角顯示 **MCP Server 連線中** 即可開始使用。

---

## 專案架構

```
pathfinder-ai/
├── src/
│   ├── App.tsx               # 前端 UI（React + Tailwind）
│   ├── main.tsx              # React 進入點
│   └── index.css             # Tailwind 引入
├── mcp_server.mjs            # MCP Server（核心邏輯 + Gemini 串接）
├── pathfinder_skill.md       # SKILL.md（AI 行為規則文件）
├── pathfinder_agent.mjs      # Agent 測試腳本（終端機執行）
├── .env.example              # 環境變數範本
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 運作原理

```
使用者輸入目標
      ↓
  前端 App.tsx
      ↓ POST /tools/decompose_task
  MCP Server
      ↓ 讀取規則
  pathfinder_skill.md
      ↓ 呼叫 AI
  Gemini API（你自己的 Key）
      ↓ 回傳驗證過的 JSON
  前端渲染拓撲圖 + 計時器
```

---

## MCP Server API

MCP Server 預設運行於 `http://localhost:3001`，提供以下端點：

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/` | 健康檢查 |
| `GET` | `/manifest` | MCP Tool 清單（供 Agent 發現） |
| `POST` | `/tools/decompose_task` | 執行任務拆解 |

### 呼叫範例

```js
const res = await fetch('http://localhost:3001/tools/decompose_task', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ goal: '準備 Q3 行銷活動簡報' })
});
const { tasks } = await res.json();
```

### 回傳格式

```json
{
  "success": true,
  "tasks": [
    {
      "task_id": "t01",
      "task_name": "搜尋並彙整競品資料",
      "estimated_minutes": 30,
      "type": "critical",
      "dependencies": [],
      "summary_when_done": "完成競品分析基礎，解鎖後續簡報規劃任務"
    }
  ]
}
```

---

## 進階：Agent 模式

不需要 UI，直接用終端機執行 Agent：

```bash
node --env-file=.env pathfinder_agent.mjs
```

修改 `pathfinder_agent.mjs` 第 17 行的 `USER_GOAL` 來測試不同任務。

---

## 自訂 AI 行為

所有 AI 規則都在 `pathfinder_skill.md`，直接編輯這份文件即可調整：

- 修改任務時間上限（目前 45 分鐘）
- 新增輸出欄位
- 調整防呆規則
- 更換 Prompt 策略

**不需要改任何程式碼。**

---

## 指令一覽

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動前端開發伺服器（port 3000） |
| `npm run build` | 打包生產版本 |
| `npm run preview` | 預覽打包結果 |
| `npm run lint` | TypeScript 型別檢查 |
| `node --env-file=.env mcp_server.mjs` | 啟動 MCP Server（port 3001） |
| `node --env-file=.env pathfinder_agent.mjs` | 執行 Agent 終端機模式 |

---

## 常見問題

**Q：MCP Server 顯示離線？**
確認終端機 1 有在跑 `mcp_server.mjs`，且 port 3001 沒有被其他程式佔用。

**Q：Gemini API 回傳 429 錯誤？**
表示該 API Key 的免費配額已用完。等幾分鐘後重試，或到 [Google AI Studio](https://aistudio.google.com) 開啟付費方案。

**Q：可以換其他 AI 模型嗎？**
可以，在 `.env` 修改 `GEMINI_MODEL` 的值即可，例如改為 `gemini-1.5-flash`。

---

## 授權

[Apache 2.0](LICENSE)
