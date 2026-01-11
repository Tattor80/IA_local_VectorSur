import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

import { ingestDocuments, RagDocument } from '@/utils/server/rag';

export const config = {
  runtime: 'nodejs',
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const inputDocs = Array.isArray(body?.documents)
      ? body.documents
      : [body];

    const documents: RagDocument[] = inputDocs
      .filter((doc: any) => doc && typeof doc.text === 'string')
      .map((doc: any) => ({
        id: doc.id || crypto.randomUUID(),
        text: doc.text,
        metadata: doc.metadata,
      }));

    if (!documents.length) {
      res.status(400).json({ error: 'No documents to ingest.' });
      return;
    }

    const result = await ingestDocuments(documents);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    console.error('RAG ingest error:', error);
    res.status(500).json({
      error: 'RAG ingest failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default handler;
