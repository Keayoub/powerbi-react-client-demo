/**
 * Service de tracking des performances Power BI
 * Mesure TTFMP (Time To First Meaningful Paint) et TTI (Time To Interactive)
 */

import { Report, Dashboard, models } from 'powerbi-client';

export interface PerformanceMetrics {
    // Métriques de base
    reportId: string;
    containerId: string;
    startTime: number;
    
    // Événements chronométrés
    loadStarted?: number;
    loadCompleted?: number;
    renderStarted?: number;
    renderCompleted?: number;
    firstInteraction?: number;
    
    // Métriques calculées
    ttfmp?: number; // Time To First Meaningful Paint (render completed)
    tti?: number;   // Time To Interactive (first interaction possible)
    loadTime?: number; // Temps total de chargement
    
    // Événements additionnels
    pageChanges: Array<{ timestamp: number; page: string }>;
    interactions: Array<{ timestamp: number; type: string; details?: any }>;
    errors: Array<{ timestamp: number; error: any }>;
    
    // Statut
    status: 'loading' | 'loaded' | 'rendered' | 'interactive' | 'error';
}

export interface PerformanceEvent {
    reportId: string;
    containerId: string;
    eventType: string;
    timestamp: number;
    details?: any;
}

class PowerBIPerformanceTracker {
    private metrics: Map<string, PerformanceMetrics> = new Map();
    private eventListeners: Map<string, Function[]> = new Map();
    private loggingEnabled: boolean = true;

    /**
     * Démarre le tracking pour un nouveau rapport
     */
    startTracking(reportId: string, containerId: string): PerformanceMetrics {
        const startTime = performance.now();
        
        const metrics: PerformanceMetrics = {
            reportId,
            containerId,
            startTime,
            pageChanges: [],
            interactions: [],
            errors: [],
            status: 'loading'
        };

        this.metrics.set(containerId, metrics);
        
        if (this.loggingEnabled) {
            console.log(`📊 Performance tracking started for ${reportId} (${containerId})`);
        }
        
        return metrics;
    }

    /**
     * Enregistre un événement de performance
     */
    recordEvent(containerId: string, eventType: string, details?: any): void {
        const metrics = this.metrics.get(containerId);
        if (!metrics) return;

        const timestamp = performance.now();
        const relativeTime = timestamp - metrics.startTime;

        // Enregistre selon le type d'événement
        switch (eventType) {
            case 'loadStarted':
                metrics.loadStarted = relativeTime;
                metrics.status = 'loading';
                break;
                
            case 'loaded':
                metrics.loadCompleted = relativeTime;
                metrics.loadTime = relativeTime;
                metrics.status = 'loaded';
                break;
                
            case 'renderStarted':
                metrics.renderStarted = relativeTime;
                break;
                
            case 'rendered':
                metrics.renderCompleted = relativeTime;
                metrics.ttfmp = relativeTime; // TTFMP = temps jusqu'au premier rendu
                metrics.status = 'rendered';
                break;
                
            case 'firstInteraction':
                if (!metrics.firstInteraction) {
                    metrics.firstInteraction = relativeTime;
                    metrics.tti = relativeTime; // TTI = temps jusqu'à la première interaction possible
                    metrics.status = 'interactive';
                }
                break;
                
            case 'pageChanged':
                metrics.pageChanges.push({
                    timestamp: relativeTime,
                    page: details?.page || 'unknown'
                });
                break;
                
            case 'interaction':
                metrics.interactions.push({
                    timestamp: relativeTime,
                    type: details?.type || 'unknown',
                    details
                });
                break;
                
            case 'error':
                metrics.errors.push({
                    timestamp: relativeTime,
                    error: details
                });
                metrics.status = 'error';
                break;
        }

        // Notifie les listeners
        this.notifyEventListeners(containerId, {
            reportId: metrics.reportId,
            containerId,
            eventType,
            timestamp: relativeTime,
            details
        });

        if (this.loggingEnabled) {
            console.log(`📈 Event recorded: ${eventType} for ${metrics.reportId} at ${relativeTime.toFixed(2)}ms`);
        }
    }

