import type { NextApiRequest, NextApiResponse } from 'next';

// Simple status check for RAG/Qdrant
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const qdrantUrl = process.env.RAG_QDRANT_URL || 'http://localhost:6333';
    const collectionName = 'documents';

    try {
        // Check if Qdrant is reachable
        const healthRes = await fetch(`${qdrantUrl}/collections/${collectionName}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!healthRes.ok) {
            // Collection might not exist yet
            return res.status(200).json({
                ok: true,
                hasDocuments: false,
                message: 'No collection yet'
            });
        }

        const data = await healthRes.json();
        const pointsCount = data.result?.points_count || 0;

        return res.status(200).json({
            ok: true,
            hasDocuments: pointsCount > 0,
            pointsCount,
            status: data.result?.status || 'unknown'
        });
    } catch (error: any) {
        // Qdrant might not be running - not a critical error
        return res.status(200).json({
            ok: false,
            hasDocuments: false,
            error: 'Qdrant not reachable'
        });
    }
}
