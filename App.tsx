import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  ClipboardCheck,
  FlaskConical,
  Layers3,
  LoaderCircle,
  Moon,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  Upload,
  XCircle,
} from 'lucide-react';
import type { DashboardPayload, GenerationJob, HealthPayload, Idea, IdeaStage, Signal } from './types';
import { requestJson } from './services/dataSource';
import './index.css';

type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;

const stageCopy: Record<IdeaStage, string> = {
  review: '待审核', approved: '已批准', rejected: '已拒绝', validating: '验证中', ready: '可进入生产评审',
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function iconForEvent(action: string) {
  if (action.includes('approved')) return Check;
  if (action.includes('rejected')) return XCircle;
  if (action.includes('generation')) return Sparkles;
  return ClipboardCheck;
}

export default function App() {
  const appRoot = import.meta.env.BASE_URL;
  const parameters = useMemo(() => new URLSearchParams(window.location.search), []);
  const view = parameters.get('view') === 'catalog' ? 'catalog' : 'studio';
  const stageFilter = parameters.get('stage') as IdeaStage | null;
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [selectedSignalId, setSelectedSignalId] = useState<string>(() => parameters.get('signal') || '');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [theme, setTheme] = useState<'night' | 'light'>(() => window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'night');

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [dashboardData, healthData] = await Promise.all([requestJson<DashboardPayload>('/api/dashboard'), requestJson<HealthPayload>('/api/health')]);
      setDashboard(dashboardData);
      setHealth(healthData);
      setSelectedSignalId((current) => current || dashboardData.recentSignals[0]?.id || '');
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : '无法连接到本地服务。' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const scheduledLoad = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(scheduledLoad);
  }, []);
  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const selectedSignal = dashboard?.recentSignals.find((signal) => signal.id === selectedSignalId) || dashboard?.recentSignals[0];
  const visibleIdeas = (dashboard?.recentIdeas || []).filter((idea) => !stageFilter || idea.stage === stageFilter);
  const updateSelectedSignal = (id: string) => {
    setSelectedSignalId(id);
    const url = new URL(window.location.href);
    url.searchParams.set('signal', id);
    window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
  };

  const importSignal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusyId('import');
    try {
      const response = await requestJson<{ signal: Signal }>('/api/trends/import', {
        method: 'POST', body: JSON.stringify({ title: form.get('title'), summary: form.get('summary'), platform: form.get('platform'), sourceUrl: form.get('sourceUrl'), visualHint: form.get('visualHint') }),
      });
      event.currentTarget.reset();
      updateSelectedSignal(response.signal.id);
      setNotice({ tone: 'success', text: '来源已记录。它会保持为待验证信号，直到你完成审核。' });
      await load(true);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : '导入失败。' });
    } finally { setBusyId(null); }
  };

  const createIdea = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSignal) return;
    const form = new FormData(event.currentTarget);
    setBusyId('generate');
    try {
      const { job } = await requestJson<{ job: GenerationJob }>('/api/generation-jobs', {
        method: 'POST', body: JSON.stringify({ signalId: selectedSignal.id, productType: form.get('productType'), goal: form.get('goal') }),
      });
      let currentJob = job;
      for (let attempts = 0; attempts < 30 && (currentJob.status === 'queued' || currentJob.status === 'processing'); attempts += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
        currentJob = (await requestJson<{ job: GenerationJob }>(`/api/generation-jobs/${job.id}`)).job;
      }
      if (currentJob.status === 'failed') throw new Error(currentJob.error || '生成任务失败。');
      setNotice({ tone: 'success', text: health?.mode === 'gemini' ? '概念已生成，等待人工审核。' : '演示概念已创建，未调用外部模型。' });
      await load(true);
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : '生成失败。' });
    } finally { setBusyId(null); }
  };

  const reviewIdea = async (idea: Idea, decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !window.confirm('拒绝后该概念不会进入验证。是否继续？')) return;
    setBusyId(idea.id);
    try {
      await requestJson(`/api/ideas/${idea.id}/review`, { method: 'POST', body: JSON.stringify({ decision }) });
      setNotice({ tone: 'success', text: decision === 'approve' ? '概念已批准，可开始记录验证反馈。' : '概念已拒绝，保留了审核轨迹。' });
      await load(true);
    } catch (error) { setNotice({ tone: 'error', text: error instanceof Error ? error.message : '审核操作失败。' }); } finally { setBusyId(null); }
  };

  const recordInterest = async (idea: Idea) => {
    setBusyId(idea.id);
    try {
      await requestJson(`/api/ideas/${idea.id}/interest`, { method: 'POST' });
      setNotice({ tone: 'success', text: '已记录一条合格兴趣反馈，不代表付款或生产承诺。' });
      await load(true);
    } catch (error) { setNotice({ tone: 'error', text: error instanceof Error ? error.message : '记录失败。' }); } finally { setBusyId(null); }
  };

  return <div className="app-shell" data-theme={theme}>
    <a className="skip-link" href="#main-content">跳至主要内容</a>
    <header className="topbar">
      <a className="brand" href={appRoot} aria-label="Signal Forge 工作台首页"><span className="brand-mark" aria-hidden="true"><Layers3 size={18} strokeWidth={2.4} /></span><span>Signal Forge</span><small>OPERATIONS</small></a>
      <nav aria-label="主导航"><a className={view === 'studio' ? 'nav-link active' : 'nav-link'} href={appRoot}>工作台</a><a className={view === 'catalog' ? 'nav-link active' : 'nav-link'} href={`${appRoot}?view=catalog`}>概念库</a></nav>
      <div className="topbar-actions"><span className={`mode-chip ${health?.mode === 'gemini' ? 'live' : ''}`}><span aria-hidden="true" /> {health?.mode === 'gemini' ? '服务端模型' : health?.persistence === 'browser-demo' ? 'Pages 演示' : '本地演示'}</span><button className="icon-button" type="button" aria-label={theme === 'night' ? '切换为浅色主题' : '切换为深色主题'} onClick={() => setTheme(theme === 'night' ? 'light' : 'night')}>{theme === 'night' ? <Sun size={17} /> : <Moon size={17} />}</button></div>
    </header>
    <main id="main-content" className="workspace" tabIndex={-1}>
      {notice && <div className={`notice ${notice.tone}`} role="status" aria-live="polite"><span>{notice.text}</span><button type="button" onClick={() => setNotice(null)} aria-label="关闭提示">×</button></div>}
      {loading && <LoadingWorkspace />}
      {!loading && !dashboard && <ErrorWorkspace onRetry={() => void load()} />}
      {!loading && dashboard && (view === 'studio' ? <StudioView appRoot={appRoot} dashboard={dashboard} health={health} selectedSignal={selectedSignal} selectedSignalId={selectedSignalId} busyId={busyId} refreshing={refreshing} onSelectSignal={updateSelectedSignal} onImport={importSignal} onCreateIdea={createIdea} onRefresh={() => void load(true)} /> : <CatalogView appRoot={appRoot} ideas={visibleIdeas} stageFilter={stageFilter} busyId={busyId} onReview={reviewIdea} onInterest={recordInterest} />)}
    </main>
  </div>;
}

