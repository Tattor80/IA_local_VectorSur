import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import path from 'path';
import pdfParse from 'pdf-parse';
import * as xlsx from 'xlsx';

import {
  ingestDocuments,
  RagDocument,
  resetRagCollection,
  deleteDocumentsBySource,
} from '@/utils/server/rag';

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};

type IngestFile = {
  name: string;
  data: string;
  relativePath?: string;
};

const MAX_FILE_MB = parseInt(process.env.RAG_MAX_FILE_MB || '50', 10);

const readTextFromPdf = async (buffer: Buffer) => {
  const data = await pdfParse(buffer);
  return data.text || '';
};

const readTextFromExcel = async (buffer: Buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
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

const readTextFromText = (buffer: Buffer) => buffer.toString('utf-8');

const toRagDocument = async (file: IngestFile): Promise<RagDocument | null> => {
  const byteLength = Buffer.byteLength(file.data || '', 'base64');
  if (byteLength > MAX_FILE_MB * 1024 * 1024) return null;

  const buffer = Buffer.from(file.data || '', 'base64');
  const ext = path.extname(file.name || '').toLowerCase();
  let text = '';

  if (ext === '.pdf') {
    text = await readTextFromPdf(buffer);
  } else if (ext === '.xlsx' || ext === '.xls') {
    text = await readTextFromExcel(buffer);
  } else if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    text = readTextFromText(buffer);
  }

  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const source = file.relativePath || file.name;

  return {
    id: crypto.randomUUID(),
    text: trimmed,
    metadata: {
      source,
      title: path.basename(file.name || source),
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
    const files: IngestFile[] = Array.isArray(body?.files) ? body.files : [];
    const reset = Boolean(body?.reset);

    if (!files.length) {
      res.status(400).json({ error: 'No files to ingest.' });
      return;
    }

    if (reset) {
      await resetRagCollection();
    }

    const documents: RagDocument[] = [];
    let skipped = 0;

    for (const file of files) {
      if (!file || typeof file.data !== 'string' || !file.name) {
        skipped += 1;
        continue;
      }

      if (!reset) {
        try {
          const source = file.relativePath || file.name;
          await deleteDocumentsBySource(source);
        } catch (e) {
          console.warn('Failed to delete existing documents for source:', file.name, e);
        }
      }

      const doc = await toRagDocument(file);
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
    });
  } catch (error) {
    console.error('RAG ingest files error:', error);
    res.status(500).json({
      error: 'RAG ingest files failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

export default handler;
