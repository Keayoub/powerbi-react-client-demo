/**
 * Hook React pour utiliser le service Power BI singleton
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { models, Report, Dashboard } from 'powerbi-client';
import { powerBIService, PowerBIServiceConfig } from '../services/PowerBIService';
import { PerformanceMetrics } from '../services/PowerBIPerformanceTracker';

interface UsePowerBIServiceOptions {
    autoCleanup?: boolean;
    enableLogging?: boolean;
    trackPerformance?: boolean;
}

interface UsePowerBIServiceReturn {
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
    
    // Gestion du service
    initializeService: (config: PowerBIServiceConfig) => void;
    updateAccessToken: (token: string) => Promise<void>;
    removeInstance: (containerId: string) => boolean;
    
    // État et statistiques
    isInitialized: boolean;
    stats: {
        totalInstances: number;
        instancesByType: Record<string, number>;
        instanceIds: string[];
    };
    
    // Performance tracking
    performanceMetrics: PerformanceMetrics[];
    getPerformanceMetrics: (containerId: string) => PerformanceMetrics | undefined;
    getGlobalPerformanceStats: () => any;
    addPerformanceListener: (containerId: string, callback: (event: any) => void) => void;
    removePerformanceListener: (containerId: string, callback: Function) => void;
    
    // Utilitaires
    cleanup: () => void;
    getInstance: (containerId: string) => any;
}

export const usePowerBIService = (
    options: UsePowerBIServiceOptions = {}
): UsePowerBIServiceReturn => {
    const { autoCleanup = true, enableLogging = true, trackPerformance = true } = options;
    const [isInitialized, setIsInitialized] = useState(powerBIService.isInitialized());
    const [stats, setStats] = useState(powerBIService.getStats());
    const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([]);
    const containerIdCounter = useRef(0);

    // Génère un ID unique pour le container
    const generateContainerId = useCallback((): string => {
        containerIdCounter.current += 1;
        return `powerbi-container-${containerIdCounter.current}-${Date.now()}`;
    }, []);

    // Initialise le service
    const initializeService = useCallback((config: PowerBIServiceConfig) => {
        try {
            // Activer le tracking des performances si demandé
            const configWithTracking = {
                ...config,
                enablePerformanceTracking: trackPerformance
            };
            
            powerBIService.initialize(configWithTracking);
            setIsInitialized(true);
            if (enableLogging) {
                console.log('🔧 PowerBI Service initialized via hook');
            }
        } catch (error) {
            console.error('❌ Failed to initialize PowerBI Service:', error);
        }
    }, [enableLogging, trackPerformance]);

    // Embed un rapport
    const embedReport = useCallback(async (
        container: HTMLElement,
        config: models.IReportEmbedConfiguration,
        containerId?: string
    ): Promise<Report> => {
        const id = containerId || generateContainerId();
        
        try {
            const report = await powerBIService.embedReport(id, container, config);
            setStats(powerBIService.getStats());
            return report;
        } catch (error) {
            console.error('❌ Failed to embed report:', error);
            throw error;
        }
    }, [generateContainerId]);

    // Embed un dashboard
    const embedDashboard = useCallback(async (
        container: HTMLElement,
        config: models.IDashboardEmbedConfiguration,
        containerId?: string
    ): Promise<Dashboard> => {
        const id = containerId || generateContainerId();
        
        try {
            const dashboard = await powerBIService.embedDashboard(id, container, config);
            setStats(powerBIService.getStats());
            return dashboard;
        } catch (error) {
            console.error('❌ Failed to embed dashboard:', error);
            throw error;
        }
    }, [generateContainerId]);

    // Met à jour le token d'accès
    const updateAccessToken = useCallback(async (token: string): Promise<void> => {
        try {
            await powerBIService.updateAccessToken(token);
            if (enableLogging) {
                console.log('✅ Access token updated via hook');
            }
        } catch (error) {
            console.error('❌ Failed to update access token:', error);
            throw error;
        }
    }, [enableLogging]);

    // Supprime une instance
    const removeInstance = useCallback((containerId: string): boolean => {
        const result = powerBIService.removeInstance(containerId);
        setStats(powerBIService.getStats());
        return result;
    }, []);

    // Nettoie toutes les instances
    const cleanup = useCallback(() => {
        powerBIService.cleanup();
        setStats(powerBIService.getStats());
        if (enableLogging) {
            console.log('🧹 PowerBI Service cleaned up via hook');
        }
    }, [enableLogging]);

    // Obtient une instance
    const getInstance = useCallback((containerId: string) => {
        return powerBIService.getInstance(containerId);
    }, []);

    // Méthodes de performance
    const getPerformanceMetrics = useCallback((containerId: string): PerformanceMetrics | undefined => {
        return powerBIService.getPerformanceMetrics(containerId);
    }, []);

    const getGlobalPerformanceStats = useCallback(() => {
        return powerBIService.getGlobalPerformanceStats();
    }, []);

    const addPerformanceListener = useCallback((containerId: string, callback: (event: any) => void) => {
        powerBIService.addPerformanceEventListener(containerId, callback);
    }, []);

    const removePerformanceListener = useCallback((containerId: string, callback: Function) => {
        powerBIService.removePerformanceEventListener(containerId, callback);
    }, []);

    // Mise à jour périodique des statistiques et métriques de performance
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(powerBIService.getStats());
            setIsInitialized(powerBIService.isInitialized());
            
            if (trackPerformance) {
                setPerformanceMetrics(powerBIService.getAllPerformanceMetrics());
            }
        }, 5000); // Mise à jour toutes les 5 secondes

        return () => clearInterval(interval);
    }, [trackPerformance]);

    // Cleanup automatique au démontage du composant
    useEffect(() => {
        return () => {
            if (autoCleanup) {
                cleanup();
            }
        };
    }, [autoCleanup, cleanup]);

    return {
        embedReport,
        embedDashboard,
        initializeService,
        updateAccessToken,
        removeInstance,
        isInitialized,
        stats,
        performanceMetrics,
        getPerformanceMetrics,
        getGlobalPerformanceStats,
        addPerformanceListener,
        removePerformanceListener,
        cleanup,
        getInstance
    };
};

/**
 * Hook spécialisé pour initialiser le service une seule fois par page
 */
export const usePowerBIServiceInitializer = (
    config: PowerBIServiceConfig,
    dependencies: any[] = []
) => {
    const { initializeService, isInitialized } = usePowerBIService({ autoCleanup: false });

    useEffect(() => {
        if (!isInitialized) {
            initializeService(config);
        }
    }, [config.accessToken, ...dependencies]); // eslint-disable-line react-hooks/exhaustive-deps

    return { isInitialized };
};
