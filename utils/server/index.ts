import { Message } from '@/types/chat';
import { OllamaModel } from '@/types/ollama';

import { OLLAMA_HOST, API_TIMEOUT_DURATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaError';
  }
}

export const OllamaStream = async (
  model: string,
  systemPrompt: string,
  temperature: number,
  prompt: string,
  images?: string[],
) => {
  let url = `${OLLAMA_HOST}/api/generate`;
  
  // Create an AbortController with a long timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_DURATION);
  
  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      method: 'POST',
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        system: systemPrompt,
        ...(images && images.length ? { images } : {}),
        options: {
          temperature: temperature,
        },
      }),
      signal: controller.signal,
    });
    
    // Clear the timeout since the request has completed
    clearTimeout(timeoutId);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (res.status !== 200) {
      const result = await res.json();
      if (result.error) {
        throw new OllamaError(
          result.error
        );
      } 
    }

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          for await (const chunk of res.body as any) {
            buffer += decoder.decode(chunk, { stream: true });
            let newlineIndex = buffer.indexOf('\n');
            while (newlineIndex >= 0) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);
              if (line) {
                let parsedData = { response: '' };
                try {
                  parsedData = JSON.parse(line);
                } catch {}
                if (parsedData.response) {
                  controller.enqueue(encoder.encode(parsedData.response));
                }
              }
              newlineIndex = buffer.indexOf('\n');
            }
          }
          const remaining = buffer.trim();
          if (remaining) {
            let parsedData = { response: '' };
            try {
              parsedData = JSON.parse(remaining);
            } catch {}
            if (parsedData.response) {
              controller.enqueue(encoder.encode(parsedData.response));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });
    
    return responseStream;
  } catch (error) {
    // Clear the timeout if there was an error
    clearTimeout(timeoutId);
    
    // Check if this is a connection error, which might be related to OLLAMA_HOST setting
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new OllamaError(
        `Connection error: Could not connect to Ollama at ${OLLAMA_HOST}. If you have set the OLLAMA_HOST environment variable, try removing it or ensuring it points to a valid Ollama instance.`
      );
    }
    
    // Re-throw other errors
    throw error;
  }
};

type OllamaChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
};

export const OllamaChatStream = async (
  model: string,
  messages: OllamaChatMessage[],
  temperature: number,
) => {
  let url = `${OLLAMA_HOST}/api/chat`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_DURATION);

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      method: 'POST',
      body: JSON.stringify({
        model,
        messages,
        options: {
          temperature,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    if (res.status !== 200) {
      const result = await res.json();
      if (result.error) {
        throw new OllamaError(result.error);
      }
    }

    const responseStream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          for await (const chunk of res.body as any) {
            buffer += decoder.decode(chunk, { stream: true });
            let newlineIndex = buffer.indexOf('\n');
            while (newlineIndex >= 0) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);
              if (line) {
                let parsedData = { message: { content: '' } };
                try {
                  parsedData = JSON.parse(line);
                } catch {}
                if (parsedData?.message?.content) {
                  controller.enqueue(encoder.encode(parsedData.message.content));
                }
              }
              newlineIndex = buffer.indexOf('\n');
            }
          }
          const remaining = buffer.trim();
          if (remaining) {
            let parsedData = { message: { content: '' } };
            try {
              parsedData = JSON.parse(remaining);
            } catch {}
            if (parsedData?.message?.content) {
              controller.enqueue(encoder.encode(parsedData.message.content));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return responseStream;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new OllamaError(
        `Connection error: Could not connect to Ollama at ${OLLAMA_HOST}. If you have set the OLLAMA_HOST environment variable, try removing it or ensuring it points to a valid Ollama instance.`
      );
    }

    throw error;
  }
};
