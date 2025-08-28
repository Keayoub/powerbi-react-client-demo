/**
 * Service singleton Power BI pour réutiliser une seule instance par page
 * Optimise les performances en évitant la création multiple d'instances
 */

import { service, factories, models, Report, Dashboard, Tile } from 'powerbi-client';
import { performanceTracker, PerformanceMetrics } from './PowerBIPerformanceTracker';
import { powerBIAuthService } from './PowerBIAuthService';
import { powerBIConfigService } from './PowerBIConfigService';

interface PowerBIServiceConfig {
    accessToken?: string;
    tokenType?: models.TokenType;
    settings?: models.ISettings;
    enablePerformanceTracking?: boolean;
    enableLogging?: boolean;
    autoRefreshToken?: boolean;
}

interface EmbedInstance {
    id: string;
    type: 'report' | 'dashboard' | 'tile';
    instance: Report | Dashboard | Tile;
    container: HTMLElement;
    config: any;
}

class PowerBIService {
    private static instance: PowerBIService;
    private serviceInstance: service.Service;
    private embeddedInstances: Map<string, EmbedInstance> = new Map();
    private globalConfig: PowerBIServiceConfig | null = null;
    private initialized: boolean = false;
    private performanceTrackingEnabled: boolean = false;
    private loggingEnabled: boolean = true;

    private constructor() {
        // Service singleton Power BI
        this.serviceInstance = new service.Service(
            factories.hpmFactory,
            factories.wpmpFactory,
            factories.routerFactory
        );
    }

    /**
     * Obtient l'instance singleton du service Power BI
     */
    static getInstance(): PowerBIService {
        if (!PowerBIService.instance) {
            PowerBIService.instance = new PowerBIService();
        }
        return PowerBIService.instance;
    }

    /**
     * Initialise le service avec une configuration globale
     */
    async initialize(config: PowerBIServiceConfig): Promise<void> {
        this.globalConfig = config;
        this.initialized = true;
        this.performanceTrackingEnabled = config.enablePerformanceTracking ?? true;
        this.loggingEnabled = config.enableLogging ?? true;
        
        // Configurer les services d'authentification et de configuration
        powerBIAuthService.setLogging(this.loggingEnabled);
        powerBIConfigService.setLogging(this.loggingEnabled);
        
        // Charger les configurations
        await powerBIConfigService.loadConfigurationsFromEnvironment();
        
        // Si aucun token fourni, essayer d'en obtenir un via le service d'auth
        if (!config.accessToken && config.autoRefreshToken !== false) {
            try {
                const token = await powerBIAuthService.getValidToken();
                this.globalConfig.accessToken = token;
                
                if (this.loggingEnabled) {
                    console.log('🔑 Token obtenu automatiquement');
                }
            } catch (error) {
                if (this.loggingEnabled) {
                    console.warn('⚠️ Impossible d\'obtenir un token automatiquement:', error);
                }
            }
        }
        
        if (this.loggingEnabled) {
            console.log('🔧 PowerBI Service initialized with global config', {
                performanceTracking: this.performanceTrackingEnabled,
                logging: this.loggingEnabled,
                hasToken: !!this.globalConfig.accessToken,
                autoRefresh: config.autoRefreshToken !== false
            });
        }
    }

    /**
     * Vérifie si le service est initialisé
     */
    isInitialized(): boolean {
        return this.initialized && this.globalConfig !== null;
    }

