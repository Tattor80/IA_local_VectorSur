import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconTrash, IconFile, IconFolder } from '@tabler/icons-react';

import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

const DocumentList = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rag/status?details=true');
      const data = await res.json();
      if (data.ok && data.documents) {
        setDocuments(data.documents);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: 'file' | 'category', value: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar ${type === 'file' ? 'este archivo' : 'esta categoría'}?`)) return;

    try {
      const res = await fetch('/api/rag/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, value }),
      });
      if (res.ok) {
        fetchDocuments(); // Refresh list
      }
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading && documents.length === 0) return <div className="text-sm text-gray-500">Cargando lista de documentos...</div>;
  if (documents.length === 0) return <div className="text-sm text-gray-500">No hay documentos ingestados.</div>;

  // Group by category
  const grouped: Record<string, any[]> = {};
  documents.forEach(doc => {
    const cat = doc.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(doc);
  });

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, docs]) => (
        <div key={category} className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111b2d] overflow-hidden">
          <div className="flex items-center justify-between bg-gray-50 dark:bg-[#1b2a4a] px-3 py-2">
            <div className="flex items-center gap-2 font-medium text-gray-700 dark:text-gray-200 text-sm">
              <IconFolder size={16} />
              {category} <span className="text-xs text-gray-500">({docs.length})</span>
            </div>
            <button
              onClick={() => handleDelete('category', category)}
              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Eliminar categoría completa"
            >
              <IconTrash size={14} />
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {docs.map((doc: any) => (
              <div key={doc.source} className="flex items-center justify-between px-3 py-2 text-xs">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 truncate max-w-[80%]">
                  <IconFile size={14} className="flex-shrink-0" />
                  <span className="truncate" title={doc.source}>{doc.title}</span>
                </div>
                <button
                  onClick={() => handleDelete('file', doc.source)}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  title="Eliminar archivo"
                >
                  <IconTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-center mt-2">
        <button onClick={fetchDocuments} className="text-xs text-primary-500 hover:underline">
          Actualizar lista
        </button>
      </div>
    </div>
  );
};

const defaultFolder =
  process.env.NEXT_PUBLIC_RAG_DEFAULT_FOLDER || '';

const RagIngestPage = () => {
  const { t } = useTranslation('chat');
  const [folderPath, setFolderPath] = useState<string>(defaultFolder);
  const [includePdf, setIncludePdf] = useState<boolean>(true);
  const [includeExcel, setIncludeExcel] = useState<boolean>(true);
  const [includeText, setIncludeText] = useState<boolean>(true);
  const [resetCollection, setResetCollection] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFolderLabel, setSelectedFolderLabel] = useState<string>('');
  const [department, setDepartment] = useState<string>('General');
  const [progress, setProgress] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

  const detectDepartmentFromFolder = (folderName: string): string => {
    const lower = folderName.toLowerCase();
    if (lower.includes('rrhh') || lower.includes('recursos humanos') || lower.includes('hr')) return 'RRHH';
    if (lower.includes('ventas') || lower.includes('sales') || lower.includes('comercial')) return 'Ventas';
    if (lower.includes('soporte') || lower.includes('support') || lower.includes('helpdesk') || lower.includes('tecnico')) return 'Soporte';
    if (lower.includes('finanzas') || lower.includes('finance') || lower.includes('contabilidad') || lower.includes('facturacion')) return 'Finanzas';
    if (lower.includes('legal') || lower.includes('juridico') || lower.includes('contratos')) return 'Legal';
    return 'General';
  };

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const getExtensions = () => {
    const extensions: string[] = [];
    if (includePdf) extensions.push('.pdf');
    if (includeExcel) extensions.push('.xlsx', '.xls');
    if (includeText) extensions.push('.txt', '.md', '.markdown');
    return extensions;
  };

  const handleBrowse = () => {
    folderInputRef.current?.click();
  };

  const handleBrowseFiles = () => {
    filesInputRef.current?.click();
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectedFolderLabel('');
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
    if (filesInputRef.current) {
      filesInputRef.current.value = '';
    }
  };

  const handleFolderSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const relative = (files[0] as File & { webkitRelativePath?: string })
      .webkitRelativePath;
    const label = relative ? relative.split('/')[0] : files[0].name;
    setSelectedFiles(files);
    setSelectedFolderLabel(label);

    // Auto-detect department
    const detected = detectDepartmentFromFolder(label);
    if (detected !== 'General') {
      setDepartment(detected);
    }
  };

  const handleFilesSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const label =
      files.length === 1 ? files[0].name : `${files.length} archivos`;
    setSelectedFiles(files);
    setSelectedFolderLabel(label);
  };

  const handleIngest = async () => {
    setLoading(true);
    setStatus('Running ingestion...');
    setResult(null);
    setProgress(0);
    setCurrentFile('');
    const extensions = getExtensions();
    try {
      const usingSelectedFiles = selectedFiles.length > 0;
      const filteredFiles = usingSelectedFiles
        ? selectedFiles.filter((file) => {
          const name = file.name.toLowerCase();
          const ext = name.includes('.')
            ? name.slice(name.lastIndexOf('.'))
            : '';
          return extensions.includes(ext);
        })
        : [];

      if (usingSelectedFiles && filteredFiles.length === 0) {
        setStatus('No matching files selected.');
        setLoading(false);
        return;
      }

      setTotalFiles(filteredFiles.length);

      if (usingSelectedFiles) {
        // Process files with progress updates
        setStatus(`Preparing ${filteredFiles.length} files...`);
        setProgress(10);

        const filesData = [];
        for (let i = 0; i < filteredFiles.length; i++) {
          const file = filteredFiles[i];
          setCurrentFile(file.name);
          setProgress(10 + Math.round((i / filteredFiles.length) * 40));

          filesData.push({
            name: file.name,
            relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath,
            data: arrayBufferToBase64(await file.arrayBuffer()),
          });
        }

        setStatus('Uploading to vector database...');
        setProgress(60);
        setCurrentFile('');

        const res = await fetch('/api/rag/ingest-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reset: resetCollection,
            files: filesData,
            department,
          }),
        });

        setProgress(90);
        const data = await res.json();

        if (!res.ok) {
          setStatus('❌ Ingestion failed.');
          setResult(data);
          return;
        }

        setProgress(100);
        setStatus(`✅ Ingestion completed! ${filteredFiles.length} files processed.`);
        setResult(data);
      } else {
        // Folder path ingestion
        setStatus('Indexing folder...');
        setProgress(30);

        const res = await fetch('/api/rag/ingest-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderPath,
            reset: resetCollection,
            extensions,
            department,
          }),
        });

        setProgress(80);
        const data = await res.json();

        if (!res.ok) {
          setStatus('❌ Ingestion failed.');
          setResult(data);
          return;
        }

        setProgress(100);
        const filesCount = data.files?.length || data.count || '?';
        setStatus(`✅ Ingestion completed! ${filesCount} files indexed.`);
        setResult(data);
      }
    } catch (error: any) {
      setStatus('❌ Ingestion failed.');
      setResult({ error: error?.message || 'Unknown error' });
    } finally {
      setLoading(false);
      setCurrentFile('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-[#0e1728] dark:to-[#0b1220] px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="relative text-center">
          <Link
            href="/"
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            title="Volver al inicio"
          >
            <IconArrowLeft size={24} />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-accent-purple bg-clip-text text-transparent mb-2">
            Vector Sur AI
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            RAG Ingestion
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Indexa documentos locales en la base de datos vectorial.
          </p>
        </div>

        <div className="card p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Folder path
            </label>
            <input
              type="text"
              className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-[#1b2a4a] dark:bg-[#0e1728] dark:text-gray-100"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              onBlur={(e) => {
                const val = e.target.value;
                if (!val) return;
                const normalized = val.replace(/\\/g, '/');
                const parts = normalized.split('/').filter(Boolean);
                const lastPart = parts[parts.length - 1];
                if (lastPart) {
                  const detected = detectDepartmentFromFolder(lastPart);
                  if (detected !== 'General') setDepartment(detected);
                }
              }}
              placeholder="C:\\path\\to\\docs"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-[#1b2a4a] dark:text-gray-200 dark:hover:bg-[#0b1220]"
                onClick={handleBrowse}
              >
                Examinar carpeta
              </button>
              <button
                type="button"
                className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-[#1b2a4a] dark:text-gray-200 dark:hover:bg-[#0b1220]"
                onClick={handleBrowseFiles}
              >
                Examinar archivos
              </button>
              {selectedFiles.length > 0 && (
                <>
                  <span>
                    Seleccionados: {selectedFolderLabel || 'carpeta'} (
                    {selectedFiles.length} archivos)
                  </span>
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-[#1b2a4a] dark:text-gray-200 dark:hover:bg-[#0b1220]"
                    onClick={clearSelection}
                  >
                    Usar ruta manual
                  </button>
                </>
              )}
            </div>
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={handleFolderSelection}
            />
            <input
              ref={filesInputRef}
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.xlsx,.xls,.txt,.md,.markdown"
              onChange={handleFilesSelection}
            />
          </div>

          <div className="flex flex-col gap-3 text-sm text-gray-700 dark:text-gray-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includePdf}
                onChange={(e) => setIncludePdf(e.target.checked)}
              />
              Include PDF
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeExcel}
                onChange={(e) => setIncludeExcel(e.target.checked)}
              />
              Include Excel (.xlsx, .xls)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeText}
                onChange={(e) => setIncludeText(e.target.checked)}
              />
              Include text (.txt, .md)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={resetCollection}
                onChange={(e) => setResetCollection(e.target.checked)}
              />
              Re-ingest (clear existing collection)
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Department / Category
            </label>
            <select
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none dark:border-[#1b2a4a] dark:bg-[#0e1728] dark:text-gray-100"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="General">General</option>
              <option value="RRHH">Recursos Humanos (RRHH)</option>
              <option value="Ventas">Ventas</option>
              <option value="Soporte">Soporte Técnico</option>
              <option value="Finanzas">Finanzas</option>
              <option value="Legal">Legal</option>
            </select>
          </div>

          <button
            className="w-full rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-60"
            onClick={handleIngest}
            disabled={loading || (!folderPath && selectedFiles.length === 0)}
          >
            {loading ? t('Loading...') || 'Loading...' : 'Start ingestion'}
          </button>
        </div>

        <div className="card p-4">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Status
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {status || 'Idle'}
          </div>
          {loading && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Procesando...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              {currentFile && (
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                  📄 {currentFile}
                </div>
              )}
            </div>
          )}
          {result && (
            <pre className="mt-4 whitespace-pre-wrap rounded-md bg-gray-100 p-3 text-xs text-gray-800 dark:bg-[#0b1220] dark:text-gray-200">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          {/* Document Management Section */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Documentos Ingestados
            </h3>
            <DocumentList />
          </div>
        </div>

        {/* Footer for brand consistency */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4">
          <span className="text-primary-600 dark:text-primary-400 font-medium">
            Vector Sur AI
          </span>
          {' - '}
          <span>Powered by local AI models</span>
        </div>
      </div>
    </div>
  );
};

export default RagIngestPage;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'chat'])),
    },
  };
};
