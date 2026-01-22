import {
  FC,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';
import { IconBook } from '@tabler/icons-react';

import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';

import { Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';

import { PromptList } from './PromptList';
import { VariableModal } from './VariableModal';

interface Props {
  conversation: Conversation;
  prompts: Prompt[];
  onChangePrompt: (prompt: string) => void;
}

import { PERSONAS } from '@/utils/app/personas';

export const SystemPrompt: FC<Props> = ({
  conversation,
  prompts,
  onChangePrompt,
}) => {
  const { t } = useTranslation('chat');

  const [value, setValue] = useState<string>('');
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [showPromptList, setShowPromptList] = useState(false);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<string>('default');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const promptListRef = useRef<HTMLUListElement | null>(null);

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const personaId = e.target.value;
    setSelectedPersona(personaId);
    if (personaId === 'custom') return;

    const persona = PERSONAS.find(p => p.id === personaId);
    if (persona) {
      const content = persona.prompt;
      setValue(content);
      onChangePrompt(content);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    setValue(value);
    updatePromptListVisibility(value);
    setSelectedPersona('custom'); // Switch to custom if user edits manually

    if (value.length > 0) {
      onChangePrompt(value);
    }
  };

  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (!selectedPrompt) return;

    setValue((prevVal) => {
      if (prevVal.match(/\/\w*$/)) {
        return prevVal?.replace(/\/\w*$/, selectedPrompt.content);
      }
      return selectedPrompt.content;
    });
    handlePromptSelect(selectedPrompt);
    setShowPromptList(false);
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      const content = prompt.content;
      setValue(content);
      onChangePrompt(content);
      updatePromptListVisibility(content);
    }
  };

  const handleLibraryClick = () => {
    setPromptInputValue('');
    setShowPromptList(!showPromptList);
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = value?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });

    setValue(newContent);
    onChangePrompt(newContent);

    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < filteredPrompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < filteredPrompts.length - 1 ? prevIndex + 1 : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPromptList(false);
      } else {
        setActivePromptIndex(0);
      }
    }
  };

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
    }
  }, [value]);

  useEffect(() => {
    if (conversation.prompt) {
      setValue(conversation.prompt);
      // Try to match existing prompt to a persona
      const match = PERSONAS.find(p => p.prompt === conversation.prompt);
      if (match) {
        setSelectedPersona(match.id);
      } else {
        setSelectedPersona('custom');
      }
    } else {
      setValue(DEFAULT_SYSTEM_PROMPT);
      setSelectedPersona('default');
    }
  }, [conversation]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.prompt-library-button')
      ) {
        setShowPromptList(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <label className="text-left text-neutral-700 dark:text-neutral-400 font-medium">
          {t('System Prompt')}
        </label>
        <div className="flex items-center gap-2">
          <select
            className="appearance-none rounded-md bg-gray-100 dark:bg-gray-800 py-1 pl-2 pr-8 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none border border-transparent hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
            value={selectedPersona}
            onChange={handlePersonaChange}
          >
            <option value="custom">Custom</option>
            {PERSONAS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button
            className="prompt-library-button text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors"
            onClick={handleLibraryClick}
            title={t('Select from library') || 'Select from library'}
          >
            <IconBook size={18} />
          </button>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        className="w-full rounded-lg border border-neutral-200 bg-transparent px-4 py-3 text-neutral-900 dark:border-neutral-600 dark:text-neutral-100"
        style={{
          resize: 'none',
          bottom: `${textareaRef?.current?.scrollHeight}px`,
          maxHeight: '300px',
          overflow: `${textareaRef.current && textareaRef.current.scrollHeight > 400
            ? 'auto'
            : 'hidden'
            }`,
        }}
        placeholder={
          t(`Enter a prompt or type "/" to select a prompt...`) || ''
        }
        value={t(value) || ''}
        rows={1}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />

      {showPromptList && filteredPrompts.length > 0 && (
        <div>
          <PromptList
            activePromptIndex={activePromptIndex}
            prompts={filteredPrompts}
            onSelect={handleInitModal}
            onMouseOver={setActivePromptIndex}
            promptListRef={promptListRef}
          />
        </div>
      )}

      {isModalVisible && (
        <VariableModal
          prompt={filteredPrompts[activePromptIndex]}
          variables={variables}
          onSubmit={handleSubmit}
          onClose={() => setIsModalVisible(false)}
        />
      )}
    </div>
  );
};