    /**
     * Embed un rapport en réutilisant le service
     */
    async embedReport(
        containerId: string,
        container: HTMLElement,
        config: models.IReportEmbedConfiguration
    ): Promise<Report> {
        if (!this.isInitialized()) {
            throw new Error('PowerBI Service must be initialized before embedding');
        }

        // Vérifier si une instance existe déjà pour ce container
        if (this.embeddedInstances.has(containerId)) {
            if (this.loggingEnabled) {
                console.log(`♻️ Reusing existing report instance for ${containerId}`);
            }
            return this.embeddedInstances.get(containerId)!.instance as Report;
        }

        // Démarrer le tracking des performances
        if (this.performanceTrackingEnabled) {
            performanceTracker.startTracking(config.id || containerId, containerId);
            performanceTracker.recordEvent(containerId, 'loadStarted');
        }

        try {
            // Obtenir la configuration complète depuis le service de config
            const storedConfig = powerBIConfigService.getConfiguration(config.id || containerId);
            
            // Obtenir un token valide
            let accessToken = this.globalConfig!.accessToken;
            if (!accessToken) {
                accessToken = await powerBIAuthService.getValidToken();
                this.globalConfig!.accessToken = accessToken;
            }

            // Vérifier si le token est encore valide
            if (!powerBIAuthService.isTokenValid()) {
                try {
                    accessToken = await powerBIAuthService.refreshToken();
                    this.globalConfig!.accessToken = accessToken;
                    
                    if (this.loggingEnabled) {
                        console.log('🔄 Token rafraîchi pour l\'embedding');
                    }
                } catch (tokenError) {
                    if (this.loggingEnabled) {
                        console.error('❌ Erreur lors du rafraîchissement du token:', tokenError);
                    }
                    throw new Error('Token invalide et impossible à rafraîchir');
                }
            }

            // Fusionner les configurations
            const embedConfig: models.IReportEmbedConfiguration = {
                ...config,
                accessToken,
                tokenType: this.globalConfig!.tokenType || models.TokenType.Embed,
                settings: {
                    ...this.globalConfig!.settings,
                    ...storedConfig?.settings,
                    ...config.settings
                }
            };

            // Utiliser le service singleton pour embed
            const report = this.serviceInstance.embed(container, embedConfig) as Report;

            // Stocker l'instance
            this.embeddedInstances.set(containerId, {
                id: containerId,
                type: 'report',
                instance: report,
                container,
                config
            });

            // Attacher les listeners de performance
            if (this.performanceTrackingEnabled) {
                performanceTracker.attachEventListeners(containerId, report);
            }

            if (this.loggingEnabled) {
                console.log(`✅ New report embedded: ${containerId}`);
            }
            return report;

        } catch (error) {
            // Enregistrer l'erreur dans le tracker
            if (this.performanceTrackingEnabled) {
                performanceTracker.recordEvent(containerId, 'error', error);
            }
            
            if (this.loggingEnabled) {
                console.error(`❌ Failed to embed report ${containerId}:`, error);
            }
            throw error;
        }
    }

    /**
     * Embed un dashboard en réutilisant le service
     */
    async embedDashboard(
        containerId: string,
        container: HTMLElement,
        config: models.IDashboardEmbedConfiguration
    ): Promise<Dashboard> {
        if (!this.isInitialized()) {
            throw new Error('PowerBI Service must be initialized before embedding');
        }

        if (this.embeddedInstances.has(containerId)) {
            if (this.loggingEnabled) {
                console.log(`♻️ Reusing existing dashboard instance for ${containerId}`);
            }
            return this.embeddedInstances.get(containerId)!.instance as Dashboard;
        }

        // Démarrer le tracking des performances
        if (this.performanceTrackingEnabled) {
            performanceTracker.startTracking(config.id || containerId, containerId);
            performanceTracker.recordEvent(containerId, 'loadStarted');
        }

        try {
            const dashboard = this.serviceInstance.embed(container, {
                ...config,
                accessToken: this.globalConfig!.accessToken,
                tokenType: this.globalConfig!.tokenType || models.TokenType.Embed,
                settings: {
                    ...this.globalConfig!.settings,
                    ...config.settings
                }
            }) as Dashboard;

            this.embeddedInstances.set(containerId, {
                id: containerId,
                type: 'dashboard',
                instance: dashboard,
                container,
                config
            });

            // Attacher les listeners de performance
            if (this.performanceTrackingEnabled) {
                performanceTracker.attachEventListeners(containerId, dashboard);
            }

            if (this.loggingEnabled) {
                console.log(`✅ New dashboard embedded: ${containerId}`);
            }
            return dashboard;

        } catch (error) {
            // Enregistrer l'erreur dans le tracker
            if (this.performanceTrackingEnabled) {
                performanceTracker.recordEvent(containerId, 'error', error);
            }
            
            if (this.loggingEnabled) {
                console.error(`❌ Failed to embed dashboard ${containerId}:`, error);
            }
            throw error;
        }
    }

