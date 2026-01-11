import { useEffect, useState } from 'react';
import { IconServer, IconDatabase } from '@tabler/icons-react';

interface ConnectionState {
    ollama: 'checking' | 'connected' | 'error';
    rag: 'checking' | 'ready' | 'empty' | 'error';
}

export const ConnectionStatus = () => {
    const [status, setStatus] = useState<ConnectionState>({
        ollama: 'checking',
        rag: 'checking',
    });

    useEffect(() => {
        // Check Ollama connection
        const checkOllama = async () => {
            try {
                const res = await fetch('/api/models');
                if (res.ok) {
                    const data = await res.json();
                    setStatus(prev => ({
                        ...prev,
                        ollama: data.length > 0 ? 'connected' : 'error'
                    }));
                } else {
                    setStatus(prev => ({ ...prev, ollama: 'error' }));
                }
            } catch {
                setStatus(prev => ({ ...prev, ollama: 'error' }));
            }
        };

        // Check RAG/Qdrant connection
        const checkRag = async () => {
            try {
                const res = await fetch('/api/rag/status');
                if (res.ok) {
                    const data = await res.json();
                    setStatus(prev => ({
                        ...prev,
                        rag: data.hasDocuments ? 'ready' : 'empty'
                    }));
                } else {
                    setStatus(prev => ({ ...prev, rag: 'error' }));
                }
            } catch {
                // RAG might not be configured - show as empty
                setStatus(prev => ({ ...prev, rag: 'empty' }));
            }
        };

        checkOllama();
        checkRag();

        // Recheck every 30 seconds
        const interval = setInterval(() => {
            checkOllama();
            checkRag();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'connected':
            case 'ready':
                return 'text-green-500';
            case 'empty':
                return 'text-yellow-500';
            case 'error':
                return 'text-red-500';
            default:
                return 'text-gray-400 animate-pulse';
        }
    };

    const getStatusLabel = (type: 'ollama' | 'rag') => {
        const s = status[type];
        if (type === 'ollama') {
            switch (s) {
                case 'connected': return 'Ollama OK';
                case 'error': return 'Sin conexión';
                default: return 'Verificando...';
            }
        } else {
            switch (s) {
                case 'ready': return 'RAG listo';
                case 'empty': return 'Sin datos';
                case 'error': return 'RAG error';
                default: return 'Verificando...';
            }
        }
    };

    return (
        <div className="flex items-center gap-3 px-3 py-2 text-xs">
            <div className={`flex items-center gap-1.5 ${getStatusColor(status.ollama)}`}>
                <IconServer size={14} stroke={2} />
                <span>{getStatusLabel('ollama')}</span>
            </div>
            <div className={`flex items-center gap-1.5 ${getStatusColor(status.rag)}`}>
                <IconDatabase size={14} stroke={2} />
                <span>{getStatusLabel('rag')}</span>
            </div>
        </div>
    );
};