    /**
     * Branche les événements Power BI sur un rapport
     */
    attachEventListeners(containerId: string, powerBIInstance: Report | Dashboard): void {
        const metrics = this.metrics.get(containerId);
        if (!metrics) return;

        try {
            // Événement: loaded
            powerBIInstance.on('loaded', () => {
                this.recordEvent(containerId, 'loaded');
            });

            // Événement: rendered (TTFMP)
            powerBIInstance.on('rendered', () => {
                this.recordEvent(containerId, 'rendered');
                
                // Après le rendu, on considère que l'interaction est possible
                setTimeout(() => {
                    this.recordEvent(containerId, 'firstInteraction');
                }, 100);
            });

            // Événement: error
            powerBIInstance.on('error', (event: any) => {
                this.recordEvent(containerId, 'error', event.detail);
            });

            // Pour les rapports, événements spécifiques
            if ('getPages' in powerBIInstance) {
                const report = powerBIInstance as Report;
                
                // Changement de page
                report.on('pageChanged', (event: any) => {
                    this.recordEvent(containerId, 'pageChanged', {
                        page: event.detail?.newPage?.name || 'unknown'
                    });
                });

                // Sélection de données (interaction utilisateur)
                report.on('dataSelected', (event: any) => {
                    this.recordEvent(containerId, 'interaction', {
                        type: 'dataSelected',
                        data: event.detail
                    });
                });

                // Clic sur un visual
                report.on('visualClicked', (event: any) => {
                    this.recordEvent(containerId, 'interaction', {
                        type: 'visualClicked',
                        visual: event.detail?.visual?.name
                    });
                });

                // Changement de filtre
                report.on('filtersApplied', (event: any) => {
                    this.recordEvent(containerId, 'interaction', {
                        type: 'filtersApplied',
                        filters: event.detail?.filters?.length || 0
                    });
                });
            }

            if (this.loggingEnabled) {
                console.log(`🎯 Event listeners attached for ${metrics.reportId}`);
            }
            
        } catch (error) {
            if (this.loggingEnabled) {
                console.error('❌ Failed to attach event listeners:', error);
            }
            this.recordEvent(containerId, 'error', error);
        }
    }

    /**
     * Obtient les métriques d'un rapport
     */
    getMetrics(containerId: string): PerformanceMetrics | undefined {
        return this.metrics.get(containerId);
    }

    /**
     * Obtient toutes les métriques
     */
    getAllMetrics(): PerformanceMetrics[] {
        return Array.from(this.metrics.values());
    }

    /**
     * Calcule les statistiques globales
     */
    getGlobalStats() {
        const allMetrics = this.getAllMetrics();
        
        if (allMetrics.length === 0) {
            return {
                totalReports: 0,
                averageTTFMP: 0,
                averageTTI: 0,
                averageLoadTime: 0,
                successRate: 100
            };
        }

        const successful = allMetrics.filter(m => m.status !== 'error');
        const ttfmpValues = successful.filter(m => m.ttfmp).map(m => m.ttfmp!);
        const ttiValues = successful.filter(m => m.tti).map(m => m.tti!);
        const loadTimeValues = successful.filter(m => m.loadTime).map(m => m.loadTime!);

        return {
            totalReports: allMetrics.length,
            successfulReports: successful.length,
            averageTTFMP: ttfmpValues.length > 0 ? 
                ttfmpValues.reduce((a, b) => a + b, 0) / ttfmpValues.length : 0,
            averageTTI: ttiValues.length > 0 ? 
                ttiValues.reduce((a, b) => a + b, 0) / ttiValues.length : 0,
            averageLoadTime: loadTimeValues.length > 0 ? 
                loadTimeValues.reduce((a, b) => a + b, 0) / loadTimeValues.length : 0,
            successRate: (successful.length / allMetrics.length) * 100,
            errorCount: allMetrics.length - successful.length
        };
    }

    /**
     * Ajoute un listener pour les événements de performance
     */
    addEventListener(containerId: string, callback: (event: PerformanceEvent) => void): void {
        if (!this.eventListeners.has(containerId)) {
            this.eventListeners.set(containerId, []);
        }
        this.eventListeners.get(containerId)!.push(callback);
    }

    /**
     * Supprime un listener
     */
    removeEventListener(containerId: string, callback: Function): void {
        const listeners = this.eventListeners.get(containerId);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    /**
     * Notifie tous les listeners
     */
    private notifyEventListeners(containerId: string, event: PerformanceEvent): void {
        const listeners = this.eventListeners.get(containerId);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    if (this.loggingEnabled) {
                        console.error('❌ Error in performance event listener:', error);
                    }
                }
            });
        }
    }

    /**
     * Arrête le tracking et nettoie les ressources
     */
    stopTracking(containerId: string): PerformanceMetrics | undefined {
        const metrics = this.metrics.get(containerId);
        if (metrics && this.loggingEnabled) {
            console.log(`📊 Performance tracking stopped for ${metrics.reportId}:`, {
                loadTime: metrics.loadTime?.toFixed(2) + 'ms',
                ttfmp: metrics.ttfmp?.toFixed(2) + 'ms',
                tti: metrics.tti?.toFixed(2) + 'ms',
                interactions: metrics.interactions.length,
                pageChanges: metrics.pageChanges.length,
                errors: metrics.errors.length
            });
        }
        
        this.metrics.delete(containerId);
        this.eventListeners.delete(containerId);
        return metrics;
    }

    /**
     * Nettoie toutes les métriques
     */
    cleanup(): void {
        if (this.loggingEnabled) {
            console.log('🧹 Cleaning up performance tracker');
        }
        this.metrics.clear();
        this.eventListeners.clear();
    }

    /**
     * Active/désactive le logging
     */
    setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        if (enabled) {
            console.log(`📝 Performance tracker logging ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Obtient l'état du logging
     */
    isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }
}

// Instance singleton
export const performanceTracker = new PowerBIPerformanceTracker();
export default performanceTracker;
