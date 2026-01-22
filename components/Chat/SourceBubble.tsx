import { IconFileText, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useState } from 'react';

interface Source {
    title?: string;
    source?: string;
    text?: string;
    score?: number;
    category?: string;
}

interface Props {
    sources: Source[];
}

export const SourceBubble = ({ sources }: Props) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 opacity-90">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-1">
                <IconFileText size={14} />
                Fuentes ({sources.length})
            </div>
            <div className="flex flex-wrap gap-2">
                {sources.map((source, idx) => {
                    const title = source.title || source.source || 'Documento Desconocido';
                    const isExpanded = expandedIndex === idx;

                    return (
                        <div key={idx} className="flex flex-col max-w-full">
                            <button
                                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200
                  ${isExpanded
                                        ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'}
                `}
                            >
                                <span className="truncate max-w-[150px]">{title}</span>
                                <span className="opacity-50">{(source.score ? (source.score * 100).toFixed(0) + '%' : '')}</span>
                                {isExpanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
                            </button>

                            {isExpanded && (
                                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 animate-fadeIn">
                                    <div className="font-semibold mb-1 text-gray-900 dark:text-gray-100">Extracto:</div>
                                    <div className="italic">"{source.text?.trim()}"</div>
                                    {source.category && (
                                        <div className="mt-2 text-[10px] uppercase tracking-wider text-gray-400">
                                            Depto: {source.category}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
