import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import pdfParse from 'pdf-parse';
import * as xlsx from 'xlsx';

import { ingestDocuments, RagDocument, resetRagCollection, deleteDocumentsBySource } from '@/utils/server/rag';

export const config = {
  runtime: 'nodejs',
};

const DEFAULT_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.txt', '.md', '.markdown'];
const MAX_FILE_MB = parseInt(process.env.RAG_MAX_FILE_MB || '50', 10);
const DEFAULT_FOLDER = process.env.RAG_DEFAULT_FOLDER;

const readTextFromPdf = async (filePath: string) => {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return data.text || '';
};

const readTextFromExcel = async (filePath: string) => {
  const workbook = xlsx.readFile(filePath, { cellDates: true });
  const sheetNames = workbook.SheetNames || [];
  const parts: string[] = [];
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: false });
    const lines = rows.map((row: any) =>
      Array.isArray(row) ? row.join('\t') : String(row),
    );
    parts.push(`[Sheet: ${sheetName}]`);
    parts.push(lines.join('\n'));
  }
  return parts.join('\n\n');
};

const readTextFromFile = async (filePath: string) => {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('utf-8');
};

const collectFiles = async (root: string, extensions: string[]) => {
  const files: string[] = [];
  const queue = [root];
  while (queue.length) {
    const current = queue.pop() as string;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  return files;
};

const toRagDocument = async (filePath: string, department?: string): Promise<RagDocument | null> => {
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_FILE_MB * 1024 * 1024) return null;
  const ext = path.extname(filePath).toLowerCase();
  let text = '';
  if (ext === '.pdf') {
    text = await readTextFromPdf(filePath);
  } else if (ext === '.xlsx' || ext === '.xls') {
    text = await readTextFromExcel(filePath);
  } else if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    text = await readTextFromFile(filePath);
  }
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  return {
    id: crypto.randomUUID(),
    text: trimmed,
    metadata: {
      source: filePath,
      title: path.basename(filePath),
      category: department, // Added department
    },
  };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const folderPath = body?.folderPath || DEFAULT_FOLDER;
    const reset = Boolean(body?.reset);
    // New optional field
    const department = body?.department && typeof body.department === 'string' ? body.department : undefined;
    const extensions =
      Array.isArray(body?.extensions) && body.extensions.length
        ? body.extensions.map((ext: string) => ext.toLowerCase())
        : DEFAULT_EXTENSIONS;

    if (!folderPath || typeof folderPath !== 'string') {
      res.status(400).json({ error: 'folderPath is required.' });
      return;
    }

    if (reset) {
      await resetRagCollection();
    }

    const files = await collectFiles(folderPath, extensions);
    const documents: RagDocument[] = [];
    let skipped = 0;

    for (const file of files) {
      if (!reset) {
        try {
          // file is the absolute path here, which is used as source
          await deleteDocumentsBySource(file);
        } catch (e) {
          console.warn('Failed to delete existing documents for source:', file, e);
        }
      }

      const doc = await toRagDocument(file, department);
      if (doc) {
        documents.push(doc);
      } else {
        skipped += 1;
      }
    }

    if (!documents.length) {
      res.status(400).json({
        error: 'No documents to ingest.',
        files: files.length,
        skipped,
      });
      return;
    }

    const result = await ingestDocuments(documents);
    res.status(200).json({
      ok: true,
      ...result,
      files: files.length,
      skipped,
      department, // debug
    });
  } catch (error) {
    console.error('RAG ingest folder error:', error);
    res.status(500).json({
      error: 'RAG ingest folder failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default handler;
