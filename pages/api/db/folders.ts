/**
 * API endpoint for folder persistence
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
    getAllFolders,
    saveFolderToDB,
    deleteFolderFromDB,
    saveFoldersToDB,
    DBFolder,
} from '@/utils/server/database';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        switch (req.method) {
            case 'GET':
                return handleGet(req, res);
            case 'POST':
                return handlePost(req, res);
            case 'DELETE':
                return handleDelete(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
                return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        }
    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Database error', message: (error as Error).message });
    }
}

function handleGet(req: NextApiRequest, res: NextApiResponse) {
    const folders = getAllFolders();
    return res.status(200).json(folders);
}

function handlePost(req: NextApiRequest, res: NextApiResponse) {
    const body = req.body;

    if (!body) {
        return res.status(400).json({ error: 'Request body is required' });
    }

    // Handle batch save
    if (Array.isArray(body)) {
        saveFoldersToDB(body as DBFolder[]);
        return res.status(200).json({ success: true, count: body.length });
    }

    // Handle single save
    if (!body.id || !body.name || !body.type) {
        return res.status(400).json({ error: 'Folder id, name, and type are required' });
    }

    saveFolderToDB(body as DBFolder);
    return res.status(200).json({ success: true, id: body.id });
}

function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Folder ID is required' });
    }

    deleteFolderFromDB(id);
    return res.status(200).json({ success: true, id });
}
