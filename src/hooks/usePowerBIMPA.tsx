import { useCallback, useEffect, useRef, useState } from 'react';
import { models } from 'powerbi-client';
import { PowerBIMPAService } from '../services/PowerBIMPAService';
import { performanceTracker } from '../services/PowerBIPerformanceTracker';

export interface UsePowerBIMPAOptions {
  enableLogging?: boolean;
  trackPerformance?: boolean;
  persistenceKey?: string;
  maxInstanceAge?: number;
  autoCleanup?: boolean;
}

export interface PowerBIMPAStats {
  totalInstances: number;
  instancesByType: Record<string, number>;
  instanceIds: string[];
  persistedInstances: number;
  lastCleanup: Date | null;
}

export interface UsePowerBIMPAReturn {
  // Service management
  initializeService: (config: {
    accessToken?: string;
    autoRefreshToken?: boolean;
    enableLogging?: boolean;
    settings?: models.ISettings;
  }) => Promise<void>;
  
  // Embedding functions
  embedReport: (
    container: HTMLElement,
    config: models.IReportEmbedConfiguration,
    containerId: string
  ) => Promise<void>;
  
  embedDashboard: (
    container: HTMLElement,
    config: models.IDashboardEmbedConfiguration,
    containerId: string
  ) => Promise<void>;
  
  // State management
  isInitialized: boolean;
  error: string | null;
  stats: PowerBIMPAStats;
  
  // Instance management
  removeInstance: (containerId: string) => void;
  clearPersistence: () => void;
  
  // Performance tracking
  getGlobalPerformanceStats: () => any;
  
  // Error handling
  clearError: () => void;
  retryInitialization: () => Promise<void>;
  
  // Token management
  updateAccessToken: (token: string) => Promise<void>;
  tokenInfo: {
    isValid: boolean;
    expiresAt: Date | null;
  };
}

/**
 * Hook React pour gérer Power BI en mode MPA
 * Fournit une interface simple pour l'embedding avec persistance
 */
