import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { applyReview, createSeedDatabase, makeDemoIdea, summarizeWorkspace } from './domain.mjs';

const workspaceRoot = process.cwd();
const dataDirectory = path.resolve(process.env.DATA_DIR || path.join(workspaceRoot, 'data'));
const assetsDirectory = path.join(dataDirectory, 'assets');
const dataFile = path.join(dataDirectory, 'atelier.json');
const port = Number(process.env.PORT || 3000);
const modelMode = process.env.MODEL_MODE === 'gemini' ? 'gemini' : 'demo';
const apiKey = process.env.GEMINI_API_KEY;
const textModel = process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash';
const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const app = express();

let database;
let writeQueue = Promise.resolve();
const generationRequests = new Map();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const signalInput = z.object({
  title: z.string().trim().min(4).max(120),
  summary: z.string().trim().min(12).max(700),
  platform: z.string().trim().min(2).max(40),
  sourceUrl: z.url().max(2048),
  visualHint: z.string().trim().min(3).max(240),
});

const generationInput = z.object({
  signalId: z.string().uuid().or(z.string().startsWith('signal-demo-')),
  productType: z.string().trim().min(2).max(60),
  goal: z.string().trim().max(300).optional(),
});

const reviewInput = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional(),
});

function now() {
  return new Date().toISOString();
}

function publicIdea(idea) {
  return {
    ...idea,
    imageUrl: idea.imageFile ? `/api/assets/${encodeURIComponent(idea.imageFile)}` : null,
  };
}

function recordAudit(action, entityType, entityId, detail) {
  database.auditEvents.unshift({
    id: randomUUID(),
    action,
    entityType,
    entityId,
    detail,
    createdAt: now(),
  });
  database.auditEvents = database.auditEvents.slice(0, 200);
}

async function initializeStorage() {
  await mkdir(assetsDirectory, { recursive: true });
  try {
    const raw = await readFile(dataFile, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.signals) || !Array.isArray(parsed.ideas) || !Array.isArray(parsed.jobs)) {
      throw new Error('Invalid data shape');
    }
    database = parsed;
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.warn('Unable to read local workspace data. Starting with a clean store.', error.message);
    }
    database = createSeedDatabase();
    await persist();
  }
}

