/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle, Lock, Sparkles, Target, Clock, Activity, ArrowRight, Server } from 'lucide-react';

type TaskType = 'critical' | 'parallel';

interface MicroTask {
  task_id: string;
  task_name: string;
  estimated_minutes: number;
  type: TaskType;
  dependencies: string[];
  status: 'locked' | 'todo' | 'in_progress' | 'done';
  summary_when_done: string;
}

// MCP Server 端點（本機開發預設）
const MCP_URL = import.meta.env.VITE_MCP_URL || 'http://localhost:3001';

export default function App() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<MicroTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [mcpUrl, setMcpUrl] = useState(MCP_URL);
  const [mcpStatus, setMcpStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timeLeft]);

  // 健康檢查 MCP Server
  const checkMcpStatus = async () => {
    try {
      const res = await fetch(`${mcpUrl}/`, { signal: AbortSignal.timeout(3000) });
      setMcpStatus(res.ok ? 'online' : 'offline');
    } catch {
      setMcpStatus('offline');
    }
  };

  useEffect(() => {
    checkMcpStatus();
  }, [mcpUrl]);

  // 呼叫 MCP Server 的 decompose_task Tool
  const generateTasks = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${mcpUrl}/tools/decompose_task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '任務拆解失敗，請確認 MCP Server 是否運行中');
      }

      const newTasks: MicroTask[] = data.tasks.map((t: Omit<MicroTask, 'status'>) => ({
        ...t,
        status: 'todo' as const
      }));

      setTasks(newTasks);
      setActiveTaskId(null);
      setTimerRunning(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 鎖定邏輯：依 dependencies 判斷（而非順序）
  const isTaskLocked = (task: MicroTask) => {
    return task.dependencies.some(depId => {
      const dep = tasks.find(t => t.task_id === depId);
      return dep && dep.status !== 'done';
    });
  };

  const startTask = (task_id: string) => {
    const task = tasks.find(t => t.task_id === task_id);
    if (!task) return;
    setActiveTaskId(task_id);
    setTimeLeft(task.estimated_minutes * 60);
    setTimerRunning(true);
    setTasks(tasks.map(t => t.task_id === task_id ? { ...t, status: 'in_progress' } : t));
  };

  const completeTask = () => {
    if (!activeTaskId) return;
    setTasks(tasks.map(t => t.task_id === activeTaskId ? { ...t, status: 'done' } : t));
    setActiveTaskId(null);
    setTimerRunning(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const activeTask = tasks.find(t => t.task_id === activeTaskId);
  const totalSeconds = activeTask ? activeTask.estimated_minutes * 60 : 1;

  const statusColor = {
    unknown: 'text-slate-400',
    online: 'text-emerald-400',
    offline: 'text-rose-400',
  }[mcpStatus];

  const statusLabel = {
    unknown: '檢查中...',
    online: 'MCP Server 連線中',
    offline: 'MCP Server 離線',
  }[mcpStatus];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-cyan-500/30 pb-20">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <h1 className="text-xl font-semibold tracking-wide text-white">Pathfinder AI</h1>
          </div>
          {/* MCP Server URL 輸入 */}
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={mcpUrl}
              onChange={e => setMcpUrl(e.target.value)}
              onBlur={checkMcpStatus}
              placeholder="MCP Server URL..."
              className="bg-slate-950 border border-slate-800 rounded-lg px-4 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all w-64 placeholder-slate-600"
            />
            <span className={`text-xs font-mono ${statusColor}`}>{statusLabel}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Area */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-medium text-white">Mission Objective</h2>
            </div>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder={"Describe your large, vague task here...\ne.g., 'Prepare for the Q3 marketing campaign launch'"}
              className="w-full h-40 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none mb-4 leading-relaxed"
            />
            <button
              onClick={generateTasks}
              disabled={loading || !goal.trim() || mcpStatus === 'offline'}
              className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Sparkles className="w-5 h-5" /> Deconstruct Task</>
              )}
            </button>
            {mcpStatus === 'offline' && (
              <p className="text-xs text-rose-400 mt-3 text-center">
                MCP Server 離線，請執行：<br />
                <code className="font-mono">node --env-file=.env mcp_server.mjs</code>
              </p>
            )}
          </div>

          {/* Stats */}
          {tasks.length > 0 && (
            <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30">
              <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider">Mission Overview</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Total Micro-tasks</span>
                  <span className="text-white font-mono">{tasks.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Est. Total Time</span>
                  <span className="text-cyan-400 font-mono">{tasks.reduce((acc, t) => acc + t.estimated_minutes, 0)}m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Progress</span>
                  <span className="text-emerald-400 font-mono">
                    {Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Timeline & Sprint */}
        <div className="lg:col-span-8">
          {/* Sprint Timer Banner */}
          {activeTaskId && (
            <div className="mb-8 p-6 rounded-2xl bg-slate-800 border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-900">
                <div
                  className="h-full bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,1)] transition-all duration-1000 ease-linear"
                  style={{ width: `${(timeLeft / totalSeconds) * 100}%` }}
                />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-cyan-400 font-medium mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <Activity className="w-4 h-4 animate-pulse" />
                    Aurora Sprint Active
                  </h2>
                  <p className="text-xl text-white font-medium leading-snug">
                    {tasks.find(t => t.task_id === activeTaskId)?.task_name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className="text-5xl font-mono text-white tracking-tight font-light drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                    {formatTime(timeLeft)}
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                      onClick={() => setTimerRunning(!timerRunning)}
                      className="flex-1 md:flex-none px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2 transition-colors border border-slate-600"
                    >
                      {timerRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Resume</>}
                    </button>
                    <button
                      onClick={completeTask}
                      className="flex-1 md:flex-none px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    >
                      <CheckCircle className="w-5 h-5" /> Complete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          {tasks.length > 0 ? (
            <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/30">
              <h2 className="text-lg font-medium text-white mb-8 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Execution Timeline
              </h2>
              <div className="relative border-l-2 border-slate-700/50 ml-4 space-y-8 py-2">
                {tasks.map((task) => {
                  const locked = isTaskLocked(task);
                  const isActive = activeTaskId === task.task_id;
                  const isDone = task.status === 'done';

                  return (
                    <div key={task.task_id} className="relative pl-8 group">
                      {/* Node Circle */}
                      <div className={`absolute -left-[11px] top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-slate-900 transition-colors duration-300
                        ${isDone ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.8)]' :
                          isActive ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)]' :
                          locked ? 'border-slate-700' : 'border-slate-500 group-hover:border-cyan-500/50'}
                      `}>
                        {isDone && <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full" />}
                        {isActive && <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />}
                      </div>

                      {/* Content Card */}
                      <div
                        className={`p-5 rounded-xl border transition-all duration-300
                          ${isDone ? 'bg-cyan-950/10 border-cyan-900/30' :
                            isActive ? 'bg-slate-800 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.1)]' :
                            locked ? 'bg-slate-800/20 border-slate-800 opacity-50' :
                            'bg-slate-800/80 border-slate-700 hover:border-slate-600 cursor-pointer hover:shadow-lg hover:shadow-black/20'}
                        `}
                        onClick={() => { if (!locked && !isDone && !isActive) startTask(task.task_id); }}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-2">
                          <div>
                            <span className="text-xs text-slate-500 font-mono mr-2">{task.task_id}</span>
                            <span className={`font-medium text-lg leading-snug ${isDone || isActive ? 'text-white' : locked ? 'text-slate-500' : 'text-slate-200'}`}>
                              {task.task_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                            <span className={`px-2.5 py-1 rounded-md border ${
                              task.type === 'critical'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}>
                              {task.type.toUpperCase()}
                            </span>
                            <span className="px-2.5 py-1 rounded-md bg-slate-900 text-slate-400 border border-slate-700">
                              {task.estimated_minutes}M
                            </span>
                          </div>
                        </div>

                        {/* Dependencies badge */}
                        {task.dependencies.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            {task.dependencies.map(dep => (
                              <span key={dep} className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-500 font-mono border border-slate-700">
                                ← {dep}
                              </span>
                            ))}
                          </div>
                        )}

                        {isDone && (
                          <div className="mt-4 text-sm text-cyan-100 flex items-start gap-3 bg-cyan-950/40 p-3.5 rounded-lg border border-cyan-800/50">
                            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
                            <p className="leading-relaxed">{task.summary_when_done}</p>
                          </div>
                        )}

                        {locked && !isDone && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                            <Lock className="w-4 h-4" />
                            <span>等待前置任務完成：{task.dependencies.join(', ')}</span>
                          </div>
                        )}

                        {!locked && !isDone && !isActive && (
                          <div className="mt-4 flex items-center gap-2 text-sm text-cyan-500/0 group-hover:text-cyan-400 transition-colors font-medium">
                            <span>Click to start {task.estimated_minutes}-min sprint</span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-2xl bg-slate-800/20">
              <Target className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg">Awaiting Mission Objective</p>
              <p className="text-sm mt-2 opacity-60">Enter your goal on the left to generate a path.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
