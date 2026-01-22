/**
 * SQLite Database Service for Vector Sur AI
 * Provides persistent storage for conversations, folders, and prompts
 */

import Database from 'better-sqlite3';
import path from 'path';

// Database file location (root of project)
const DB_PATH = process.env.VECTORSUR_DB_PATH || path.join(process.cwd(), 'vectorsur.db');

let db: Database.Database | null = null;

/**
 * Get or create database connection
 */
export const getDatabase = (): Database.Database => {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL'); // Better performance
        initDatabase();
    }
    return db;
};

/**
 * Initialize database schema
 */
const initDatabase = (): void => {
    const database = db!;

    // Conversations table
    database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      model TEXT,
      prompt TEXT,
      temperature REAL DEFAULT 1.0,
      folderId TEXT,
      messages TEXT DEFAULT '[]',
      createdAt INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updatedAt INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    );
  `);

    // Folders table
    database.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );
  `);

    // Prompts table
    database.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      content TEXT NOT NULL,
      model TEXT,
      folderId TEXT
    );
  `);

    // Create indices for faster queries
    database.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_folderId ON conversations(folderId);
    CREATE INDEX IF NOT EXISTS idx_conversations_updatedAt ON conversations(updatedAt);
    CREATE INDEX IF NOT EXISTS idx_folders_type ON folders(type);
    CREATE INDEX IF NOT EXISTS idx_prompts_folderId ON prompts(folderId);
  `);
};

// ============ CONVERSATIONS ============

export interface DBConversation {
    id: string;
    name: string;
    model: string | null;
    prompt: string | null;
    temperature: number;
    folderId: string | null;
    messages: string; // JSON string
    createdAt: number;
    updatedAt: number;
}

/**
 * Get all conversations
 */
export const getAllConversations = (): DBConversation[] => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM conversations ORDER BY updatedAt DESC');
    return stmt.all() as DBConversation[];
};

/**
 * Get a single conversation by ID
 */
export const getConversationById = (id: string): DBConversation | undefined => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM conversations WHERE id = ?');
    return stmt.get(id) as DBConversation | undefined;
};

/**
 * Save or update a conversation
 */
export const saveConversationToDB = (conversation: {
    id: string;
    name: string;
    model?: string;
    prompt?: string;
    temperature?: number;
    folderId?: string | null;
    messages?: any[];
}): void => {
    const database = getDatabase();
    const now = Date.now();

    const stmt = database.prepare(`
    INSERT INTO conversations (id, name, model, prompt, temperature, folderId, messages, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      model = excluded.model,
      prompt = excluded.prompt,
      temperature = excluded.temperature,
      folderId = excluded.folderId,
      messages = excluded.messages,
      updatedAt = excluded.updatedAt
  `);

    stmt.run(
        conversation.id,
        conversation.name,
        conversation.model || null,
        conversation.prompt || null,
        conversation.temperature ?? 1.0,
        conversation.folderId ?? null,
        JSON.stringify(conversation.messages || []),
        now,
        now
    );
};

/**
 * Delete a conversation
 */
export const deleteConversationFromDB = (id: string): void => {
    const database = getDatabase();
    const stmt = database.prepare('DELETE FROM conversations WHERE id = ?');
    stmt.run(id);
};

/**
 * Delete all conversations
 */
export const deleteAllConversations = (): void => {
    const database = getDatabase();
    database.exec('DELETE FROM conversations');
};

// ============ FOLDERS ============

export interface DBFolder {
    id: string;
    name: string;
    type: string;
}

/**
 * Get all folders
 */
export const getAllFolders = (): DBFolder[] => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM folders');
    return stmt.all() as DBFolder[];
};

/**
 * Save or update a folder
 */
export const saveFolderToDB = (folder: DBFolder): void => {
    const database = getDatabase();
    const stmt = database.prepare(`
    INSERT INTO folders (id, name, type)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type
  `);
    stmt.run(folder.id, folder.name, folder.type);
};

/**
 * Delete a folder
 */
export const deleteFolderFromDB = (id: string): void => {
    const database = getDatabase();
    const stmt = database.prepare('DELETE FROM folders WHERE id = ?');
    stmt.run(id);
};

/**
 * Save multiple folders (batch)
 */
export const saveFoldersToDB = (folders: DBFolder[]): void => {
    const database = getDatabase();
    const stmt = database.prepare(`
    INSERT INTO folders (id, name, type)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type
  `);

    const transaction = database.transaction((items: DBFolder[]) => {
        for (const folder of items) {
            stmt.run(folder.id, folder.name, folder.type);
        }
    });

    transaction(folders);
};

// ============ PROMPTS ============

export interface DBPrompt {
    id: string;
    name: string;
    description: string | null;
    content: string;
    model: string | null;
    folderId: string | null;
}

/**
 * Get all prompts
 */
export const getAllPrompts = (): DBPrompt[] => {
    const database = getDatabase();
    const stmt = database.prepare('SELECT * FROM prompts');
    return stmt.all() as DBPrompt[];
};

/**
 * Save or update a prompt
 */
export const savePromptToDB = (prompt: DBPrompt): void => {
    const database = getDatabase();
    const stmt = database.prepare(`
    INSERT INTO prompts (id, name, description, content, model, folderId)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      content = excluded.content,
      model = excluded.model,
      folderId = excluded.folderId
  `);
    stmt.run(prompt.id, prompt.name, prompt.description, prompt.content, prompt.model, prompt.folderId);
};

/**
 * Delete a prompt
 */
export const deletePromptFromDB = (id: string): void => {
    const database = getDatabase();
    const stmt = database.prepare('DELETE FROM prompts WHERE id = ?');
    stmt.run(id);
};

/**
 * Save multiple prompts (batch)
 */
export const savePromptsToDB = (prompts: DBPrompt[]): void => {
    const database = getDatabase();
    const stmt = database.prepare(`
    INSERT INTO prompts (id, name, description, content, model, folderId)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      content = excluded.content,
      model = excluded.model,
      folderId = excluded.folderId
  `);

    const transaction = database.transaction((items: DBPrompt[]) => {
        for (const prompt of items) {
            stmt.run(prompt.id, prompt.name, prompt.description, prompt.content, prompt.model, prompt.folderId);
        }
    });

    transaction(prompts);
};

/**
 * Close database connection (for cleanup)
 */
export const closeDatabase = (): void => {
    if (db) {
        db.close();
        db = null;
    }
};