    /**
     * Met à jour le token d'accès pour toutes les instances
     */
    async updateAccessToken(newToken: string): Promise<void> {
        if (!this.isInitialized()) {
            if (this.loggingEnabled) {
                console.warn('⚠️ Service not initialized, cannot update token');
            }
            return;
        }

        this.globalConfig!.accessToken = newToken;

        // Mettre à jour toutes les instances existantes
        const updatePromises = Array.from(this.embeddedInstances.values()).map(
            async (embedInstance) => {
                try {
                    if (embedInstance.type === 'report') {
                        await (embedInstance.instance as Report).setAccessToken(newToken);
                    } else if (embedInstance.type === 'dashboard') {
                        await (embedInstance.instance as Dashboard).setAccessToken(newToken);
                    }
                    if (this.loggingEnabled) {
                        console.log(`🔄 Token updated for ${embedInstance.id}`);
                    }
                } catch (error) {
                    if (this.loggingEnabled) {
                        console.error(`❌ Failed to update token for ${embedInstance.id}:`, error);
                    }
                }
            }
        );

        await Promise.all(updatePromises);
        if (this.loggingEnabled) {
            console.log('✅ Access token updated for all instances');
        }
    }

    /**
     * Obtient une instance embedée existante
     */
    getInstance(containerId: string): EmbedInstance | null {
        return this.embeddedInstances.get(containerId) || null;
    }

    /**
     * Supprime une instance embedée
     */
    removeInstance(containerId: string): boolean {
        const embedInstance = this.embeddedInstances.get(containerId);
        if (!embedInstance) {
            return false;
        }

        try {
            // Arrêter le tracking des performances
            if (this.performanceTrackingEnabled) {
                performanceTracker.stopTracking(containerId);
            }

            // Cleanup de l'instance Power BI
            if (embedInstance.type === 'report') {
                (embedInstance.instance as Report).off('loaded');
                (embedInstance.instance as Report).off('error');
                (embedInstance.instance as Report).off('rendered');
            }

            // Supprimer du DOM
            if (embedInstance.container && embedInstance.container.firstChild) {
                embedInstance.container.removeChild(embedInstance.container.firstChild);
            }

            this.embeddedInstances.delete(containerId);
            if (this.loggingEnabled) {
                console.log(`🗑️ Removed instance: ${containerId}`);
            }
            return true;

        } catch (error) {
            if (this.loggingEnabled) {
                console.error(`❌ Failed to remove instance ${containerId}:`, error);
            }
            return false;
        }
    }

    /**
     * Nettoie toutes les instances (utile lors du changement de page)
     */
    cleanup(): void {
        const instanceIds = Array.from(this.embeddedInstances.keys());
        
        instanceIds.forEach(id => {
            this.removeInstance(id);
        });

        this.embeddedInstances.clear();
        
        // Nettoyer le tracker de performance
        if (this.performanceTrackingEnabled) {
            performanceTracker.cleanup();
        }

        if (this.loggingEnabled) {
            console.log('🧹 All PowerBI instances cleaned up');
        }
    }

    /**
     * Réinitialise complètement le service
     */
    reset(): void {
        this.cleanup();
        this.globalConfig = null;
        this.initialized = false;
        if (this.loggingEnabled) {
            console.log('🔄 PowerBI Service reset');
        }
    }

    /**
     * Obtient les statistiques du service
     */
    getStats(): {
        totalInstances: number;
        instancesByType: Record<string, number>;
        instanceIds: string[];
        isInitialized: boolean;
        activeFrames: number;
        totalServices: number;
    } {
        const instancesByType: Record<string, number> = {};
        
        this.embeddedInstances.forEach(instance => {
            instancesByType[instance.type] = (instancesByType[instance.type] || 0) + 1;
        });

        // Count active frames (iframe elements with Power BI content)
        const activeFrames = document.querySelectorAll('iframe[src*="powerbi.com"], iframe[src*="analysis.windows.net"]').length;

        return {
            totalInstances: this.embeddedInstances.size,
            instancesByType,
            instanceIds: Array.from(this.embeddedInstances.keys()),
            isInitialized: this.initialized,
            activeFrames: activeFrames,
            totalServices: 1 // Always 1 since we use a singleton service
        };
    }

