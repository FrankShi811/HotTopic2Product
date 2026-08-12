export type SourceMode = 'demo' | 'manual';
export type IdeaStage = 'review' | 'approved' | 'rejected' | 'validating' | 'ready';

export interface Signal {
  id: string;
  sourceMode: SourceMode;
  sourceLabel: string;
  sourceUrl: string | null;
  platform: string;
  title: string;
  summary: string;
  visualHint: string;
  score: number;
  capturedAt: string;
}

export interface ProductConcept {
  coreConcept: string;
  designAppearance: string;
  validationGoal: string;
  manufacturingNotes: string;
}

export interface Idea {
  id: string;
  signalId: string;
  title: string;
  summary: string;
  productType: string;
  stage: IdeaStage;
  concept: ProductConcept;
  imageUrl: string | null;
  generationMode: 'demo' | 'gemini';
  interestCount: number;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary {
  signalCount: number;
  ideaCount: number;
  reviewCount: number;
  approvedCount: number;
  validationCount: number;
  stages: Record<IdeaStage, number>;
}

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
}

export interface DashboardPayload {
  summary: WorkspaceSummary;
  recentSignals: Signal[];
  recentIdeas: Idea[];
  recentEvents: AuditEvent[];
}

export interface HealthPayload {
  ok: boolean;
  mode: 'demo' | 'gemini';
  modelConfigured: boolean;
  persistence: 'local-file';
}

export interface GenerationJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error: string | null;
  ideaId: string | null;
  createdAt: string;
  updatedAt: string;
}
