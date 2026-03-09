# 🌌 Pathfinder AI - 智能商務排程與任務解構工具

Pathfinder AI 是一個專為專業人士打造的生產力工具。它能將龐大、模糊的專案目標，透過 Google Gemini AI 智能拆解為 3-5 個具體、可執行的「微任務」，並搭配動態專屬計時器與視覺化時序圖，幫助你保持專注、高效推進工作進度。

---

## ✨ 核心功能 (Features)

*   **🧠 智能任務拆解 (AI Task Deconstruction)**
    *   串接 Google Gemini 3.1 Pro 模型，自動將大目標拆解為具體的微任務。
    *   精準評估每個任務的預估時間（Estimated Minutes）。
    *   自動判斷任務屬性：`CRITICAL`（關鍵阻擋節點）或 `PARALLEL`（可並行任務）。
*   **🔗 拓撲時序鎖定機制 (Visual Timeline)**
    *   以視覺化節點呈現任務流程。
    *   若前置的 `CRITICAL` 任務尚未完成，後續任務會呈現灰色鎖定狀態（Locked），防止跳躍執行，確保專案邏輯正確。
*   **⏱️ 動態極光衝刺計時器 (Dynamic Sprint Timer)**
    *   點擊解鎖的任務後，會自動展開專屬的倒數計時器。
    *   計時器時間會**動態讀取 AI 預估的任務時間**（例如 30 分鐘、45 分鐘）。
    *   支援暫停 (Pause) 與繼續 (Resume) 功能，並帶有科技感的極光藍進度條。
*   **🏆 自動戰報成就感 (Automated Summaries)**
    *   完成任務後，節點會亮起極光藍，並自動顯示一段由 AI 預先生成的專業戰報摘要（例如：「已解鎖後續並行任務，效率提升」），提供滿滿的成就感。
*   **🎨 沉浸式深色科技介面 (Dark Business UI)**
    *   採用 Slate Black（深石板灰）背景搭配 Aurora Blue（極光藍）發光點綴，打造無干擾的沉浸式工作環境。

---

## 🚀 快速開始 (Getting Started)

### 1. 取得 Gemini API Key
本應用程式依賴 Google Gemini API 運作。
1. 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2. 登入 Google 帳號並點擊 **"Create API key"**。
3. 複製生成的 API Key。

### 2. 安裝與啟動
請確保您的電腦已安裝 [Node.js](https://nodejs.org/)。

```bash
# 1. 進入專案目錄
cd 01_pathfinder-ai

# 2. 安裝所有依賴套件
npm install

# 3. 啟動本地開發伺服器
npm run dev
```
啟動後，請在瀏覽器開啟終端機顯示的網址（通常為 `http://localhost:3000` 或 `http://localhost:5173`）。

---

## 📖 操作步驟 (How to Use)

1. **設定 API Key**
   * 開啟網頁後，在右上角的密碼輸入框中，貼上您剛剛申請的 **Gemini API Key**。
   * *(進階用法：您也可以將專案根目錄的 `.env.example` 複製為 `.env`，並將 Key 填入 `GEMINI_API_KEY` 變數中，這樣就不用每次手動輸入。)*

2. **輸入任務目標 (Mission Objective)**
   * 在左側的文字框中，輸入您想要完成的龐大目標。
   * *範例：「幫我規劃一個為期三天的東京自由行」、「準備下週三的 Q3 產品發表會簡報」。*

3. **解構任務 (Deconstruct Task)**
   * 點擊下方的 **"Deconstruct Task"** 按鈕。
   * 稍等幾秒鐘，AI 會將您的目標拆解，並在右側生成「執行時間軸 (Execution Timeline)」。

4. **開始衝刺 (Start Sprint)**
   * 在右側的時間軸中，找到第一個亮起（未被鎖定）的任務。
   * 點擊該任務卡片（卡片下方會提示 `Click to start X-min sprint`）。
   * 畫面上方會展開「極光衝刺計時器 (Aurora Sprint Active)」，並開始倒數。
   * 您可以隨時點擊 **Pause** 暫停，或點擊 **Resume** 繼續。

5. **完成任務 (Complete Task)**
   * 當您完成該項工作時，點擊計時器右側的 **"Complete"** 按鈕。
   * 該任務節點會標示為完成，顯示戰報摘要，並且**自動解鎖**下方原本被鎖定的後續任務！
   * 繼續點擊下一個任務，直到所有任務完成（左側 Progress 達到 100%）。

---

## 🛠️ 技術棧 (Tech Stack)

*   **前端框架**: React 19
*   **建置工具**: Vite
*   **樣式框架**: Tailwind CSS 4
*   **AI 串接**: `@google/genai` (Gemini 3.1 Pro Preview)
*   **圖示庫**: Lucide React
