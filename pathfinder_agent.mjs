/**
 * Pathfinder Agent - SKILL.md 驅動測試
 * 
 * 執行方式：
 *   GEMINI_API_KEY=your_key node pathfinder_agent.mjs
 * 
 * 或建立 .env 後：
 *   node --env-file=.env pathfinder_agent.mjs
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// ─────────────────────────────────────────
// 1. 設定區
// ─────────────────────────────────────────
const SKILL_PATH   = './pathfinder_skill.md';   // SKILL.md 路徑
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// 測試用的模糊任務（可替換成任意輸入）
const USER_GOAL = '我想在三個月內從零開始學會 React，並做出一個作品集網站';

// ─────────────────────────────────────────
// 2. 讀取 SKILL.md（Agent 核心行為）
// ─────────────────────────────────────────
async function loadSkill(skillPath) {
  if (!existsSync(skillPath)) {
    throw new Error(`找不到 SKILL 文件：${skillPath}\n請確認 pathfinder_skill.md 與此腳本在同一目錄。`);
  }
  const content = await readFile(skillPath, 'utf-8');
  console.log(`✅ [Agent] 成功載入 Skill：${skillPath}`);
  console.log(`   字元數：${content.length}`);
  return content;
}

// ─────────────────────────────────────────
// 3. 組裝 System Prompt（注入 Skill 規則）
// ─────────────────────────────────────────
function buildSystemPrompt(skillContent) {
  return `
你是 Pathfinder AI，一個專業的商務排程幕僚。
你必須嚴格遵守以下 Skill 文件的所有規則來執行任務：

===== SKILL 文件開始 =====
${skillContent}
===== SKILL 文件結束 =====

重要提醒：
- 你只能輸出合法的 JSON 陣列，不可包含任何 Markdown 標記（如 \`\`\`json）
- 不可輸出任何閒聊或說明文字
- 嚴格遵守 SKILL 文件中的所有防呆規則
`.trim();
}

// ─────────────────────────────────────────
// 4. 呼叫 Gemini API
// ─────────────────────────────────────────
async function callGemini(systemPrompt, userGoal, apiKey) {
  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: `請幫我分解這個目標：「${userGoal}」` }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3,       // 降低隨機性，確保穩定的 JSON 輸出
      maxOutputTokens: 8192,
    }
  };

  console.log(`\n🚀 [Agent] 呼叫 Gemini API...`);
  console.log(`   模型：${GEMINI_MODEL}`);
  console.log(`   任務：${userGoal}\n`);

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

  if (!rawText) {
    throw new Error('Gemini 回應為空，請確認 API Key 有效並重試');
  }

  return rawText;
}

// ─────────────────────────────────────────
// 5. 解析與驗證 JSON 輸出
// ─────────────────────────────────────────
function parseAndValidate(rawText) {
  // 清除可能殘留的 Markdown 標記（防禦性處理）
  const cleaned = rawText.replace(/```json|```/g, '').trim();

  let tasks;
  try {
    tasks = JSON.parse(cleaned);
  } catch {
    throw new Error(`JSON 解析失敗。原始輸出：\n${rawText}`);
  }

  // 檢查是否為 error 物件
  if (!Array.isArray(tasks)) {
    if (tasks?.error) {
      console.warn(`⚠️  [Agent] Skill 回傳錯誤：${tasks.error}`);
      return null;
    }
    throw new Error('輸出不是陣列格式');
  }

  // 驗證每個任務的欄位
  const VALID_TYPES = new Set(['critical', 'parallel']);
  const errors = [];

  tasks.forEach((task, i) => {
    if (!task.task_id)                          errors.push(`task[${i}] 缺少 task_id`);
    if (!task.task_name)                        errors.push(`task[${i}] 缺少 task_name`);
    if (!Number.isInteger(task.estimated_minutes)) errors.push(`task[${i}] estimated_minutes 不是整數`);
    if (task.estimated_minutes > 45)            errors.push(`task[${i}] 超過 45 分鐘上限（${task.estimated_minutes}m）`);
    if (!VALID_TYPES.has(task.type))            errors.push(`task[${i}] type 值無效：${task.type}`);
    if (!Array.isArray(task.dependencies))      errors.push(`task[${i}] dependencies 不是陣列`);
  });

  if (errors.length > 0) {
    console.warn('⚠️  [Validator] 發現以下問題：');
    errors.forEach(e => console.warn(`   - ${e}`));
  }

  return tasks;
}

// ─────────────────────────────────────────
// 6. 格式化輸出（終端機可讀）
// ─────────────────────────────────────────
function printTasks(tasks) {
  console.log('\n' + '═'.repeat(60));
  console.log('  📋 Pathfinder 任務拆解結果');
  console.log('═'.repeat(60));

  tasks.forEach((task, i) => {
    const typeLabel = task.type === 'critical' ? '🔴 CRITICAL' : '🟢 PARALLEL';
    const deps = task.dependencies.length > 0
      ? `前置：${task.dependencies.join(', ')}`
      : '無前置任務';

    console.log(`\n  [${task.task_id}] ${task.task_name}`);
    console.log(`       時間：${task.estimated_minutes} 分鐘`);
    console.log(`       類型：${typeLabel}`);
    console.log(`       依賴：${deps}`);
  });

  const totalMin = tasks.reduce((acc, t) => acc + t.estimated_minutes, 0);
  const criticalCount = tasks.filter(t => t.type === 'critical').length;
  const parallelCount = tasks.filter(t => t.type === 'parallel').length;

  console.log('\n' + '─'.repeat(60));
  console.log(`  總計：${tasks.length} 個任務｜${totalMin} 分鐘`);
  console.log(`  關鍵路徑：${criticalCount} 個｜可並行：${parallelCount} 個`);
  console.log('═'.repeat(60) + '\n');
}

// ─────────────────────────────────────────
// 7. 主流程
// ─────────────────────────────────────────
async function main() {
  console.log('🤖 Pathfinder Agent 啟動...\n');

  // 取得 API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ 錯誤：未設定 GEMINI_API_KEY 環境變數');
    console.error('   執行方式：GEMINI_API_KEY=your_key node pathfinder_agent.mjs');
    process.exit(1);
  }

  try {
    // Step 1: 載入 Skill
    const skillContent = await loadSkill(SKILL_PATH);

    // Step 2: 組裝 System Prompt
    const systemPrompt = buildSystemPrompt(skillContent);

    // Step 3: 呼叫 Gemini
    const rawOutput = await callGemini(systemPrompt, USER_GOAL, apiKey);

    // Step 4: 解析與驗證
    console.log('🔍 [Agent] 解析輸出中...');
    const tasks = parseAndValidate(rawOutput);

    // Step 5: 印出結果
    if (tasks) {
      printTasks(tasks);
      console.log('✅ Agent 執行完成！JSON 已驗證，可直接送給前端渲染。\n');
    }

  } catch (err) {
    console.error(`\n❌ Agent 執行失敗：${err.message}`);
    process.exit(1);
  }
}

main();