function persist() {
  const snapshot = JSON.stringify(database, null, 2);
  writeQueue = writeQueue.then(async () => {
    const temporaryFile = `${dataFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, snapshot, 'utf8');
    await rename(temporaryFile, dataFile);
  });
  return writeQueue;
}

function getJob(jobId) {
  return database.jobs.find((job) => job.id === jobId);
}

function getSignal(signalId) {
  return database.signals.find((signal) => signal.id === signalId);
}

function rateLimitGeneration(req) {
  const key = req.ip || 'unknown';
  const windowMs = 10 * 60 * 1000;
  const limit = 10;
  const threshold = Date.now() - windowMs;
  const timestamps = (generationRequests.get(key) || []).filter((time) => time > threshold);
  if (timestamps.length >= limit) return false;
  timestamps.push(Date.now());
  generationRequests.set(key, timestamps);
  return true;
}

function safeJson(text) {
  const candidate = String(text || '').match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) throw new Error('Model did not return a JSON concept.');
  const parsed = JSON.parse(candidate);
  const schema = z.object({
    title: z.string().trim().min(4).max(120),
    summary: z.string().trim().min(12).max(500),
    coreConcept: z.string().trim().min(12).max(700),
    designAppearance: z.string().trim().min(12).max(700),
    validationGoal: z.string().trim().min(8).max(400),
    manufacturingNotes: z.string().trim().min(12).max(700),
  });
  return schema.parse(parsed);
}

async function generateWithGemini(signal, input, ideaId) {
  if (!apiKey) throw new Error('Gemini is not configured on the server.');
  const client = new GoogleGenAI({ apiKey });
  const conceptPrompt = [
    'You are assisting a product discovery operator.',
    'Create a cautious physical product concept from this operator-supplied signal.',
    'Do not claim the signal is verified market demand. Do not use brand names, copyrighted characters, or logos.',
    `Signal title: ${signal.title}`,
    `Signal summary: ${signal.summary}`,
    `Visual direction: ${signal.visualHint}`,
    `Product type: ${input.productType}`,
    `Validation goal: ${input.goal || 'Collect qualified interest before investment.'}`,
    'Return JSON only with title, summary, coreConcept, designAppearance, validationGoal, manufacturingNotes.',
  ].join('\n');
  const conceptResponse = await client.models.generateContent({
    model: textModel,
    contents: conceptPrompt,
    config: { responseMimeType: 'application/json', temperature: 0.35 },
  });
  const concept = safeJson(conceptResponse.text);
  const imagePrompt = [
    'Create one photorealistic, unbranded studio product photograph for internal concept review.',
    'No people, no logos, no readable text, no celebrity likeness, no copyrighted characters, no watermarks.',
    `Product: ${input.productType}.`,
    `Concept: ${concept.coreConcept}`,
    `Appearance: ${concept.designAppearance}`,
    'Show a single plausible physical object with clear material detail on a neutral background.',
  ].join('\n');
  const imageResponse = await client.models.generateContent({
    model: imageModel,
    contents: imagePrompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '3:4' },
    },
  });
  const imagePart = imageResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) throw new Error('Model did not return an image.');
  const mimeType = imagePart.inlineData.mimeType || 'image/png';
  const extension = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const imageFile = `${ideaId}.${extension}`;
  await writeFile(path.join(assetsDirectory, imageFile), Buffer.from(imagePart.inlineData.data, 'base64'));
  return { concept, imageFile };
}

async function processGeneration(jobId) {
  const job = getJob(jobId);
  if (!job) return;
  job.status = 'processing';
  job.updatedAt = now();
  await persist();

  try {
    const signal = getSignal(job.input.signalId);
    if (!signal) throw new Error('Signal was removed before generation started.');
    const ideaId = randomUUID();
    const generated = modelMode === 'gemini'
      ? await generateWithGemini(signal, job.input, ideaId)
      : makeDemoIdea({ signal, productType: job.input.productType, goal: job.input.goal, id: ideaId, now: now() });

    const idea = modelMode === 'gemini'
      ? {
          id: ideaId,
          signalId: signal.id,
          title: generated.concept.title,
          summary: generated.concept.summary,
          productType: job.input.productType,
          stage: 'review',
          concept: {
            coreConcept: generated.concept.coreConcept,
            designAppearance: generated.concept.designAppearance,
            validationGoal: generated.concept.validationGoal,
            manufacturingNotes: generated.concept.manufacturingNotes,
          },
          imageFile: generated.imageFile,
          generationMode: 'gemini',
          interestCount: 0,
          createdAt: now(),
          updatedAt: now(),
        }
      : generated;
    database.ideas.unshift(idea);
    job.status = 'completed';
    job.ideaId = idea.id;
    job.updatedAt = now();
    recordAudit('generated_idea', 'idea', idea.id, modelMode === 'gemini' ? 'Server-side Gemini generation completed.' : 'Demo concept created without a model call.');
  } catch (error) {
    job.status = 'failed';
    job.error = modelMode === 'gemini' && !apiKey
      ? '服务器尚未配置 GEMINI_API_KEY。'
      : '概念生成失败。请检查服务端日志、模型权限和配额后重试。';
    job.updatedAt = now();
    console.error(`Generation job ${jobId} failed:`, error);
  }
  await persist();
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: modelMode,
    modelConfigured: modelMode === 'demo' || Boolean(apiKey),
    persistence: 'local-file',
  });
});

app.get('/api/dashboard', (_req, res) => {
  res.json({
    summary: summarizeWorkspace(database),
    recentSignals: database.signals.slice(0, 6),
    recentIdeas: database.ideas.slice(0, 8).map(publicIdea),
    recentEvents: database.auditEvents.slice(0, 8),
  });
});

app.get('/api/trends', (_req, res) => {
  res.json({ signals: database.signals });
});

app.post('/api/trends/import', async (req, res, next) => {
  try {
    const input = signalInput.parse(req.body);
    const signal = {
      id: randomUUID(),
      ...input,
      sourceMode: 'manual',
      sourceLabel: '运营者手动导入',
      score: 0,
      capturedAt: now(),
    };
    database.signals.unshift(signal);
    recordAudit('imported_signal', 'signal', signal.id, `Manual source recorded: ${signal.sourceUrl}`);
    await persist();
    res.status(201).json({ signal });
  } catch (error) {
    next(error);
  }
});

app.post('/api/generation-jobs', async (req, res, next) => {
  try {
    const input = generationInput.parse(req.body);
    if (!getSignal(input.signalId)) return res.status(404).json({ error: '未找到该信号。' });
    if (!rateLimitGeneration(req)) return res.status(429).json({ error: '生成请求过于频繁，请十分钟后重试。' });
    const job = {
      id: randomUUID(),
      input,
      status: 'queued',
      error: null,
      ideaId: null,
      createdAt: now(),
      updatedAt: now(),
    };
    database.jobs.unshift(job);
    recordAudit('queued_generation', 'job', job.id, `Requested ${input.productType} concept.`);
    await persist();
    queueMicrotask(() => void processGeneration(job.id));
    res.status(202).json({ job });
  } catch (error) {
    next(error);
  }
});

app.get('/api/generation-jobs/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: '未找到该任务。' });
  res.json({ job });
});

app.get('/api/ideas', (_req, res) => {
  res.json({ ideas: database.ideas.map(publicIdea) });
});

app.post('/api/ideas/:ideaId/review', async (req, res, next) => {
  try {
    const input = reviewInput.parse(req.body);
    const index = database.ideas.findIndex((idea) => idea.id === req.params.ideaId);
    if (index === -1) return res.status(404).json({ error: '未找到该概念。' });
    const existing = database.ideas[index];
    database.ideas[index] = applyReview(existing, input.decision, input.note, now());
    recordAudit(input.decision === 'approve' ? 'approved_idea' : 'rejected_idea', 'idea', existing.id, input.note || 'No review note.');
    await persist();
    res.json({ idea: publicIdea(database.ideas[index]) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ideas/:ideaId/interest', async (req, res) => {
  const idea = database.ideas.find((item) => item.id === req.params.ideaId);
  if (!idea) return res.status(404).json({ error: '未找到该概念。' });
  if (idea.stage !== 'approved' && idea.stage !== 'validating') {
    return res.status(409).json({ error: '仅审核通过的概念可以记录兴趣反馈。' });
  }
  idea.interestCount += 1;
  idea.stage = 'validating';
  idea.updatedAt = now();
  recordAudit('recorded_interest', 'idea', idea.id, 'Operator recorded a qualified interest signal.');
  await persist();
  res.json({ idea: publicIdea(idea) });
});

app.get('/api/assets/:file', async (req, res) => {
  const filename = path.basename(req.params.file);
  if (!/^[a-f0-9-]+\.(png|jpg)$/i.test(filename)) return res.status(404).end();
  const assetPath = path.join(assetsDirectory, filename);
  try {
    await access(assetPath);
    res.sendFile(assetPath);
  } catch {
    res.status(404).end();
  }
});

app.use((error, _req, res, next) => {
  void next;
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: '输入不符合要求。', fields: error.flatten().fieldErrors });
  }
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: '请求内容过大。' });
  console.error('Unhandled API error:', error);
  return res.status(500).json({ error: '服务暂时无法完成请求。' });
});

const distDirectory = path.join(workspaceRoot, 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distDirectory, { index: false, maxAge: '1h', etag: true }));
  app.get('/{*splat}', async (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    try {
      await access(path.join(distDirectory, 'index.html'));
      return res.sendFile(path.join(distDirectory, 'index.html'));
    } catch {
      return res.status(503).send('Build the client before starting the production server.');
    }
  });
}

await initializeStorage();
app.listen(port, '127.0.0.1', () => {
  console.log(`Signal Forge API listening on http://127.0.0.1:${port} in ${modelMode} mode.`);
});
