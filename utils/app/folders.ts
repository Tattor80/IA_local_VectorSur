import { FolderInterface } from '@/types/folder';

export const saveFolders = (folders: FolderInterface[]) => {
  // Save to localStorage (for quick access and offline fallback)
  localStorage.setItem('folders', JSON.stringify(folders));

  // Save to SQLite API (for persistence)
  fetch('/api/db/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(folders),
  }).catch((err) => {
    console.warn('Failed to save folders to SQLite:', err);
  });
};
