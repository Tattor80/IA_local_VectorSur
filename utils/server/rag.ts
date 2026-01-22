import crypto from 'crypto';
import { OLLAMA_HOST } from '@/utils/app/const';

export type RagDocument = {
  id: string;
  text: string;
  metadata?: {
    source?: string;
    title?: string;
    category?: string; // Department
  };
};

type RagMatch = {
  score: number;
  payload?: {
    text?: string;
    doc_id?: string;
    source?: string;
    title?: string;
    chunk_index?: number;
    category?: string;
  };
};

const RAG_ENABLED = process.env.RAG_ENABLED === 'true';
const RAG_QDRANT_URL =
  (process.env.RAG_QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/+$/, '');
const RAG_COLLECTION = process.env.RAG_COLLECTION || 'chatbot_ollama';
const RAG_EMBED_MODEL = process.env.RAG_EMBED_MODEL || 'nomic-embed-text';
const RAG_TOP_K = parseInt(process.env.RAG_TOP_K || '5', 10);
const RAG_SCORE_THRESHOLD = parseFloat(
  process.env.RAG_SCORE_THRESHOLD || '0.3',
);
const RAG_MAX_CONTEXT_CHARS = parseInt(
  process.env.RAG_MAX_CONTEXT_CHARS || '4000',
  10,
);
const RAG_CHUNK_SIZE = parseInt(process.env.RAG_CHUNK_SIZE || '1000', 10);
const RAG_CHUNK_OVERLAP = parseInt(process.env.RAG_CHUNK_OVERLAP || '200', 10);

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const splitText = (input: string, chunkSize: number, overlap: number) => {
  const text = input.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const chunks: { text: string; index: number }[] = [];
  let start = 0;
  let index = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({ text: text.slice(start, end), index });
    index += 1;
    if (end >= text.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
};

const fetchJson = async (url: string, options: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Request failed (${res.status}): ${body || url}`);
  }
  return res.json();
};

const embedText = async (text: string) => {
  const data = await fetchJson(`${OLLAMA_HOST}/api/embeddings`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      model: RAG_EMBED_MODEL,
      prompt: text,
    }),
  });
  const embedding = data?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding response missing embedding vector.');
  }
  return embedding as number[];
};

const ensureCollection = async (vectorSize: number) => {
  const collectionUrl = `${RAG_QDRANT_URL}/collections/${RAG_COLLECTION}`;
  const res = await fetch(collectionUrl, { method: 'GET' });
  if (res.status === 200) return;
  if (res.status !== 404) {
    const body = await res.text();
    throw new Error(`Qdrant error (${res.status}): ${body || collectionUrl}`);
  }
  await fetchJson(collectionUrl, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
      on_disk_payload: true // Optimization for filtering
    }),
  });
};

export const resetRagCollection = async () => {
  if (!RAG_ENABLED) {
    throw new Error('RAG is disabled. Set RAG_ENABLED=true.');
  }
  const collectionUrl = `${RAG_QDRANT_URL}/collections/${RAG_COLLECTION}`;
  const res = await fetch(collectionUrl, { method: 'DELETE' });
  if (res.status === 404 || res.status === 200) return;
  const body = await res.text();
  throw new Error(`Qdrant error (${res.status}): ${body || collectionUrl}`);
};

const upsertPoints = async (points: any[]) => {
  const batchSize = 64;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await fetchJson(
      `${RAG_QDRANT_URL}/collections/${RAG_COLLECTION}/points?wait=true`,
      {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ points: batch }),
      },
    );
  }
};


export const deleteDocumentsBySource = async (source: string) => {
  if (!RAG_ENABLED) return;
  const collectionUrl = `${RAG_QDRANT_URL}/collections/${RAG_COLLECTION}/points/delete`;
  await fetchJson(collectionUrl, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      filter: {
        must: [
          {
            key: 'source',
            match: {
              value: source,
            },
          },
        ],
      },
    }),
  });
};

export const deleteDocumentsByCategory = async (category: string) => {
  if (!RAG_ENABLED) return;
  const collectionUrl = `${RAG_QDRANT_URL}/collections/${RAG_COLLECTION}/points/delete`;
  await fetchJson(collectionUrl, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      filter: {
        must: [
          {
            key: 'category',
            match: {
              value: category,
            },
          },
        ],
      },
    }),
  });
};

export const ingestDocuments = async (documents: RagDocument[]) => {
  if (!RAG_ENABLED) {
    throw new Error('RAG is disabled. Set RAG_ENABLED=true.');
  }
  const points: any[] = [];
  let collectionReady = false;
  let totalChunks = 0;

  for (const doc of documents) {
    const chunks = splitText(doc.text, RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP);
    for (const chunk of chunks) {
      const embedding = await embedText(chunk.text);
      if (!collectionReady) {
        await ensureCollection(embedding.length);
        collectionReady = true;
      }
      points.push({
        id: crypto.randomUUID(),
        vector: embedding,
        payload: {
          text: chunk.text,
          doc_id: doc.id,
          chunk_index: chunk.index,
          source: doc.metadata?.source,
          title: doc.metadata?.title,
          category: doc.metadata?.category, // Department
        },
      });
      totalChunks += 1;
    }
  }

  if (points.length > 0) {
    await upsertPoints(points);
  }

  return { documents: documents.length, chunks: totalChunks };
};

const searchSimilar = async (query: string, department?: string) => {
  if (!RAG_ENABLED) return [] as RagMatch[];
  const embedding = await embedText(query);

  const filter = department && department !== 'all' ? {
    must: [
      {
        key: 'category',
        match: {
          value: department,
        },
      },
    ],
  } : undefined;

  const body: Record<string, any> = {
    vector: embedding,
    limit: RAG_TOP_K,
    with_payload: true,
    filter,
  };

  if (!Number.isNaN(RAG_SCORE_THRESHOLD)) {
    body.score_threshold = RAG_SCORE_THRESHOLD;
  }
  const data = await fetchJson(
    `${RAG_QDRANT_URL}/collections/${RAG_COLLECTION}/points/search`,
    {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    },
  );
  return (data?.result || []) as RagMatch[];
};

const buildContext = (matches: RagMatch[]) => {
  if (!matches.length) return '';
  const lines: string[] = [];
  let totalChars = 0;
  for (const match of matches) {
    const payload = match.payload || {};
    const text = payload.text || '';
    if (!text) continue;
    const label =
      payload.title || payload.source || payload.doc_id || 'document';
    const deptInfo = payload.category ? ` [${payload.category}]` : '';
    const entry = `[${label}${deptInfo}#${payload.chunk_index ?? 0}] ${text}`;
    if (totalChars + entry.length > RAG_MAX_CONTEXT_CHARS) break;
    lines.push(entry);
    totalChars += entry.length + 1;
  }
  return lines.join('\n\n');
};

export const queryRagMatches = async (query: string, department?: string) => {
  if (!RAG_ENABLED) {
    throw new Error('RAG is disabled. Set RAG_ENABLED=true.');
  }
  const trimmed = (query || '').trim();
  if (!trimmed) return [];
  const matches = await searchSimilar(trimmed, department);
  return matches.map((match) => ({
    score: match.score,
    text: match.payload?.text || '',
    doc_id: match.payload?.doc_id,
    source: match.payload?.source,
    title: match.payload?.title,
    chunk_index: match.payload?.chunk_index,
    category: match.payload?.category,
  }));
};

export const getRagContext = async (query?: string, department?: string) => {
  if (!RAG_ENABLED) return { context: '', matches: [] };
  const trimmed = (query || '').trim();
  if (!trimmed) return { context: '', matches: [] };
  try {
    const matches = await searchSimilar(trimmed, department);
    const context = buildContext(matches);
    return {
      context,
      matches: matches.map(m => ({
        score: m.score,
        text: m.payload?.text,
        source: m.payload?.source,
        title: m.payload?.title,
        category: m.payload?.category
      }))
    };
  } catch (error) {
    console.error('RAG lookup failed:', error);
    return { context: '', matches: [] };
  }
};
