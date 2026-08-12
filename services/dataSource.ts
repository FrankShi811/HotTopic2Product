import type { AuditEvent, DashboardPayload, GenerationJob, Idea, IdeaStage, Signal, WorkspaceSummary } from '../types';

const staticDemo = import.meta.env.VITE_STATIC_DEMO === 'true';
const storageKey = 'signal-forge-pages-demo-v1';

interface StaticWorkspace {
  signals: Signal[];
  ideas: Idea[];
  jobs: GenerationJob[];
  events: AuditEvent[];
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function timestamp() {
  return new Date().toISOString();
}

function initialWorkspace(): StaticWorkspace {
  return {
    signals: [
      { id: 'signal-demo-texture', sourceMode: 'demo', sourceLabel: '示例信号库', sourceUrl: null, platform: 'Demo', title: '触感优先的小型桌面物件', summary: '用于展示导入、审核与概念生成流程的本地示例，不代表真实平台热度。', visualHint: '柔和陶瓷、织物折痕、钴蓝色点缀', score: 72, capturedAt: '2026-08-12T00:00:00.000Z' },
      { id: 'signal-demo-repair', sourceMode: 'demo', sourceLabel: '示例信号库', sourceUrl: null, platform: 'Demo', title: '可修复的日常收纳配件', summary: '示例记录强调可替换部件与低门槛维护，需由运营者补充来源和目标人群。', visualHint: '模块化卡扣、耐磨织带、可见维修结构', score: 64, capturedAt: '2026-08-11T00:00:00.000Z' },
      { id: 'signal-demo-quiet-tech', sourceMode: 'demo', sourceLabel: '示例信号库', sourceUrl: null, platform: 'Demo', title: '低干扰的随身科技配件', summary: '示例记录用于检验产品假设，而不是作为市场规模或需求证据。', visualHint: '半透明材质、柔雾表面、安静的指示色', score: 58, capturedAt: '2026-08-10T00:00:00.000Z' },
    ],
    ideas: [],
    jobs: [],
    events: [{ id: 'audit-seed', action: 'seeded_pages_demo', entityType: 'workspace', entityId: 'pages-demo', detail: 'GitHub Pages 演示已初始化，所有数据只保存在当前浏览器。', createdAt: '2026-08-12T00:00:00.000Z' }],
  };
}

function readWorkspace(): StaticWorkspace {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return initialWorkspace();
    const parsed = JSON.parse(saved) as StaticWorkspace;
    if (!Array.isArray(parsed.signals) || !Array.isArray(parsed.ideas) || !Array.isArray(parsed.jobs) || !Array.isArray(parsed.events)) return initialWorkspace();
    return parsed;
  } catch {
    return initialWorkspace();
  }
}

const workspace = staticDemo ? readWorkspace() : null;

function saveWorkspace() {
  if (!workspace) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(workspace));
  } catch {
    // The static demo remains usable for the current page even if storage is unavailable.
  }
}

function addEvent(action: string, entityType: string, entityId: string, detail: string) {
  if (!workspace) return;
  workspace.events.unshift({ id: createId('audit'), action, entityType, entityId, detail, createdAt: timestamp() });
  workspace.events = workspace.events.slice(0, 100);
}

function summarize(): WorkspaceSummary {
  const stages: Record<IdeaStage, number> = { review: 0, approved: 0, rejected: 0, validating: 0, ready: 0 };
  for (const idea of workspace?.ideas || []) stages[idea.stage] += 1;
  return {
    signalCount: workspace?.signals.length || 0,
    ideaCount: workspace?.ideas.length || 0,
    reviewCount: stages.review,
    approvedCount: stages.approved,
    validationCount: stages.validating,
    stages,
  };
}

function dashboard(): DashboardPayload {
  if (!workspace) throw new Error('Static workspace is unavailable.');
  return { summary: summarize(), recentSignals: workspace.signals.slice(0, 6), recentIdeas: workspace.ideas.slice(0, 8), recentEvents: workspace.events.slice(0, 8) };
}

function requestBody(init?: RequestInit): Record<string, unknown> {
  if (typeof init?.body !== 'string') return {};
  try { return JSON.parse(init.body) as Record<string, unknown>; } catch { return {}; }
}

function requireText(value: unknown, name: string, minimum = 1) {
  if (typeof value !== 'string' || value.trim().length < minimum) throw new Error(`${name}不符合要求。`);
  return value.trim();
}

