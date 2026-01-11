import type { NextApiRequest, NextApiResponse } from 'next';
import * as fs from 'fs';
import * as path from 'path';


import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
} from '@/utils/app/const';
import { OllamaError, OllamaChatStream } from '@/utils/server';
import { getRagContext } from '@/utils/server/rag';

import { ChatBody, Message } from '@/types/chat';


export const config = {
  runtime: 'nodejs',
};


const logDebug = (message: string, data?: any) => {
  try {
    const logPath = path.join(process.cwd(), 'debug_browser_test.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) + '\n' : ''}\n`;
    fs.appendFileSync(logPath, logEntry);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
};










const streamToResponse = async (
  stream: ReadableStream<Uint8Array>,
  res: NextApiResponse,
) => {
  const reader = stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        res.write(Buffer.from(value));
      }
    }
  } finally {
    res.end();
  }
};

const extractForcedResponse = (systemPrompt: string): string | null => {
  const trimmed = systemPrompt.trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /responde\s+(?:solo|únicamente)\s+con\s+(.+)$/i,
  );
  if (!match) return null;
  let forced = match[1].trim();
  if (!forced) return null;
  forced = forced.replace(/^["'`]+|["'`]+$/g, '').trim();
  return forced || null;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { model, system, options, prompt, images, ragQuery, messages } =
      (body || {}) as ChatBody;


    let promptToSend = system;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    const baseSystem = promptToSend && promptToSend.trim().length > 0
      ? promptToSend.trim()
      : '';
    const forcedResponse = extractForcedResponse(baseSystem);
    if (forcedResponse) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200);
      res.write(forcedResponse);
      res.end();
      return;
    }

    let temperatureToUse = options?.temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const ragContext = await getRagContext(ragQuery || prompt || '');

    const appendAttachmentToContent = (message: Message) => {
      const base = (message.content || '').trim();
      const attach =
        message?.file?.metadata?.contentText || message?.file?.metadata?.preview;
      const fname = message?.file?.name;
      if (!attach || !fname || message.role !== 'user') {
        return base;
      }
      const attachLabel = message?.file?.metadata?.contentText ? '' : ' (preview)';
      const attachmentBlock = `[Attachment: ${fname}${attachLabel}]\n${attach}`;
      return base ? `${base}\n\n${attachmentBlock}` : attachmentBlock;
    };

    const normalizeMessages = (items: Message[]) => {
      return items
        .map((message) => ({
          role: message.role,
          content: appendAttachmentToContent(message),
        }))
        .filter((message) => message.content && message.content.trim().length > 0);
    };

    const attachImagesToLastUser = (
      items: { role: 'system' | 'user' | 'assistant'; content: string; images?: string[] }[],
      imagesToAttach?: string[],
    ) => {
      if (!imagesToAttach || imagesToAttach.length === 0) return items;
      for (let i = items.length - 1; i >= 0; i -= 1) {
        if (items[i].role === 'user') {
          const next = items.slice();
          next[i] = { ...next[i], images: imagesToAttach };
          return next;
        }
      }
      return items;
    };

    const hasMessages = Array.isArray(messages) && messages.length > 0;
    let baseMessages = hasMessages ? normalizeMessages(messages as Message[]) : [];

    // Combine RAG Context and System Prompt
    // Place System Prompt AFTER context to ensure it has higher priority (Recency Bias)
    const contextInstruction = ragContext ? `Context:\n${ragContext}` : '';
    const systemInstruction = baseSystem;

    const finalSystemContent = [contextInstruction, systemInstruction]
      .filter(Boolean)
      .join('\n\n');

    if (!hasMessages) {
      // If no messages but prompt provided (single turn), create a user message
      const promptContent = prompt || '';
      if (!promptContent.trim()) {
        res.status(400).json({ error: 'Prompt is required.' });
        return;
      }
      baseMessages = [{ role: 'user', content: promptContent }];
    }

    // New Standardized Flow with Post-Prompting:
    // 1. Create message list: [System Message, ...User/Assistant Messages]
    // 2. ALSO attach the System Instruction to the LAST User message (invisible to user in UI, but visible to model)
    //    This "sandwich" technique (System First + System Last) forces adherence even with large RAG contexts.

    let messagesToSend = [
      ...(finalSystemContent ? [{ role: 'system' as const, content: finalSystemContent }] : []),
      ...baseMessages,
    ];

    if (baseSystem && baseSystem.trim().length > 0) {
      // Find last user message
      for (let i = messagesToSend.length - 1; i >= 0; i--) {
        if (messagesToSend[i].role === 'user') {
          const originalContent = messagesToSend[i].content;
          messagesToSend[i] = {
            ...messagesToSend[i],
            content: `${originalContent}\n\nIMPORTANT_INSTRUCTION: ${baseSystem}`
          };
          break;
        }
      }
    }

    messagesToSend = attachImagesToLastUser(messagesToSend, images);

    logDebug('Browser Test - Messages Payload', messagesToSend);

    // console.log('[DEBUG] Model:', model);
    // console.log('[DEBUG] System Content:', finalSystemContent);
    // console.log('[DEBUG] Messages payload:', JSON.stringify(messagesToSend, null, 2));

    const stream = await OllamaChatStream(
      model,
      messagesToSend,
      temperatureToUse,
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200);
    await streamToResponse(stream, res);
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof OllamaError) {
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Ollama Error',
          message: error.message,
          suggestion: error.message.includes('OLLAMA_HOST')
            ? 'Try removing the OLLAMA_HOST environment variable or setting it to http://127.0.0.1:11434'
            : 'Check if Ollama is running and accessible',
        });
        return;
      }
    } else {
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }
    }
    res.end();
  }
};

export default handler;
