import { Prompt } from '@/types/prompt';

export const updatePrompt = (updatedPrompt: Prompt, allPrompts: Prompt[]) => {
  const updatedPrompts = allPrompts.map((c) => {
    if (c.id === updatedPrompt.id) {
      return updatedPrompt;
    }

    return c;
  });

  savePrompts(updatedPrompts);

  return {
    single: updatedPrompt,
    all: updatedPrompts,
  };
};

export const savePrompts = (prompts: Prompt[]) => {
  // Save to localStorage (for quick access and offline fallback)
  localStorage.setItem('prompts', JSON.stringify(prompts));

  // Save to SQLite API (for persistence)
  fetch('/api/db/prompts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prompts),
  }).catch((err) => {
    console.warn('Failed to save prompts to SQLite:', err);
  });
};
