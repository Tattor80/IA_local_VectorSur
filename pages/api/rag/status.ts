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
    const collectionName = process.env.RAG_COLLECTION || 'chatbot_ollama';

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

        let documents: any[] = [];
        if (req.query.details === 'true' && pointsCount > 0) {
            // Fetch unique sources to list file
            // Note: This is a simple implementation that scrolls points. 
            // For production with millions of points, this should be optimized or use a separate index.
            const scrollUrl = `${qdrantUrl}/collections/${collectionName}/points/scroll`;
            const allFiles = new Map<string, any>();
            let nextOffset = null;

            // Limit to first 10000 points to avoid timeout in this demo
            // In a real app we might rely on a separate metadata store
            do {
                const scrollRes: any = await fetch(scrollUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        limit: 1000,
                        offset: nextOffset,
                        with_payload: true,
                        filter: {
                            must_not: [
                                {
                                    key: "source",
                                    match: { value: "unknown" } // Example filter
                                }
                            ]
                        }
                    })
                });

                if (!scrollRes.ok) break;

                const scrollData: any = await scrollRes.json();
                const points = scrollData.result?.points || [];
                nextOffset = scrollData.result?.next_page_offset;

                for (const point of points) {
                    const p = point.payload;
                    const src = p.source;
                    if (src && !allFiles.has(src)) {
                        allFiles.set(src, {
                            source: src,
                            title: p.title || p.source,
                            category: p.category || 'General',
                            // count: 1
                        });
                    }
                }

                if (!nextOffset) break;
            } while (allFiles.size < 1000 && nextOffset); // Stop if we found 1000 unique files or finished

            documents = Array.from(allFiles.values());
        }

        return res.status(200).json({
            ok: true,
            hasDocuments: pointsCount > 0,
            pointsCount,
            status: data.result?.status || 'unknown',
            documents // Returns list of unique files
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
