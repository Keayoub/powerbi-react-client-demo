/**
 * Gestionnaire global pour optimiser le chargement de multiples rapports PowerBI
 * Adapté pour des architectures non-SPA où chaque page est une SPA indépendante
 */

interface ReportLoadRequest {
    reportId: string;
    priority: 'high' | 'normal' | 'low';
    loadCallback: () => void;
    timeoutCallback?: () => void;
}

class ReportLoadManager {
    private static instance: ReportLoadManager;
    private loadingQueue: ReportLoadRequest[] = [];
    private loadingReports: Set<string> = new Set();
    private maxConcurrentLoads: number = 3;
    private loadTimeout: number = 30000; // 30 secondes

    private constructor() {}

    static getInstance(): ReportLoadManager {
        if (!ReportLoadManager.instance) {
            ReportLoadManager.instance = new ReportLoadManager();
        }
        return ReportLoadManager.instance;
    }

    /**
     * Configure la limite de chargements concurrents
     */
    setMaxConcurrentLoads(max: number): void {
        this.maxConcurrentLoads = max;
        this.processQueue();
    }

    /**
     * Ajoute un rapport à la queue de chargement
     */
    requestLoad(request: ReportLoadRequest): void {
        // Éviter les doublons
        if (this.loadingReports.has(request.reportId) || 
            this.loadingQueue.some(r => r.reportId === request.reportId)) {
            return;
        }

        // Insérer selon la priorité
        const insertIndex = this.findInsertPosition(request.priority);
        this.loadingQueue.splice(insertIndex, 0, request);
        
        this.processQueue();
    }

    /**
     * Marque un rapport comme chargé et traite la queue
     */
    reportLoaded(reportId: string): void {
        this.loadingReports.delete(reportId);
        this.processQueue();
    }

    /**
     * Marque un rapport comme échoué et traite la queue
     */
    reportFailed(reportId: string): void {
        this.loadingReports.delete(reportId);
        this.processQueue();
    }

    /**
     * Annule le chargement d'un rapport
     */
    cancelLoad(reportId: string): void {
        this.loadingQueue = this.loadingQueue.filter(r => r.reportId !== reportId);
        this.loadingReports.delete(reportId);
    }

    /**
     * Trouve la position d'insertion selon la priorité
     */
    private findInsertPosition(priority: 'high' | 'normal' | 'low'): number {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        
        for (let i = 0; i < this.loadingQueue.length; i++) {
            if (priorityOrder[priority] < priorityOrder[this.loadingQueue[i].priority]) {
                return i;
            }
        }
        return this.loadingQueue.length;
    }

    /**
     * Traite la queue de chargement
     */
    private processQueue(): void {
        while (this.loadingReports.size < this.maxConcurrentLoads && this.loadingQueue.length > 0) {
            const request = this.loadingQueue.shift()!;
            this.loadingReports.add(request.reportId);
            
            // Déclencher le chargement
            try {
                request.loadCallback();
                
                // Timeout de sécurité
                setTimeout(() => {
                    if (this.loadingReports.has(request.reportId)) {
                        console.warn(`⏰ Timeout for report ${request.reportId}`);
                        this.reportFailed(request.reportId);
                        if (request.timeoutCallback) {
                            request.timeoutCallback();
                        }
                    }
                }, this.loadTimeout);
                
            } catch (error) {
                console.error(`❌ Failed to load report ${request.reportId}:`, error);
                this.reportFailed(request.reportId);
            }
        }
    }

    /**
     * Obtient le statut actuel du gestionnaire
     */
    getStatus(): {
        loading: string[];
        queued: string[];
        totalConcurrent: number;
        maxConcurrent: number;
    } {
        return {
            loading: Array.from(this.loadingReports),
            queued: this.loadingQueue.map(r => r.reportId),
            totalConcurrent: this.loadingReports.size,
            maxConcurrent: this.maxConcurrentLoads
        };
    }

    /**
     * Réinitialise le gestionnaire (utile pour les changements de page)
     */
    reset(): void {
        this.loadingQueue = [];
        this.loadingReports.clear();
    }
}

export const reportLoadManager = ReportLoadManager.getInstance();

/**
 * Hook React pour utiliser le gestionnaire de chargement
 */
export const useReportLoadManager = () => {
    return {
        requestLoad: (reportId: string, priority: 'high' | 'normal' | 'low', loadCallback: () => void) => {
            reportLoadManager.requestLoad({ reportId, priority, loadCallback });
        },
        reportLoaded: (reportId: string) => reportLoadManager.reportLoaded(reportId),
        reportFailed: (reportId: string) => reportLoadManager.reportFailed(reportId),
        cancelLoad: (reportId: string) => reportLoadManager.cancelLoad(reportId),
        getStatus: () => reportLoadManager.getStatus(),
        setMaxConcurrent: (max: number) => reportLoadManager.setMaxConcurrentLoads(max)
    };
};
