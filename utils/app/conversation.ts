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
      return {
        ...message,
        file: {
          ...message.file,
          metadata: restMetadata,
        },
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
  localStorage.setItem(
    'selectedConversation',
    JSON.stringify(sanitizeConversation(conversation)),
  );
};

export const saveConversations = (conversations: Conversation[]) => {
  localStorage.setItem(
    'conversationHistory',
    JSON.stringify(conversations.map(sanitizeConversation)),
  );
};
