import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { GetStaticProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { IconArrowLeft, IconChartBar, IconClock, IconFileText, IconPigMoney, IconMessage } from '@tabler/icons-react';
import { getStats, AnalyticsStats, clearAnalytics } from '@/utils/app/analyticsService';

export default function AnalyticsDashboard() {
    const { t } = useTranslation('common');
    const [stats, setStats] = useState<AnalyticsStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load stats on mount
        const loadedStats = getStats();
        setStats(loadedStats);
        setLoading(false);
    }, []);

    const handleClearData = () => {
        if (confirm('¿Estás seguro de que quieres borrar todos los datos de analíticas?')) {
            clearAnalytics();
            setStats(getStats());
        }
    };

    // Calculate estimated cost savings (€0.50 per minute of employee time saved)
    const costPerMinute = 0.5;
    const estimatedSavings = stats ? (stats.estimatedTimeSavedMinutes * costPerMinute).toFixed(2) : '0.00';

    // Get department data for chart
    const departments = stats?.queriesByDepartment || {};
    const maxQueries = Math.max(...Object.values(departments), 1);

    return (
        <>
            <Head>
                <title>Dashboard | Vector Sur AI</title>
                <meta name="description" content="Analytics dashboard for Vector Sur AI" />
            </Head>

            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-black">
                {/* Header */}
                <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Link
                                    href="/"
                                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                >
                                    <IconArrowLeft size={20} />
                                    <span className="hidden sm:inline">Volver al Chat</span>
                                </Link>
                                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700" />
                                <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <IconChartBar size={24} className="text-primary-500" />
                                    Dashboard de Valor
                                </h1>
                            </div>
                            <button
                                onClick={handleClearData}
                                className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                            >
                                Resetear datos
                            </button>
                        </div>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                {/* Total Queries */}
                                <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-white/5 hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                                            <IconMessage size={24} className="text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Consultas</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalQueries || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Avg Response Time */}
                                <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-white/5 hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                                            <IconClock size={24} className="text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Tiempo Respuesta</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                                {stats?.avgResponseTimeMs ? `${(stats.avgResponseTimeMs / 1000).toFixed(1)}s` : '0s'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Documents Referenced */}
                                <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-white/5 hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                                            <IconFileText size={24} className="text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Docs Referenciados</p>
                                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalRagSources || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Estimated Savings */}
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 shadow-card hover:shadow-hover transition-all duration-300 hover:-translate-y-1">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 rounded-xl bg-white/20">
                                            <IconPigMoney size={24} className="text-white" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-green-100">Ahorro Estimado</p>
                                            <p className="text-3xl font-bold text-white">€{estimatedSavings}</p>
                                            <p className="text-xs text-green-200 mt-1">{stats?.estimatedTimeSavedMinutes || 0} min ahorrados</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Department Distribution */}
                                <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-white/5">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Consultas por Departamento</h2>

                                    {Object.keys(departments).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                            <IconChartBar size={48} className="mb-2 opacity-50" />
                                            <p>Sin datos aún</p>
                                            <p className="text-sm">Envía algunas consultas para ver estadísticas</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {Object.entries(departments).map(([dept, count]) => (
                                                <div key={dept} className="group">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dept}</span>
                                                        <span className="text-sm text-gray-500 dark:text-gray-400">{count}</span>
                                                    </div>
                                                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500 group-hover:from-primary-600 group-hover:to-primary-500"
                                                            style={{ width: `${(count / maxQueries) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Top Documents */}
                                <div className="bg-white dark:bg-gray-800/50 rounded-2xl p-6 shadow-card border border-gray-100 dark:border-white/5">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Documentos Más Consultados</h2>

                                    {!stats?.topDocuments?.length ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                            <IconFileText size={48} className="mb-2 opacity-50" />
                                            <p>Sin documentos citados aún</p>
                                            <p className="text-sm">Las citas RAG aparecerán aquí</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {stats.topDocuments.map((doc, index) => (
                                                <div
                                                    key={doc.source}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400">#{index + 1}</span>
                                                    </div>
                                                    <div className="flex-grow min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            {doc.source.split('/').pop() || doc.source}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{doc.count} citas</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ROI Calculator Section */}
                            <div className="mt-8 bg-gradient-to-r from-primary-600 to-primary-500 rounded-2xl p-8 shadow-lg">
                                <div className="max-w-2xl">
                                    <h2 className="text-2xl font-bold text-white mb-2">Retorno de Inversión</h2>
                                    <p className="text-primary-100 mb-4">
                                        Basado en {stats?.totalQueries || 0} consultas procesadas, tu equipo ha ahorrado aproximadamente{' '}
                                        <strong className="text-white">{stats?.estimatedTimeSavedMinutes || 0} minutos</strong> de búsqueda manual.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="bg-white/10 rounded-xl p-4">
                                            <p className="text-sm text-primary-200">Horas Ahorradas</p>
                                            <p className="text-2xl font-bold text-white">
                                                {((stats?.estimatedTimeSavedMinutes || 0) / 60).toFixed(1)}h
                                            </p>
                                        </div>
                                        <div className="bg-white/10 rounded-xl p-4">
                                            <p className="text-sm text-primary-200">Valor Generado (€30/h)</p>
                                            <p className="text-2xl font-bold text-white">
                                                €{(((stats?.estimatedTimeSavedMinutes || 0) / 60) * 30).toFixed(0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
    return {
        props: {
            ...(await serverSideTranslations(locale ?? 'en', ['common'])),
        },
    };
};