export const usePowerBIMPA = (options: UsePowerBIMPAOptions = {}): UsePowerBIMPAReturn => {
  const {
    enableLogging = true,
    trackPerformance = true,
    persistenceKey = 'default-app',
    maxInstanceAge = 15 * 60 * 1000, // 15 minutes
    autoCleanup = true
  } = options;

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<PowerBIMPAStats>({
    totalInstances: 0,
    instancesByType: {},
    instanceIds: [],
    persistedInstances: 0,
    lastCleanup: null
  });
  const [tokenInfo, setTokenInfo] = useState({
    isValid: false,
    expiresAt: null as Date | null
  });

  // Refs
  const serviceRef = useRef<PowerBIMPAService | null>(null);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializationAttempts = useRef(0);

  // Initialisation du service
  const initializeService = useCallback(async (config: {
    accessToken?: string;
    autoRefreshToken?: boolean;
    enableLogging?: boolean;
    settings?: models.ISettings;
  }) => {
    try {
      if (enableLogging) {
        console.log('🔧 Initialisation du service Power BI MPA...');
      }

      const service = PowerBIMPAService.getInstance();
      serviceRef.current = service;

      await service.initialize({
        ...config,
        persistenceKey,
        enableLogging,
        enablePerformanceTracking: trackPerformance
      });

      setIsInitialized(true);
      setError(null);
      initializationAttempts.current = 0;

      // Mise à jour des stats
      updateStats();

      // Validation du token
      updateTokenInfo();

      if (enableLogging) {
        console.log('✅ Service Power BI MPA initialisé avec succès');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'initialisation inconnue';
      setError(errorMessage);
      setIsInitialized(false);
      initializationAttempts.current++;

      if (enableLogging) {
        console.error('❌ Erreur lors de l\'initialisation:', errorMessage);
      }
    }
  }, [enableLogging, trackPerformance, persistenceKey]);

  // Embedding de rapport
  const embedReport = useCallback(async (
    container: HTMLElement,
    config: models.IReportEmbedConfiguration,
    containerId: string
  ) => {
    if (!serviceRef.current || !isInitialized) {
      throw new Error('Service non initialisé. Appelez initializeService() d\'abord.');
    }

    try {
      if (enableLogging) {
        console.log(`📊 Embedding rapport: ${config.id} dans ${containerId}`);
      }

      await serviceRef.current.embedReport(containerId, container, config);
      updateStats();

      if (enableLogging) {
        console.log(`✅ Rapport ${config.id} embedé avec succès`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'embedding';
      setError(errorMessage);

      if (enableLogging) {
        console.error('❌ Erreur lors de l\'embedding du rapport:', errorMessage);
      }

      throw err;
    }
  }, [isInitialized, enableLogging]);

  // Embedding de dashboard
  const embedDashboard = useCallback(async (
    container: HTMLElement,
    config: models.IDashboardEmbedConfiguration,
    containerId: string
  ) => {
    if (!serviceRef.current || !isInitialized) {
      throw new Error('Service non initialisé. Appelez initializeService() d\'abord.');
    }

    try {
      if (enableLogging) {
        console.log(`📈 Embedding dashboard: ${config.id} dans ${containerId}`);
      }

      await serviceRef.current.embedDashboard(containerId, container, config);
      updateStats();

      if (enableLogging) {
        console.log(`✅ Dashboard ${config.id} embedé avec succès`);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur d\'embedding';
      setError(errorMessage);

      if (enableLogging) {
        console.error('❌ Erreur lors de l\'embedding du dashboard:', errorMessage);
      }

      throw err;
    }
  }, [isInitialized, enableLogging]);

  // Mise à jour des statistiques
  const updateStats = useCallback(() => {
    if (serviceRef.current) {
      const currentStats = serviceRef.current.getStats();
      setStats(currentStats);
    }
  }, []);

  // Mise à jour des informations de token
  const updateTokenInfo = useCallback(() => {
    if (serviceRef.current) {
      try {
        // Vérification simple de l'état du token
        setTokenInfo({ 
          isValid: serviceRef.current.isInitialized(), 
          expiresAt: null 
        });
      } catch (err) {
        setTokenInfo({ isValid: false, expiresAt: null });
      }
    }
  }, []);

  // Suppression d'instance
  const removeInstance = useCallback((containerId: string) => {
    if (serviceRef.current) {
      serviceRef.current.removeInstance(containerId);
      updateStats();

      if (enableLogging) {
        console.log(`🗑️ Instance supprimée: ${containerId}`);
      }
    }
  }, [enableLogging]);

  // Nettoyage de la persistance
  const clearPersistence = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.clearPersistence();
      updateStats();
      setIsInitialized(false);

      if (enableLogging) {
        console.log('🧹 Persistance effacée');
      }
    }
  }, [enableLogging]);

  // Statistiques de performance
  const getGlobalPerformanceStats = useCallback(() => {
    return performanceTracker.getGlobalStats();
  }, []);

  // Gestion d'erreurs
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retryInitialization = useCallback(async () => {
    if (initializationAttempts.current < 3) {
      // Réessayer avec la configuration par défaut
      await initializeService({});
    } else {
      setError('Trop de tentatives d\'initialisation échouées');
    }
  }, [initializeService]);

  // Mise à jour du token
  const updateAccessToken = useCallback(async (token: string) => {
    if (serviceRef.current) {
      try {
        await serviceRef.current.updateAccessToken?.(token);
        updateTokenInfo();

        if (enableLogging) {
          console.log('🔑 Token mis à jour');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur de mise à jour du token';
        setError(errorMessage);
      }
    }
  }, [enableLogging]);

  // Effet de nettoyage automatique
  useEffect(() => {
    if (autoCleanup && isInitialized && serviceRef.current) {
      cleanupIntervalRef.current = setInterval(() => {
        serviceRef.current?.cleanupOldInstances();
        updateStats();
      }, 30000); // Nettoyage toutes les 30 secondes

      return () => {
        if (cleanupIntervalRef.current) {
          clearInterval(cleanupIntervalRef.current);
        }
      };
    }
  }, [autoCleanup, isInitialized]);

  // Effet de restauration au montage
  useEffect(() => {
    const service = PowerBIMPAService.getInstance();
    serviceRef.current = service;

    // Le service MPA gère automatiquement la restauration
    if (service.isInitialized()) {
      setIsInitialized(true);
      updateStats();
      updateTokenInfo();

      if (enableLogging) {
        console.log('♻️ Service MPA déjà initialisé');
      }
    }
  }, [persistenceKey, enableLogging]);

  // Effet de nettoyage au démontage
  useEffect(() => {
    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, []);

  // Effet de gestion de la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page cachée - le service MPA gère automatiquement la persistance
        if (enableLogging) {
          console.log('📄 Page cachée - état sauvegardé automatiquement');
        }
      } else {
        // Page visible - restaurer l'état si nécessaire
        updateStats();
        updateTokenInfo();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Effet de gestion avant déchargement
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Le service MPA gère automatiquement la persistance
      if (enableLogging) {
        console.log('📄 Page en cours de déchargement - état sauvegardé automatiquement');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    // Service management
    initializeService,
    
    // Embedding functions
    embedReport,
    embedDashboard,
    
    // State management
    isInitialized,
    error,
    stats,
    
    // Instance management
    removeInstance,
    clearPersistence,
    
    // Performance tracking
    getGlobalPerformanceStats,
    
    // Error handling
    clearError,
    retryInitialization,
    
    // Token management
    updateAccessToken,
    tokenInfo
  };
};
