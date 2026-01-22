/**
 * API endpoint for conversation persistence
 * Handles CRUD operations for conversations via SQLite
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
    getAllConversations,
    getConversationById,
    saveConversationToDB,
    deleteConversationFromDB,
    deleteAllConversations,
    DBConversation,
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

/**
 * GET - Retrieve conversations
 * Query params:
 *   - id: Get specific conversation
 *   - (none): Get all conversations
 */
function handleGet(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (id && typeof id === 'string') {
        const conversation = getConversationById(id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        // Parse messages JSON before returning
        return res.status(200).json({
            ...conversation,
            messages: JSON.parse(conversation.messages || '[]'),
        });
    }

    // Get all conversations
    const conversations = getAllConversations();

    // Parse messages JSON for each conversation
    const parsed = conversations.map((conv: DBConversation) => ({
        ...conv,
        messages: JSON.parse(conv.messages || '[]'),
        model: conv.model ? JSON.parse(conv.model) : null,
    }));

    return res.status(200).json(parsed);
}

/**
 * POST - Create or update conversation(s)
 * Body can be a single conversation or an array
 */
function handlePost(req: NextApiRequest, res: NextApiResponse) {
    const body = req.body;

    if (!body) {
        return res.status(400).json({ error: 'Request body is required' });
    }

    // Handle batch save
    if (Array.isArray(body)) {
        for (const conv of body) {
            if (!conv.id) continue;
            saveConversationToDB({
                id: conv.id,
                name: conv.name || 'Untitled',
                model: conv.model ? JSON.stringify(conv.model) : undefined,
                prompt: conv.prompt,
                temperature: conv.temperature,
                folderId: conv.folderId,
                messages: conv.messages,
            });
        }
        return res.status(200).json({ success: true, count: body.length });
    }

    // Handle single save
    if (!body.id) {
        return res.status(400).json({ error: 'Conversation ID is required' });
    }

    saveConversationToDB({
        id: body.id,
        name: body.name || 'Untitled',
        model: body.model ? JSON.stringify(body.model) : undefined,
        prompt: body.prompt,
        temperature: body.temperature,
        folderId: body.folderId,
        messages: body.messages,
    });

    return res.status(200).json({ success: true, id: body.id });
}

/**
 * DELETE - Remove conversation(s)
 * Query params:
 *   - id: Delete specific conversation
 *   - all=true: Delete all conversations
 */
function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    const { id, all } = req.query;

    if (all === 'true') {
        deleteAllConversations();
        return res.status(200).json({ success: true, message: 'All conversations deleted' });
    }

    if (id && typeof id === 'string') {
        deleteConversationFromDB(id);
        return res.status(200).json({ success: true, id });
    }

    return res.status(400).json({ error: 'Conversation ID or all=true is required' });
}
