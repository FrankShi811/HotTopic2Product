import { randomUUID } from 'node:crypto';

export const IDEA_STAGES = /** @type {const} */ ([
  'review',
  'approved',
  'rejected',
  'validating',
  'ready',
]);

const DEMO_SIGNALS = [
  {
    id: 'signal-demo-texture',
    sourceMode: 'demo',
    sourceLabel: '示例信号库',
    sourceUrl: null,
    platform: 'Demo',
    title: '触感优先的小型桌面物件',
    summary: '用于展示导入、审核与概念生成流程的本地示例，不代表真实平台热度。',
    visualHint: '柔和陶瓷、织物折痕、钴蓝色点缀',
    score: 72,
    capturedAt: '2026-08-12T00:00:00.000Z',
  },
  {
    id: 'signal-demo-repair',
    sourceMode: 'demo',
    sourceLabel: '示例信号库',
    sourceUrl: null,
    platform: 'Demo',
    title: '可修复的日常收纳配件',
    summary: '示例记录强调可替换部件与低门槛维护，需由运营者补充来源和目标人群。',
    visualHint: '模块化卡扣、耐磨织带、可见维修结构',
    score: 64,
    capturedAt: '2026-08-11T00:00:00.000Z',
  },
  {
    id: 'signal-demo-quiet-tech',
    sourceMode: 'demo',
    sourceLabel: '示例信号库',
    sourceUrl: null,
    platform: 'Demo',
    title: '低干扰的随身科技配件',
    summary: '示例记录用于检验产品假设，而不是作为市场规模或需求证据。',
    visualHint: '半透明材质、柔雾表面、安静的指示色',
    score: 58,
    capturedAt: '2026-08-10T00:00:00.000Z',
  },
];

export function createSeedDatabase() {
  return {
    schemaVersion: 1,
    signals: DEMO_SIGNALS,
    ideas: [],
    jobs: [],
    auditEvents: [
      {
        id: 'audit-seed',
        action: 'seeded_demo_data',
        entityType: 'workspace',
        entityId: 'default',
        createdAt: '2026-08-12T00:00:00.000Z',
        detail: '本地演示数据已初始化，未连接外部社交平台。',
      },
    ],
  };
}

export function makeDemoIdea({ signal, productType, goal, id = randomUUID(), now = new Date().toISOString() }) {
  const focus = goal?.trim() || '验证用户是否愿意留下兴趣反馈';
  return {
    id,
    signalId: signal.id,
    title: `${signal.title} · ${productType}`,
    summary: `基于“${signal.title}”形成的本地示例概念。生成前仍需补充可验证的来源、目标客群与成本假设。`,
    productType,
    stage: 'review',
    concept: {
      coreConcept: `将 ${signal.visualHint} 转化为一个可被小批量验证的 ${productType}。`,
      designAppearance: `围绕 ${signal.visualHint} 制作可讨论的物理形态，不使用第三方品牌标识。`,
      validationGoal: focus,
      manufacturingNotes: '示例概念没有 BOM、打样报价或供应链承诺，进入生产前必须完成复核。',
    },
    imageFile: null,
    generationMode: 'demo',
    interestCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyReview(idea, decision, note, now = new Date().toISOString()) {
  if (idea.stage !== 'review') {
    throw new Error('Only ideas awaiting review can be decided.');
  }
  if (decision !== 'approve' && decision !== 'reject') {
    throw new Error('Review decision must be approve or reject.');
  }

  return {
    ...idea,
    stage: decision === 'approve' ? 'approved' : 'rejected',
    reviewNote: note?.trim() || null,
    updatedAt: now,
  };
}

export function summarizeWorkspace(database) {
  const stages = Object.fromEntries(IDEA_STAGES.map((stage) => [stage, 0]));
  for (const idea of database.ideas) {
    if (Object.hasOwn(stages, idea.stage)) stages[idea.stage] += 1;
  }

  return {
    signalCount: database.signals.length,
    ideaCount: database.ideas.length,
    reviewCount: stages.review,
    approvedCount: stages.approved,
    validationCount: stages.validating,
    stages,
  };
}
