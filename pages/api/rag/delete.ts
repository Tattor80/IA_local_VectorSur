import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteDocumentsBySource, deleteDocumentsByCategory, resetRagCollection } from '@/utils/server/rag';

export const config = {
    runtime: 'nodejs',
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { type, value } = req.body;

        if (!type) {
            return res.status(400).json({ error: 'Type is required (file, category, or reset)' });
        }

        if (type === 'reset') {
            await resetRagCollection();
            return res.status(200).json({ ok: true, message: 'Collection reset complete.' });
        }

        if (type === 'file') {
            if (!value) return res.status(400).json({ error: 'Value (source path) is required for file deletion' });
            await deleteDocumentsBySource(value);
            return res.status(200).json({ ok: true, message: `Documents for source "${value}" deleted.` });
        }

        if (type === 'category') {
            if (!value) return res.status(400).json({ error: 'Value (category name) is required for category deletion' });
            await deleteDocumentsByCategory(value);
            return res.status(200).json({ ok: true, message: `Documents for category "${value}" deleted.` });
        }

        return res.status(400).json({ error: 'Invalid type provided' });
    } catch (error: any) {
        console.error('RAG delete error:', error);
        res.status(500).json({
            error: 'Delete operation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
};

export default handler;
