import type { NextApiRequest, NextApiResponse } from 'next';

import { queryRagMatches } from '@/utils/server/rag';

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
    const query = body?.query;
    if (typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Query is required.' });
      return;
    }

    const matches = await queryRagMatches(query);
    res.status(200).json({ matches });
  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({
      error: 'RAG query failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default handler;