function StudioView({ appRoot, dashboard, health, selectedSignal, selectedSignalId, busyId, refreshing, onSelectSignal, onImport, onCreateIdea, onRefresh }: { appRoot: string; dashboard: DashboardPayload; health: HealthPayload | null; selectedSignal: Signal | undefined; selectedSignalId: string; busyId: string | null; refreshing: boolean; onSelectSignal: (id: string) => void; onImport: (event: FormEvent<HTMLFormElement>) => void; onCreateIdea: (event: FormEvent<HTMLFormElement>) => void; onRefresh: () => void; }) {
  return <>
    <section className="overview" aria-labelledby="workspace-title"><div><p className="eyebrow">运营决策工作台</p><h1 id="workspace-title">从有证据的信号，走到可审核的产品假设。</h1><p className="lede">先记录来源，再生成概念，再由人批准。系统不会把示例数据或兴趣反馈误报成真实市场需求。</p></div><figure className="signal-figure"><img src={`${appRoot}assets/signal-to-object.png`} width="1500" height="1000" alt="由织物、陶瓷和半透明配件组成的概念物件静物" fetchPriority="high" /><figcaption>概念插图，仅用于解释工作流</figcaption></figure></section>
    <dl className="metric-strip" aria-label="工作区概览"><div><dt>已记录信号</dt><dd>{dashboard.summary.signalCount}</dd><span>保留来源与抓取时间</span></div><div><dt>待人工审核</dt><dd>{dashboard.summary.reviewCount}</dd><span>生成不等于批准</span></div><div><dt>已批准概念</dt><dd>{dashboard.summary.approvedCount}</dd><span>可开始验证</span></div><div><dt>验证中的概念</dt><dd>{dashboard.summary.validationCount}</dd><span>记录兴趣，不收款</span></div></dl>
    <section className="studio-grid" aria-label="信号和概念操作区">
      <div className="signal-queue"><div className="section-heading"><div><p className="eyebrow">01 / 来源队列</p><h2>选择一个信号</h2></div><button className="text-button" type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} 刷新</button></div><div className="source-disclaimer"><span>示例模式</span> 内置数据不会连接、抓取或声称来自任何社交平台。</div><div className="signal-list" role="list">{dashboard.recentSignals.map((signal) => <button className={`signal-row ${selectedSignalId === signal.id ? 'selected' : ''}`} type="button" key={signal.id} onClick={() => onSelectSignal(signal.id)} aria-pressed={selectedSignalId === signal.id}><span className="score">{signal.score || '—'}</span><span className="signal-copy"><strong>{signal.title}</strong><small>{signal.sourceMode === 'manual' ? `${signal.platform} · 已记录链接` : '示例信号 · 需补充外部证据'}</small></span><ArrowUpRight size={16} aria-hidden="true" /></button>)}</div>
        <details className="import-panel"><summary><Upload size={16} /> 手动导入可复核来源</summary><form onSubmit={onImport} className="form-grid"><label>信号标题<input name="title" autoComplete="off" required minLength={4} maxLength={120} placeholder="例如：通勤人群的可修复收纳需求…" /></label><label>来源平台<input name="platform" autoComplete="off" required minLength={2} maxLength={40} placeholder="例如：Reddit、客户访谈…" /></label><label className="wide">公开来源链接<input name="sourceUrl" type="url" autoComplete="off" required maxLength={2048} placeholder="例如：https://example.com/source…" /></label><label className="wide">信号摘要<textarea name="summary" autoComplete="off" required minLength={12} maxLength={700} rows={3} placeholder="记录可验证的原始观察，不写成市场结论…" /></label><label className="wide">视觉或功能线索<input name="visualHint" autoComplete="off" required minLength={3} maxLength={240} placeholder="例如：材质、使用情景、行为线索…" /></label><button className="primary-button wide" type="submit" disabled={busyId === 'import'}>{busyId === 'import' ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />} 记录来源</button></form></details>
      </div>
      <aside className="concept-panel" aria-labelledby="concept-title"><p className="eyebrow">02 / 概念生成</p><h2 id="concept-title">把信号变成待审核假设</h2>{selectedSignal ? <><div className="selected-evidence"><span>当前信号</span><strong>{selectedSignal.title}</strong><p>{selectedSignal.summary}</p><small>{selectedSignal.sourceMode === 'manual' && selectedSignal.sourceUrl ? <a href={selectedSignal.sourceUrl} target="_blank" rel="noreferrer">打开已记录来源 <ArrowUpRight size={13} /></a> : '这是内置示例，不能作为来源证据。'}</small></div><form onSubmit={onCreateIdea} className="form-grid concept-form"><label>产品类型<input name="productType" autoComplete="off" required defaultValue="桌面收纳配件" maxLength={60} /></label><label>本轮验证目标<textarea name="goal" autoComplete="off" rows={3} maxLength={300} placeholder="例如：确认用户是否愿意留下可回访的兴趣信息…" /></label><button className="primary-button" type="submit" disabled={busyId === 'generate'}>{busyId === 'generate' ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} {health?.mode === 'gemini' ? '在服务端生成概念' : '创建演示概念'}</button></form><p className="microcopy">{health?.mode === 'gemini' ? '密钥只保留在服务端。模型输出和图像仍须经过人工审核与权利检查。' : '演示模式只创建文本概念，不调用模型，也不会生成仿真的产品图。'}</p></> : <p className="empty-inline">先导入或选择一条信号。</p>}</aside>
    </section>
    <section className="lower-grid"><div className="activity-feed"><div className="section-heading"><div><p className="eyebrow">审计轨迹</p><h2>最近操作</h2></div></div>{dashboard.recentEvents.length ? <ol>{dashboard.recentEvents.map((event) => { const Icon = iconForEvent(event.action); return <li key={event.id}><span className="event-icon"><Icon size={15} /></span><div><strong>{event.detail}</strong><small>{formatTime(event.createdAt)} · {event.action}</small></div></li>; })}</ol> : <p className="empty-inline">尚未记录操作。</p>}</div><div className="review-guide"><FlaskConical size={19} /><div><p className="eyebrow">操作护栏</p><h2>先审核，再验证</h2><p>批准只表示允许进入下一步验证，不代表生产、交付、价格或任何筹款承诺。</p><a href={`${appRoot}?view=catalog&stage=review`}>查看待审核概念 <ArrowUpRight size={15} /></a></div></div></section>
  </>;
}