function createDemoIdea(signal: Signal, productType: string, goal: string) {
  const now = timestamp();
  const idea: Idea = {
    id: createId('idea'),
    signalId: signal.id,
    title: `${signal.title} · ${productType}`,
    summary: `基于“${signal.title}”形成的 Pages 演示概念。进入生产前必须补充可验证来源、目标客群与成本假设。`,
    productType,
    stage: 'review',
    concept: {
      coreConcept: `将 ${signal.visualHint} 转化为一个可被小批量验证的 ${productType}。`,
      designAppearance: `围绕 ${signal.visualHint} 制作可讨论的物理形态，不使用第三方品牌标识。`,
      validationGoal: goal || '验证用户是否愿意留下兴趣反馈。',
      manufacturingNotes: 'Pages 演示不包含 BOM、打样报价或供应链承诺。',
    },
    imageUrl: null,
    generationMode: 'demo',
    interestCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  workspace?.ideas.unshift(idea);
  return idea;
}

function staticRequest<T>(path: string, init?: RequestInit): T {
  if (!workspace) throw new Error('Pages 演示尚未初始化。');
  const method = init?.method?.toUpperCase() || 'GET';
  const body = requestBody(init);
  if (method === 'GET' && path === '/api/health') return { ok: true, mode: 'demo', modelConfigured: true, persistence: 'browser-demo' } as T;
  if (method === 'GET' && path === '/api/dashboard') return dashboard() as T;
  if (method === 'GET' && path === '/api/trends') return { signals: workspace.signals } as T;
  if (method === 'GET' && path === '/api/ideas') return { ideas: workspace.ideas } as T;

  if (method === 'POST' && path === '/api/trends/import') {
    const sourceUrl = requireText(body.sourceUrl, '公开来源链接', 8);
    try { new URL(sourceUrl); } catch { throw new Error('公开来源链接必须是有效 URL。'); }
    const signal: Signal = {
      id: createId('signal'), sourceMode: 'manual', sourceLabel: 'Pages 演示手动导入', sourceUrl,
      platform: requireText(body.platform, '来源平台', 2), title: requireText(body.title, '信号标题', 4), summary: requireText(body.summary, '信号摘要', 12), visualHint: requireText(body.visualHint, '视觉或功能线索', 3), score: 0, capturedAt: timestamp(),
    };
    workspace.signals.unshift(signal);
    addEvent('imported_signal', 'signal', signal.id, 'Pages 演示已记录一条浏览器本地来源。');
    saveWorkspace();
    return { signal } as T;
  }

  if (method === 'POST' && path === '/api/generation-jobs') {
    const signalId = requireText(body.signalId, '信号', 1);
    const signal = workspace.signals.find((item) => item.id === signalId);
    if (!signal) throw new Error('未找到该信号。');
    const productType = requireText(body.productType, '产品类型', 2);
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    const idea = createDemoIdea(signal, productType, goal);
    const job: GenerationJob = { id: createId('job'), status: 'completed', error: null, ideaId: idea.id, createdAt: timestamp(), updatedAt: timestamp() };
    workspace.jobs.unshift(job);
    addEvent('generated_idea', 'idea', idea.id, 'Pages 演示已创建概念，未调用外部模型。');
    saveWorkspace();
    return { job } as T;
  }

  const jobMatch = path.match(/^\/api\/generation-jobs\/([^/]+)$/);
  if (method === 'GET' && jobMatch) {
    const job = workspace.jobs.find((item) => item.id === jobMatch[1]);
    if (!job) throw new Error('未找到该任务。');
    return { job } as T;
  }

  const reviewMatch = path.match(/^\/api\/ideas\/([^/]+)\/review$/);
  if (method === 'POST' && reviewMatch) {
    const idea = workspace.ideas.find((item) => item.id === reviewMatch[1]);
    if (!idea) throw new Error('未找到该概念。');
    if (idea.stage !== 'review') throw new Error('仅待审核概念可以被决定。');
    const decision = body.decision;
    if (decision !== 'approve' && decision !== 'reject') throw new Error('审核决定不符合要求。');
    idea.stage = decision === 'approve' ? 'approved' : 'rejected';
    idea.updatedAt = timestamp();
    addEvent(decision === 'approve' ? 'approved_idea' : 'rejected_idea', 'idea', idea.id, decision === 'approve' ? 'Pages 演示已批准概念进入验证。' : 'Pages 演示已拒绝概念。');
    saveWorkspace();
    return { idea } as T;
  }

  const interestMatch = path.match(/^\/api\/ideas\/([^/]+)\/interest$/);
  if (method === 'POST' && interestMatch) {
    const idea = workspace.ideas.find((item) => item.id === interestMatch[1]);
    if (!idea) throw new Error('未找到该概念。');
    if (idea.stage !== 'approved' && idea.stage !== 'validating') throw new Error('仅审核通过的概念可以记录兴趣反馈。');
    idea.interestCount += 1;
    idea.stage = 'validating';
    idea.updatedAt = timestamp();
    addEvent('recorded_interest', 'idea', idea.id, 'Pages 演示已记录一条浏览器本地兴趣反馈。');
    saveWorkspace();
    return { idea } as T;
  }

  throw new Error('Pages 演示不支持该操作。');
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (staticDemo) return staticRequest<T>(path, init);
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, ...init });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data && typeof data.error === 'string' ? data.error : '请求未能完成。';
    throw new Error(message);
  }
  return data as T;
}
