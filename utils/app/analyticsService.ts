/**
 * Analytics Service for Vector Sur AI
 * Tracks usage metrics for the Value Dashboard
 */

export interface QueryEvent {
    timestamp: number;
    department: string;
    ragSourcesCount: number;
    responseTimeMs: number;
}

export interface AnalyticsStats {
    totalQueries: number;
    avgResponseTimeMs: number;
    totalRagSources: number;
    estimatedTimeSavedMinutes: number;
    queriesByDepartment: Record<string, number>;
    topDocuments: { source: string; count: number }[];
}

const STORAGE_KEY = 'vectorsur_analytics';
const MINUTES_SAVED_PER_QUERY = 5; // Assumed time saved per AI query vs manual search

/**
 * Get all tracked events from localStorage
 */
export const getEvents = (): QueryEvent[] => {
    if (typeof window === 'undefined') return [];
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
};

/**
 * Save events to localStorage
 */
const saveEvents = (events: QueryEvent[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
        // Storage full or unavailable
        console.warn('Analytics: Failed to save events');
    }
};

/**
 * Track a new query event
 */
export const trackQuery = (
    department: string,
    ragSourcesCount: number,
    responseTimeMs: number
): void => {
    const events = getEvents();
    events.push({
        timestamp: Date.now(),
        department: department || 'General',
        ragSourcesCount,
        responseTimeMs,
    });

    // Keep only last 1000 events to prevent storage bloat
    if (events.length > 1000) {
        events.splice(0, events.length - 1000);
    }

    saveEvents(events);
};

/**
 * Track a document source citation
 */
const DOCUMENT_STORAGE_KEY = 'vectorsur_doc_citations';

export const trackDocumentCitation = (sourceFile: string): void => {
    if (typeof window === 'undefined' || !sourceFile) return;
    try {
        const data = localStorage.getItem(DOCUMENT_STORAGE_KEY);
        const docs: Record<string, number> = data ? JSON.parse(data) : {};
        docs[sourceFile] = (docs[sourceFile] || 0) + 1;
        localStorage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify(docs));
    } catch {
        console.warn('Analytics: Failed to track document citation');
    }
};

/**
 * Get aggregated statistics
 */
export const getStats = (): AnalyticsStats => {
    const events = getEvents();

    if (events.length === 0) {
        return {
            totalQueries: 0,
            avgResponseTimeMs: 0,
            totalRagSources: 0,
            estimatedTimeSavedMinutes: 0,
            queriesByDepartment: {},
            topDocuments: [],
        };
    }

    const totalQueries = events.length;
    const totalResponseTime = events.reduce((sum, e) => sum + e.responseTimeMs, 0);
    const totalRagSources = events.reduce((sum, e) => sum + e.ragSourcesCount, 0);
    const avgResponseTimeMs = Math.round(totalResponseTime / totalQueries);
    const estimatedTimeSavedMinutes = totalQueries * MINUTES_SAVED_PER_QUERY;

    // Aggregate by department
    const queriesByDepartment: Record<string, number> = {};
    for (const event of events) {
        queriesByDepartment[event.department] = (queriesByDepartment[event.department] || 0) + 1;
    }

    // Get top documents
    let topDocuments: { source: string; count: number }[] = [];
    try {
        const docData = localStorage.getItem(DOCUMENT_STORAGE_KEY);
        if (docData) {
            const docs: Record<string, number> = JSON.parse(docData);
            topDocuments = Object.entries(docs)
                .map(([source, count]) => ({ source, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
        }
    } catch {
        // Ignore errors
    }

    return {
        totalQueries,
        avgResponseTimeMs,
        totalRagSources,
        estimatedTimeSavedMinutes,
        queriesByDepartment,
        topDocuments,
    };
};

/**
 * Clear all analytics data (for testing or reset)
 */
export const clearAnalytics = (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DOCUMENT_STORAGE_KEY);
};
