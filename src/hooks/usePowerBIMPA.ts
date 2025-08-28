/**
 * Hook React spécialisé pour Power BI en mode MPA (Multi-Page Application)
 * Gère la persistance entre les rechargements de page
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { models, Report, Dashboard } from 'powerbi-client';
import { powerBIMPAService } from '../services/PowerBIMPAService';
import { PerformanceMetrics } from '../services/PowerBIPerformanceTracker';

interface PowerBIMPAConfig {
    accessToken?: string;
    tokenType?: models.TokenType;
    settings?: models.ISettings;
    enablePerformanceTracking?: boolean;
    enableLogging?: boolean;
    autoRefreshToken?: boolean;
    persistenceKey?: string;
}

interface UsePowerBIMPAOptions {
    autoCleanup?: boolean;
    enableLogging?: boolean;
    trackPerformance?: boolean;
    persistenceKey?: string;
    maxInstanceAge?: number; // Âge maximum des instances en ms
}

interface UsePowerBIMPAReturn {
    // Méthodes d'embed
    embedReport: (
        container: HTMLElement,
        config: models.IReportEmbedConfiguration,
        containerId?: string
    ) => Promise<Report>;
    
    embedDashboard: (
        container: HTMLElement,
        config: models.IDashboardEmbedConfiguration,
        containerId?: string
    ) => Promise<Dashboard>;
    
    // Gestion du service MPA
    initializeService: (config: PowerBIMPAConfig) => Promise<void>;
    updateAccessToken: (token: string) => Promise<void>;
    removeInstance: (containerId: string) => boolean;
    clearPersistence: () => void;
    
    // État et statistiques
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    stats: {
        totalInstances: number;
        instancesByType: Record<string, number>;
        instanceIds: string[];
        persistedInstances: number;
        lastCleanup: Date | null;
    };
    
    // Performance tracking
    performanceMetrics: PerformanceMetrics[];
    getPerformanceMetrics: (containerId: string) => PerformanceMetrics | undefined;
    getGlobalPerformanceStats: () => any;
    
    // Gestion des erreurs
    clearError: () => void;
    retryInitialization: () => Promise<void>;
}

export function usePowerBIMPA({
    autoCleanup = true,
    enableLogging = process.env.NODE_ENV === 'development',
    trackPerformance = true,
    persistenceKey = 'powerbi-mpa',
    maxInstanceAge = 30 * 60 * 1000 // 30 minutes
}: UsePowerBIMPAOptions = {}): UsePowerBIMPAReturn {
    
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState(powerBIMPAService.getStats());
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
    
    const serviceRef = useRef(powerBIMPAService);
    const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const initializingRef = useRef(false);

    /**
     * Initialise le service MPA
     */
    const initializeService = useCallback(async (config: PowerBIMPAConfig): Promise<void> => {
        if (initializingRef.current) return;
        
        initializingRef.current = true;
        setIsLoading(true);
        setError(null);

        try {
            const mpaConfig: PowerBIMPAConfig = {
                ...config,
                enableLogging,
                enablePerformanceTracking: trackPerformance,
                persistenceKey
            };

            await serviceRef.current.initialize(mpaConfig);
            setIsInitialized(true);
            setStats(serviceRef.current.getStats());

            if (enableLogging) {
                console.log('✅ PowerBI MPA Service initialized via hook');
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur d\'initialisation MPA inconnue';
            setError(errorMessage);
            
            if (enableLogging) {
                console.error('❌ PowerBI MPA Service initialization failed:', err);
            }
        } finally {
            setIsLoading(false);
            initializingRef.current = false;
        }
    }, [enableLogging, trackPerformance, persistenceKey]);

    /**
     * Embed un rapport
     */
    const embedReport = useCallback(async (
        container: HTMLElement,
        config: models.IReportEmbedConfiguration,
        containerId?: string
    ): Promise<Report> => {
        if (!isInitialized) {
            throw new Error('Service MPA doit être initialisé avant l\'embedding');
        }

        try {
            const actualContainerId = containerId || config.id || `report-${Date.now()}`;
            const report = await serviceRef.current.embedReport(actualContainerId, container, config);
            
            // Mettre à jour les stats
            setStats(serviceRef.current.getStats());
            
            return report;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur d\'embedding de rapport';
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized]);

    /**
     * Embed un dashboard
     */
    const embedDashboard = useCallback(async (
        container: HTMLElement,
        config: models.IDashboardEmbedConfiguration,
        containerId?: string
    ): Promise<Dashboard> => {
        if (!isInitialized) {
            throw new Error('Service MPA doit être initialisé avant l\'embedding');
        }

        try {
            const actualContainerId = containerId || config.id || `dashboard-${Date.now()}`;
            const dashboard = await serviceRef.current.embedDashboard(actualContainerId, container, config);
            
            // Mettre à jour les stats
            setStats(serviceRef.current.getStats());
            
            return dashboard;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur d\'embedding de dashboard';
            setError(errorMessage);
            throw err;
        }
    }, [isInitialized]);

    /**
     * Met à jour le token d'accès
     */
    const updateAccessToken = useCallback(async (token: string): Promise<void> => {
        try {
            await serviceRef.current.updateAccessToken(token);
            setError(null);
            
            if (enableLogging) {
                console.log('🔄 Token mis à jour dans le hook MPA');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour du token';
            setError(errorMessage);
            throw err;
        }
    }, [enableLogging]);

    /**
     * Supprime une instance
     */
    const removeInstance = useCallback((containerId: string): boolean => {
        const removed = serviceRef.current.removeInstance(containerId);
        if (removed) {
            setStats(serviceRef.current.getStats());
        }
        return removed;
    }, []);

    /**
     * Efface la persistance
     */
    const clearPersistence = useCallback(() => {
        serviceRef.current.clearPersistence();
        setStats(serviceRef.current.getStats());
        
        if (enableLogging) {
            console.log('🧹 Persistance MPA effacée via hook');
        }
    }, [enableLogging]);

    /**
     * Efface l'erreur
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Relance l'initialisation
     */
    const retryInitialization = useCallback(async (): Promise<void> => {
        setIsInitialized(false);
        setError(null);
        
        // Re-initialiser avec la dernière config si disponible
        // En mode MPA, la config devrait être restaurée automatiquement
        if (serviceRef.current.isInitialized()) {
            setIsInitialized(true);
            setStats(serviceRef.current.getStats());
        }
    }, []);

    /**
     * Obtient les métriques de performance pour un container
     */
    const getPerformanceMetrics = useCallback((containerId: string): PerformanceMetrics | undefined => {
        return performanceMetrics.find(m => m.containerId === containerId);
    }, [performanceMetrics]);

    /**
     * Obtient les statistiques globales de performance
     */
    const getGlobalPerformanceStats = useCallback(() => {
        return {
            totalReports: performanceMetrics.length,
            averageLoadTime: performanceMetrics.reduce((acc, m) => acc + (m.loadTime || 0), 0) / performanceMetrics.length || 0,
            totalInteractions: performanceMetrics.reduce((acc, m) => acc + m.interactions.length, 0),
            totalPageChanges: performanceMetrics.reduce((acc, m) => acc + m.pageChanges.length, 0),
            totalErrors: performanceMetrics.reduce((acc, m) => acc + m.errors.length, 0)
        };
    }, [performanceMetrics]);

    /**
     * Configuration du nettoyage automatique
     */
    useEffect(() => {
        if (!autoCleanup || !isInitialized) return;

        cleanupIntervalRef.current = setInterval(() => {
            serviceRef.current.cleanupOldInstances(maxInstanceAge);
            setStats(serviceRef.current.getStats());
        }, 5 * 60 * 1000); // Nettoyage toutes les 5 minutes

        return () => {
            if (cleanupIntervalRef.current) {
                clearInterval(cleanupIntervalRef.current);
            }
        };
    }, [autoCleanup, isInitialized, maxInstanceAge]);

    /**
     * Surveillance des métriques de performance
     */
    useEffect(() => {
        if (!trackPerformance || !isInitialized) return;

        const updateMetrics = () => {
            // En mode MPA, les métriques sont gérées par le service
            // Ici on peut les récupérer si nécessaire
            setStats(serviceRef.current.getStats());
        };

        const interval = setInterval(updateMetrics, 1000);
        return () => clearInterval(interval);
    }, [trackPerformance, isInitialized]);

    /**
     * Vérification de l'état du service au montage
     */
    useEffect(() => {
        // En mode MPA, vérifier si le service est déjà initialisé
        if (serviceRef.current.isInitialized()) {
            setIsInitialized(true);
            setStats(serviceRef.current.getStats());
            
            if (enableLogging) {
                console.log('🔄 Service MPA déjà initialisé, état restauré');
            }
        }
    }, [enableLogging]);

    /**
     * Configuration du logging
     */
    useEffect(() => {
        serviceRef.current.setLogging(enableLogging);
    }, [enableLogging]);

    /**
     * Nettoyage au démontage
     */
    useEffect(() => {
        return () => {
            if (cleanupIntervalRef.current) {
                clearInterval(cleanupIntervalRef.current);
            }
            // En mode MPA, on ne nettoie pas le service car il doit persister
            // entre les pages
        };
    }, []);

    /**
     * Gestionnaire de visibilité de page pour MPA
     */
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isInitialized) {
                // Page devient visible, vérifier l'état
                setStats(serviceRef.current.getStats());
                
                if (enableLogging) {
                    console.log('👀 Page MPA visible, stats mises à jour');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isInitialized, enableLogging]);

    /**
     * Gestionnaire beforeunload pour sauvegarder l'état
     */
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (isInitialized) {
                // En mode MPA, la persistance est automatique mais on peut forcer une sauvegarde
                setStats(serviceRef.current.getStats());
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isInitialized]);

    return {
        // Méthodes d'embed
        embedReport,
        embedDashboard,
        
        // Gestion du service
        initializeService,
        updateAccessToken,
        removeInstance,
        clearPersistence,
        
        // État
        isInitialized,
        isLoading,
        error,
        stats,
        
        // Performance
        performanceMetrics,
        getPerformanceMetrics,
        getGlobalPerformanceStats,
        
        // Gestion des erreurs
        clearError,
        retryInitialization
    };
}

export default usePowerBIMPA;