    /**
     * Gets detailed service and frame metrics
     */
    getLoadedInstancesCount(): { services: number; frames: number; reports: number; dashboards: number } {
        const reports = Array.from(this.embeddedInstances.values()).filter(instance => instance.type === 'report').length;
        const dashboards = Array.from(this.embeddedInstances.values()).filter(instance => instance.type === 'dashboard').length;
        const activeFrames = document.querySelectorAll('iframe[src*="powerbi.com"], iframe[src*="analysis.windows.net"]').length;
        
        return { 
            services: 1, // Always 1 since we use a singleton service
            frames: activeFrames,
            reports: reports,
            dashboards: dashboards
        };
    }

    /**
     * Configure les settings globaux
     */
    updateGlobalSettings(settings: models.ISettings): void {
        if (this.globalConfig) {
            this.globalConfig.settings = {
                ...this.globalConfig.settings,
                ...settings
            };
            if (this.loggingEnabled) {
                console.log('⚙️ Global settings updated');
            }
        }
    }

    /**
     * Obtient le service Power BI natif (pour cas avancés)
     */
    getNativeService(): service.Service {
        return this.serviceInstance;
    }

    /**
     * Obtient les métriques de performance pour un container spécifique
     */
    getPerformanceMetrics(containerId: string): PerformanceMetrics | undefined {
        return performanceTracker.getMetrics(containerId);
    }

    /**
     * Obtient toutes les métriques de performance
     */
    getAllPerformanceMetrics(): PerformanceMetrics[] {
        return performanceTracker.getAllMetrics();
    }

    /**
     * Obtient les statistiques globales de performance
     */
    getGlobalPerformanceStats() {
        return performanceTracker.getGlobalStats();
    }

    /**
     * Active/désactive le tracking des performances
     */
    setPerformanceTracking(enabled: boolean): void {
        this.performanceTrackingEnabled = enabled;
        if (this.loggingEnabled) {
            console.log(`📊 Performance tracking ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Active/désactive le logging
     */
    setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        if (enabled) {
            console.log(`📝 Logging ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Obtient l'état du logging
     */
    isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    /**
     * Obtient l'instance du service PowerBI (pour usage direct)
     */
    getServiceInstance(): service.Service {
        return this.serviceInstance;
    }

    /**
     * Enregistre une instance embed directement (pour les composants qui créent leurs propres embeds)
     */
    registerEmbedInstance(containerId: string, type: 'report' | 'dashboard' | 'tile', instance: Report | Dashboard | Tile, container: HTMLElement, config: any): void {
        this.embeddedInstances.set(containerId, {
            id: containerId,
            type,
            instance,
            container,
            config
        });
        
        if (this.loggingEnabled) {
            console.log(`📝 Registered ${type} instance: ${containerId}`);
        }
    }

    /**
     * Désenregistre une instance embed
     */
    unregisterEmbedInstance(containerId: string): void {
        if (this.embeddedInstances.has(containerId)) {
            this.embeddedInstances.delete(containerId);
            
            if (this.loggingEnabled) {
                console.log(`🗑️ Unregistered embed instance: ${containerId}`);
            }
        }
    }

    /**
     * Ajoute un listener pour les événements de performance
     */
    addPerformanceEventListener(containerId: string, callback: (event: any) => void): void {
        performanceTracker.addEventListener(containerId, callback);
    }

    /**
     * Supprime un listener d'événements de performance
     */
    removePerformanceEventListener(containerId: string, callback: Function): void {
        performanceTracker.removeEventListener(containerId, callback);
    }
}

// Export de l'instance singleton
export const powerBIService = PowerBIService.getInstance();

// Export du type pour TypeScript
export type { PowerBIServiceConfig, EmbedInstance };
