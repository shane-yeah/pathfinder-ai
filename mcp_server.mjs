/**
 * Pathfinder MCP Server
 * 
 * 標準 MCP（Model Context Protocol）伺服器
 * 提供 decompose_task Tool，供任何 Agent 呼叫
 * 
 * 執行方式：
 *   node --env-file=.env mcp_server.mjs
 * 
 * 預設 Port：3001
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { createServer } from 'http';

const PORT = process.env.MCP_PORT || 3001;
const SKILL_PATH = './pathfinder_skill.md';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─────────────────────────────────────────
// MCP Tool 定義（符合 MCP 規範的 manifest）
// ─────────────────────────────────────────
const MCP_MANIFEST = {
  schema_version: '1.0',
  name: 'pathfinder',
  description: 'Pathfinder AI — 將模糊目標拆解為可執行的微任務，並建立拓撲相依關係',
  tools: [
    {
      name: 'decompose_task',
      description: '輸入一個模糊的大型目標，回傳結構化的微任務 JSON 陣列（含 task_id、dependencies、critical/parallel 分類）',
      inputSchema: {
        type: 'object',
        properties: {
          goal: {
            type: 'string',
            description: '使用者想完成的模糊目標，例如：「準備 Q3 簡報」、「學會 React」'
          }
        },
        required: ['goal']
      }
    }
  ]
};

// ─────────────────────────────────────────
// 核心邏輯
// ─────────────────────────────────────────
async function loadSkill() {
  if (!existsSync(SKILL_PATH)) {
    throw new Error(`找不到 SKILL 文件：${SKILL_PATH}`);
  }
  return await readFile(SKILL_PATH, 'utf-8');
}

async function decomposeTask(goal) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('未設定 GEMINI_API_KEY 環境變數');

  const skillContent = await loadSkill();

  const systemPrompt = `
你是 Pathfinder AI，一個專業的商務排程幕僚。
你必須嚴格遵守以下 Skill 文件的所有規則來執行任務：

===== SKILL 文件開始 =====
${skillContent}
===== SKILL 文件結束 =====

重要提醒：
- 只輸出合法的 JSON 陣列，不可包含任何 Markdown 標記
- 不可輸出任何閒聊或說明文字
- 嚴格遵守 SKILL 文件中的所有防呆規則
`.trim();

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [
      { role: 'user', parts: [{ text: `請幫我分解這個目標：「${goal}」` }] }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,
      maxOutputTokens: 8192,
    }
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 錯誤 ${res.status}：${errText}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini 回應為空');

  // 清除可能殘留的 Markdown 標記
  const cleaned = rawText.replace(/```json|```/g, '').trim();
  const tasks = JSON.parse(cleaned);

  // 驗證輸出
  if (!Array.isArray(tasks)) {
    if (tasks?.error) return { error: tasks.error };
    throw new Error('輸出不是陣列格式');
  }

  return tasks;
}

// ─────────────────────────────────────────
// HTTP 路由處理
// ─────────────────────────────────────────
function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',           // 允許前端跨域呼叫
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data, null, 2));
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 處理 CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // GET /         → 健康檢查
  if (req.method === 'GET' && url.pathname === '/') {
    return sendJSON(res, 200, { status: 'ok', server: 'Pathfinder MCP', model: GEMINI_MODEL });
  }

  // GET /manifest → MCP Tool 清單（Agent 用來發現可用 Tool）
  if (req.method === 'GET' && url.pathname === '/manifest') {
    return sendJSON(res, 200, MCP_MANIFEST);
  }

  // POST /tools/decompose_task → 執行任務拆解
  if (req.method === 'POST' && url.pathname === '/tools/decompose_task') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { goal } = JSON.parse(body);
        if (!goal?.trim()) {
          return sendJSON(res, 400, { error: '缺少必要參數：goal' });
        }

        console.log(`[MCP] decompose_task 收到請求：「${goal}」`);
        const tasks = await decomposeTask(goal);
        console.log(`[MCP] 成功拆解為 ${Array.isArray(tasks) ? tasks.length : 0} 個任務`);

        return sendJSON(res, 200, { success: true, tasks });
      } catch (err) {
        console.error(`[MCP] 錯誤：${err.message}`);
        return sendJSON(res, 500, { error: err.message });
      }
    });
    return;
  }

  // 404
  return sendJSON(res, 404, { error: `找不到路由：${url.pathname}` });
}

// ─────────────────────────────────────────
// 啟動伺服器
// ─────────────────────────────────────────
const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`\n🚀 Pathfinder MCP Server 啟動成功`);
  console.log(`   Port    : ${PORT}`);
  console.log(`   模型    : ${GEMINI_MODEL}`);
  console.log(`   Skill   : ${SKILL_PATH}`);
  console.log(`\n可用端點：`);
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/manifest`);
  console.log(`   POST http://localhost:${PORT}/tools/decompose_task`);
  console.log(`\n等待請求中...\n`);
});