function CatalogView({ appRoot, ideas, stageFilter, busyId, onReview, onInterest }: { appRoot: string; ideas: Idea[]; stageFilter: IdeaStage | null; busyId: string | null; onReview: (idea: Idea, decision: 'approve' | 'reject') => void; onInterest: (idea: Idea) => void; }) {
  const filters: Array<{ id: IdeaStage | null; label: string }> = [{ id: null, label: '全部' }, { id: 'review', label: '待审核' }, { id: 'approved', label: '已批准' }, { id: 'validating', label: '验证中' }, { id: 'rejected', label: '已拒绝' }];
  return <section className="catalog" aria-labelledby="catalog-title"><div className="catalog-heading"><div><p className="eyebrow">概念库</p><h1 id="catalog-title">每个产品假设都能回到原始信号。</h1><p className="lede">仅展示本地工作区中的概念。图片如存在，会明确标注为模型生成的内部审核材料。</p></div><a className="secondary-button" href={appRoot}><Plus size={17} /> 新建概念</a></div><nav className="filter-row" aria-label="按阶段筛选概念">{filters.map((filter) => <a key={filter.label} className={stageFilter === filter.id ? 'filter active' : 'filter'} href={filter.id ? `${appRoot}?view=catalog&stage=${filter.id}` : `${appRoot}?view=catalog`}>{filter.label}</a>)}</nav>{ideas.length ? <div className="idea-grid">{ideas.map((idea) => <article className="idea-card" key={idea.id}>{idea.imageUrl ? <figure><img src={idea.imageUrl} alt={`${idea.title} 的模型生成概念物件图，仅供审核`} width="900" height="1200" loading="lazy" /><figcaption>模型生成，内部审核用</figcaption></figure> : <div className="idea-placeholder"><Sparkles size={22} /><span>无图片概念</span></div>}<div className="idea-card-body"><div className="card-meta"><span className={`stage ${idea.stage}`}>{stageCopy[idea.stage]}</span><span>{idea.generationMode === 'gemini' ? '服务端模型' : '演示概念'}</span></div><h2>{idea.title}</h2><p>{idea.summary}</p><dl><div><dt>验证目标</dt><dd>{idea.concept.validationGoal}</dd></div><div><dt>兴趣反馈</dt><dd>{idea.interestCount} 条</dd></div></dl>{idea.stage === 'review' && <div className="card-actions"><button className="approve-button" type="button" disabled={busyId === idea.id} onClick={() => onReview(idea, 'approve')}><Check size={16} /> 批准进入验证</button><button className="reject-button" type="button" disabled={busyId === idea.id} onClick={() => onReview(idea, 'reject')}><XCircle size={16} /> 拒绝</button></div>}{(idea.stage === 'approved' || idea.stage === 'validating') && <button className="secondary-button compact" type="button" disabled={busyId === idea.id} onClick={() => onInterest(idea)}><ClipboardCheck size={16} /> 记录兴趣反馈</button>}</div></article>)}</div> : <div className="empty-state"><Layers3 size={28} /><h2>这个筛选下还没有概念</h2><p>回到工作台，从一条已记录的信号创建待审核概念。</p><a className="primary-button" href={appRoot}><Plus size={17} /> 回到工作台</a></div>}</section>;
}

function LoadingWorkspace() { return <div className="loading-workspace" aria-label="正在加载工作区"><div className="skeleton hero" /><div className="skeleton metrics" /><div className="skeleton content" /></div>; }
function ErrorWorkspace({ onRetry }: { onRetry: () => void }) { return <div className="empty-state error-state"><XCircle size={28} /><h1>本地服务尚未就绪</h1><p>请通过 <code>npm run dev</code> 同时启动 API 与前端，然后重试。</p><button className="primary-button" type="button" onClick={onRetry}><RefreshCw size={17} /> 重试连接</button></div>; }
