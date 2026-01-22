import { Conversation } from '@/types/chat';

const sanitizeConversation = (conversation: Conversation): Conversation => {
  return {
    ...conversation,
    messages: conversation.messages.map((message) => {
      const metadata = message.file?.metadata;
      if (!metadata || !metadata.contentText) {
        return message;
      }

      const { contentText, ...restMetadata } = metadata;
      // Explicitly reconstruct file with required properties to satisfy TypeScript
      const sanitizedFile = {
        name: message.file!.name,
        size: message.file!.size,
        type: message.file!.type,
        metadata: restMetadata,
      };
      return {
        ...message,
        file: sanitizedFile,
      };
    }),
  };
};

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  const sanitized = sanitizeConversation(conversation);

  // Save to localStorage (for quick access and offline fallback)
  localStorage.setItem(
    'selectedConversation',
    JSON.stringify(sanitized),
  );

  // Save to SQLite API (for persistence)
  fetch('/api/db/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized),
  }).catch((err) => {
    console.warn('Failed to save conversation to SQLite:', err);
  });
};

export const saveConversations = (conversations: Conversation[]) => {
  const sanitized = conversations.map(sanitizeConversation);

  // Save to localStorage (for quick access and offline fallback)
  localStorage.setItem(
    'conversationHistory',
    JSON.stringify(sanitized),
  );

  // Save to SQLite API (for persistence)
  fetch('/api/db/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sanitized),
  }).catch((err) => {
    console.warn('Failed to save conversations to SQLite:', err);
  });
};
