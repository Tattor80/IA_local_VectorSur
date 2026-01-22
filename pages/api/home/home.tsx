import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';
import { getSettings } from '@/utils/app/settings';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { OllamaModelID, OllamaModels, fallbackModelID } from '@/types/ollama';
import { Prompt } from '@/types/prompt';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import Promptbar from '@/components/Promptbar';

import HomeContext from './home.context';
import { HomeInitialState, initialState } from './home.state';

import { v4 as uuidv4 } from 'uuid';

interface Props {
  defaultModelId: OllamaModelID;
}

const Home = ({ defaultModelId }: Props) => {
  const { t } = useTranslation('chat');
  const { getModels } = useApiService();
  const { getModelsError } = useErrorService();
  const [initialRender, setInitialRender] = useState<boolean>(true);

  const contextValue = useCreateReducer<HomeInitialState>({
    initialState,
  });

  const {
    state: {
      lightMode,
      folders,
      conversations,
      selectedConversation,
      prompts,
      temperature,
    },
    dispatch,
  } = contextValue;

  const stopConversationRef = useRef<boolean>(false);

  const { data, error, refetch } = useQuery({
    queryKey: ['GetModels'],
    queryFn: () => getModels(),
    enabled: true,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (data) dispatch({ field: 'models', value: data });
  }, [data, dispatch]);

  useEffect(() => {
    dispatch({ field: 'modelError', value: getModelsError(error) });
  }, [dispatch, error, getModelsError]);

  // FETCH MODELS ----------------------------------------------

  const handleSelectConversation = (conversation: Conversation) => {
    dispatch({
      field: 'selectedConversation',
      value: conversation,
    });

    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    dispatch({ field: 'folders', value: updatedFolders });
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });

    dispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folderId === folderId) {
        return {
          ...p,
          folderId: null,
        };
      }

      return p;
    });

    dispatch({ field: 'prompts', value: updatedPrompts });
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    dispatch({ field: 'folders', value: updatedFolders });

    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      messages: [],
      model: lastConversation?.model,
      prompt: DEFAULT_SYSTEM_PROMPT,
      temperature: lastConversation?.temperature ?? DEFAULT_TEMPERATURE,
      folderId: null,
    };

    const updatedConversations = [...conversations, newConversation];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    dispatch({ field: 'loading', value: false });
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    dispatch({ field: 'selectedConversation', value: single });
    dispatch({ field: 'conversations', value: all });
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [selectedConversation, dispatch]);

  useEffect(() => {
    defaultModelId &&
      dispatch({ field: 'defaultModelId', value: defaultModelId });
  }, [defaultModelId, dispatch]);

  useEffect(() => {
    const settings = getSettings();
    if (settings.theme) {
      dispatch({
        field: 'lightMode',
        value: settings.theme,
      });
    }

    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
      dispatch({ field: 'showPromptbar', value: false });
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }

    const showPromptbar = localStorage.getItem('showPromptbar');
    if (showPromptbar) {
      dispatch({ field: 'showPromptbar', value: showPromptbar === 'true' });
    }

    // Load data from SQLite API with localStorage fallback
    const loadData = async () => {
      try {
        // Load folders from API
        const foldersRes = await fetch('/api/db/folders');
        if (foldersRes.ok) {
          const foldersData = await foldersRes.json();
          if (foldersData.length > 0) {
            dispatch({ field: 'folders', value: foldersData });
          } else {
            // Fallback to localStorage
            const localFolders = localStorage.getItem('folders');
            if (localFolders) {
              const parsed = JSON.parse(localFolders);
              dispatch({ field: 'folders', value: parsed });
              // Migrate to API
              await fetch('/api/db/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed),
              });
            }
          }
        }
      } catch {
        // Fallback to localStorage
        const folders = localStorage.getItem('folders');
        if (folders) dispatch({ field: 'folders', value: JSON.parse(folders) });
      }

      try {
        // Load prompts from API
        const promptsRes = await fetch('/api/db/prompts');
        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          if (promptsData.length > 0) {
            dispatch({ field: 'prompts', value: promptsData });
          } else {
            // Fallback to localStorage
            const localPrompts = localStorage.getItem('prompts');
            if (localPrompts) {
              const parsed = JSON.parse(localPrompts);
              dispatch({ field: 'prompts', value: parsed });
              // Migrate to API
              await fetch('/api/db/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed),
              });
            }
          }
        }
      } catch {
        // Fallback to localStorage
        const prompts = localStorage.getItem('prompts');
        if (prompts) dispatch({ field: 'prompts', value: JSON.parse(prompts) });
      }

      try {
        // Load conversations from API
        const convsRes = await fetch('/api/db/conversations');
        if (convsRes.ok) {
          const convsData = await convsRes.json();
          if (convsData.length > 0) {
            const cleanedConversations = cleanConversationHistory(convsData);
            dispatch({ field: 'conversations', value: cleanedConversations });

            // Set selected conversation
            const lastConv = cleanedConversations[cleanedConversations.length - 1];
            const localSelected = localStorage.getItem('selectedConversation');
            if (localSelected) {
              const parsed = JSON.parse(localSelected);
              const found = cleanedConversations.find((c: Conversation) => c.id === parsed.id);
              if (found) {
                dispatch({ field: 'selectedConversation', value: cleanSelectedConversation(found) });
              } else {
                dispatch({ field: 'selectedConversation', value: cleanSelectedConversation(lastConv) });
              }
            } else {
              dispatch({ field: 'selectedConversation', value: cleanSelectedConversation(lastConv) });
            }
          } else {
            // Fallback to localStorage and migrate
            const localConvs = localStorage.getItem('conversationHistory');
            if (localConvs) {
              const parsed = JSON.parse(localConvs);
              const cleaned = cleanConversationHistory(parsed);
              dispatch({ field: 'conversations', value: cleaned });

              // Migrate to API
              await fetch('/api/db/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cleaned),
              });

              const localSelected = localStorage.getItem('selectedConversation');
              if (localSelected) {
                dispatch({ field: 'selectedConversation', value: cleanSelectedConversation(JSON.parse(localSelected)) });
              } else if (cleaned.length > 0) {
                dispatch({ field: 'selectedConversation', value: cleanSelectedConversation(cleaned[cleaned.length - 1]) });
              }
            } else {
              // Create new conversation
              dispatch({
                field: 'selectedConversation',
                value: {
                  id: uuidv4(),
                  name: t('New Conversation'),
                  messages: [],
                  model: OllamaModels[defaultModelId],
                  prompt: DEFAULT_SYSTEM_PROMPT,
                  temperature: DEFAULT_TEMPERATURE,
                  folderId: null,
                },
              });
            }
          }
        }
      } catch {
        // Fallback to localStorage
        const conversationHistory = localStorage.getItem('conversationHistory');
        if (conversationHistory) {
          const parsed = JSON.parse(conversationHistory);
          const cleaned = cleanConversationHistory(parsed);
          dispatch({ field: 'conversations', value: cleaned });
        }

        const selectedConversation = localStorage.getItem('selectedConversation');
        if (selectedConversation) {
          dispatch({ field: 'selectedConversation', value: cleanSelectedConversation(JSON.parse(selectedConversation)) });
        } else {
          dispatch({
            field: 'selectedConversation',
            value: {
              id: uuidv4(),
              name: t('New Conversation'),
              messages: [],
              model: OllamaModels[defaultModelId],
              prompt: DEFAULT_SYSTEM_PROMPT,
              temperature: DEFAULT_TEMPERATURE,
              folderId: null,
            },
          });
        }
      }
    };

    loadData();
  }, [defaultModelId, dispatch, t]);

  return (
    <HomeContext.Provider
      value={{
        ...contextValue,
        handleNewConversation,
        handleCreateFolder,
        handleDeleteFolder,
        handleUpdateFolder,
        handleSelectConversation,
        handleUpdateConversation,
      }}
    >
      <Head>
        <title>Vector Sur AI</title>
        <meta name="description" content="Enterprise AI Chat Interface by Vector Sur." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.png" />
      </Head>
      {selectedConversation && (
        <main
          className={`flex h-screen w-screen flex-col text-sm text-gray-900 dark:text-gray-100 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-black ${lightMode}`}
        >
          <div className="fixed top-0 w-full sm:hidden">
            <Navbar
              selectedConversation={selectedConversation}
              onNewConversation={handleNewConversation}
            />
          </div>

          <div className="flex h-full w-full pt-[48px] sm:pt-0">
            <Chatbar />

            <div className="flex flex-1">
              <Chat stopConversationRef={stopConversationRef} />
            </div>

            <Promptbar />
          </div>
        </main>
      )}
    </HomeContext.Provider>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId =
    process.env.DEFAULT_MODEL || fallbackModelID;

  return {
    props: {
      defaultModelId,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
        'settings',
      ])),
    },
  };
};
