import { describe, expect, it } from 'vitest';
import { applyReview, createSeedDatabase, makeDemoIdea, summarizeWorkspace } from './domain.mjs';

describe('workspace domain rules', () => {
  it('seeds only clearly marked demo signals', () => {
    const database = createSeedDatabase();
    expect(database.signals).toHaveLength(3);
    expect(database.signals.every((signal) => signal.sourceMode === 'demo')).toBe(true);
  });

  it('creates a review-required demo concept without a generated image', () => {
    const signal = createSeedDatabase().signals[0];
    const idea = makeDemoIdea({ signal, productType: '桌面收纳盒', id: 'idea-1', now: '2026-08-12T00:00:00.000Z' });
    expect(idea.stage).toBe('review');
    expect(idea.imageFile).toBeNull();
    expect(idea.generationMode).toBe('demo');
  });

  it('requires review before an idea can be approved', () => {
    const signal = createSeedDatabase().signals[0];
    const draft = makeDemoIdea({ signal, productType: '桌面收纳盒', id: 'idea-1' });
    const approved = applyReview(draft, 'approve', 'Source needs a follow-up check.');
    expect(approved.stage).toBe('approved');
    expect(() => applyReview(approved, 'approve')).toThrow('Only ideas awaiting review');
  });

  it('summarizes stages for the dashboard', () => {
    const database = createSeedDatabase();
    database.ideas.push({ stage: 'review' }, { stage: 'approved' }, { stage: 'validating' });
    expect(summarizeWorkspace(database)).toMatchObject({ signalCount: 3, ideaCount: 3, reviewCount: 1, approvedCount: 1, validationCount: 1 });
  });
});
