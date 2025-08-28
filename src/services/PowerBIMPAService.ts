/**
 * Service Power BI optimisé pour Multi-Page Application (MPA)
 * Gère la persistance entre les rechargements de page
 */

import { service, factories, models, Report, Dashboard, Tile } from 'powerbi-client';
import { performanceTracker, PerformanceMetrics } from './PowerBIPerformanceTracker';
import { powerBIAuthService } from './PowerBIAuthService';
import { powerBIConfigService } from './PowerBIConfigService';

interface PowerBIMPAConfig {
    accessToken?: string;
    tokenType?: models.TokenType;
    settings?: models.ISettings;
    enablePerformanceTracking?: boolean;
    enableLogging?: boolean;
    autoRefreshToken?: boolean;
    persistenceKey?: string; // Clé pour la persistance entre pages
}

interface EmbeddedInstanceData {
    id: string;
    type: 'report' | 'dashboard' | 'tile';
    config: any;
    containerId: string;
    timestamp: number;
}

export class PowerBIMPAService {
    private static instance: PowerBIMPAService;
    private serviceInstance: service.Service;
    private globalConfig: PowerBIMPAConfig | null = null;
    private initialized = false;
    private performanceTrackingEnabled = true;
    private loggingEnabled = true;
    private persistenceKey = 'powerbi-mpa-service';
    private embeddedInstances: Map<string, { 
        instance: Report | Dashboard | Tile; 
        data: EmbeddedInstanceData;
        lastUsed: number;
    }> = new Map();

    private constructor() {
        // Initialiser le service Power BI avec les factories
        this.serviceInstance = new service.Service(
            factories.hpmFactory,
            factories.wpmpFactory,
            factories.routerFactory
        );

        // Restaurer l'état depuis la persistance MPA
        this.restoreFromPersistence();
    }

    /**
     * Obtient l'instance singleton (optimisée pour MPA)
     */
    static getInstance(): PowerBIMPAService {
        if (!PowerBIMPAService.instance) {
            PowerBIMPAService.instance = new PowerBIMPAService();
        }
        return PowerBIMPAService.instance;
    }

    /**
     * Initialise le service pour MPA
     */
    async initialize(config: PowerBIMPAConfig): Promise<void> {
        this.globalConfig = config;
        this.persistenceKey = config.persistenceKey || 'powerbi-mpa-service';
        this.performanceTrackingEnabled = config.enablePerformanceTracking ?? true;
        this.loggingEnabled = config.enableLogging ?? true;

        // Configurer les services d'authentification et de configuration
        powerBIAuthService.setLogging(this.loggingEnabled);
        powerBIConfigService.setLogging(this.loggingEnabled);

        // Charger les configurations
        await powerBIConfigService.loadConfigurationsFromEnvironment();

        // Gérer l'authentification pour MPA
        await this.handleMPAAuthentication(config);

        // Sauvegarder la configuration
        this.saveConfigToPersistence();

        this.initialized = true;

        if (this.loggingEnabled) {
            console.log('🔧 PowerBI MPA Service initialized', {
                performanceTracking: this.performanceTrackingEnabled,
                logging: this.loggingEnabled,
                persistenceKey: this.persistenceKey,
                hasToken: !!this.globalConfig.accessToken
            });
        }
    }

    /**
     * Gère l'authentification spécifique au mode MPA
     */
    private async handleMPAAuthentication(config: PowerBIMPAConfig): Promise<void> {
        // Vérifier si un token est stocké dans la persistance
        const persistedToken = this.getPersistedToken();
        
        if (persistedToken && powerBIAuthService.isTokenValid()) {
            this.globalConfig!.accessToken = persistedToken;
            if (this.loggingEnabled) {
                console.log('🔑 Token récupéré depuis la persistance MPA');
            }
            return;
        }

        // Si token fourni dans la config
        if (config.accessToken) {
            powerBIAuthService.setToken(config.accessToken, 3600);
            this.saveTokenToPersistence(config.accessToken);
            if (this.loggingEnabled) {
                console.log('🔑 Token fourni dans la configuration MPA');
            }
            return;
        }

        // Essayer d'obtenir un token automatiquement
        if (config.autoRefreshToken !== false) {
            try {
                const token = await powerBIAuthService.getValidToken();
                this.globalConfig!.accessToken = token;
                this.saveTokenToPersistence(token);
                if (this.loggingEnabled) {
                    console.log('🔑 Token obtenu automatiquement pour MPA');
                }
            } catch (error) {
                if (this.loggingEnabled) {
                    console.warn('⚠️ Impossible d\'obtenir un token automatiquement en mode MPA:', error);
                }
            }
        }
    }

    /**
     * Embed un rapport en mode MPA avec persistance
     */
    async embedReport(
        containerId: string,
        container: HTMLElement,
        config: models.IReportEmbedConfiguration
    ): Promise<Report> {
        if (!this.isInitialized()) {
            throw new Error('PowerBI MPA Service must be initialized before embedding');
        }

        // Vérifier si une instance existe déjà (peut être restaurée depuis une autre page)
        const existingInstance = this.getPersistedInstance(containerId);
        if (existingInstance && this.embeddedInstances.has(containerId)) {
            if (this.loggingEnabled) {
                console.log(`♻️ Reusing existing MPA report instance for ${containerId}`);
            }
            this.updateInstanceUsage(containerId);
            return this.embeddedInstances.get(containerId)!.instance as Report;
        }

        // Démarrer le tracking des performances
        if (this.performanceTrackingEnabled) {
            performanceTracker.startTracking(config.id || containerId, containerId);
            performanceTracker.recordEvent(containerId, 'loadStarted');
        }

        try {
            // Obtenir la configuration complète
            const storedConfig = powerBIConfigService.getConfiguration(config.id || containerId);
            
            // Vérifier et rafraîchir le token si nécessaire
            let accessToken = await this.ensureValidToken();

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

            // Utiliser le service pour embed
            const report = this.serviceInstance.embed(container, embedConfig) as Report;

            // Stocker l'instance avec persistance MPA
            const instanceData: EmbeddedInstanceData = {
                id: config.id || containerId,
                type: 'report',
                config: embedConfig,
                containerId,
                timestamp: Date.now()
            };

            this.embeddedInstances.set(containerId, {
                instance: report,
                data: instanceData,
                lastUsed: Date.now()
            });

            // Sauvegarder dans la persistance MPA
            this.saveInstanceToPersistence(containerId, instanceData);

            // Attacher les événements pour le tracking
            if (this.performanceTrackingEnabled) {
                this.attachPerformanceListeners(report, containerId);
            }

            if (this.loggingEnabled) {
                console.log(`✅ Report embedded successfully in MPA mode: ${containerId}`);
            }

            return report;

        } catch (error) {
            if (this.loggingEnabled) {
                console.error(`❌ Error embedding report in MPA mode: ${containerId}`, error);
            }
            
            if (this.performanceTrackingEnabled) {
                performanceTracker.recordEvent(containerId, 'error', { error: error });
            }
            
            throw error;
        }
    }

    /**
     * Embed un dashboard en mode MPA
     */
    async embedDashboard(
        containerId: string,
        container: HTMLElement,
        config: models.IDashboardEmbedConfiguration
    ): Promise<Dashboard> {
        if (!this.isInitialized()) {
            throw new Error('PowerBI MPA Service must be initialized before embedding');
        }

        // Logique similaire à embedReport mais pour dashboard
        const existingInstance = this.getPersistedInstance(containerId);
        if (existingInstance && this.embeddedInstances.has(containerId)) {
            if (this.loggingEnabled) {
                console.log(`♻️ Reusing existing MPA dashboard instance for ${containerId}`);
            }
            this.updateInstanceUsage(containerId);
            return this.embeddedInstances.get(containerId)!.instance as Dashboard;
        }

        try {
            let accessToken = await this.ensureValidToken();

            const embedConfig: models.IDashboardEmbedConfiguration = {
                ...config,
                accessToken,
                tokenType: this.globalConfig!.tokenType || models.TokenType.Embed
            };

            const dashboard = this.serviceInstance.embed(container, embedConfig) as Dashboard;

            const instanceData: EmbeddedInstanceData = {
                id: config.id || containerId,
                type: 'dashboard',
                config: embedConfig,
                containerId,
                timestamp: Date.now()
            };

            this.embeddedInstances.set(containerId, {
                instance: dashboard,
                data: instanceData,
                lastUsed: Date.now()
            });

            this.saveInstanceToPersistence(containerId, instanceData);

            if (this.loggingEnabled) {
                console.log(`✅ Dashboard embedded successfully in MPA mode: ${containerId}`);
            }

            return dashboard;

        } catch (error) {
            if (this.loggingEnabled) {
                console.error(`❌ Error embedding dashboard in MPA mode: ${containerId}`, error);
            }
            throw error;
        }
    }

    /**
     * S'assure qu'un token valide est disponible
     */
    private async ensureValidToken(): Promise<string> {
        let accessToken = this.globalConfig!.accessToken;
        
        if (!accessToken || !powerBIAuthService.isTokenValid()) {
            try {
                accessToken = await powerBIAuthService.refreshToken();
                this.globalConfig!.accessToken = accessToken;
                this.saveTokenToPersistence(accessToken);
                
                if (this.loggingEnabled) {
                    console.log('🔄 Token rafraîchi pour MPA');
                }
            } catch (tokenError) {
                if (this.loggingEnabled) {
                    console.error('❌ Erreur lors du rafraîchissement du token MPA:', tokenError);
                }
                throw new Error('Token invalide et impossible à rafraîchir en mode MPA');
            }
        }

        return accessToken;
    }

    /**
     * Sauvegarde la configuration dans la persistance MPA
     */
    private saveConfigToPersistence(): void {
        try {
            const configData = {
                config: this.globalConfig,
                timestamp: Date.now(),
                version: '1.0'
            };
            localStorage.setItem(`${this.persistenceKey}-config`, JSON.stringify(configData));
        } catch (error) {
            if (this.loggingEnabled) {
                console.warn('⚠️ Erreur sauvegarde config MPA:', error);
            }
        }
    }

    /**
     * Sauvegarde le token dans la persistance MPA
     */
    private saveTokenToPersistence(token: string): void {
        try {
            const tokenData = {
                token,
                timestamp: Date.now(),
                expiresAt: powerBIAuthService.getTokenInfo().expiresAt
            };
            sessionStorage.setItem(`${this.persistenceKey}-token`, JSON.stringify(tokenData));
        } catch (error) {
            if (this.loggingEnabled) {
                console.warn('⚠️ Erreur sauvegarde token MPA:', error);
            }
        }
    }

    /**
     * Récupère le token depuis la persistance MPA
     */
    private getPersistedToken(): string | null {
        try {
            const tokenDataStr = sessionStorage.getItem(`${this.persistenceKey}-token`);
            if (!tokenDataStr) return null;

            const tokenData = JSON.parse(tokenDataStr);
            
            // Vérifier si le token n'est pas expiré
            if (tokenData.expiresAt) {
                const expiryDate = new Date(tokenData.expiresAt);
                if (expiryDate <= new Date()) {
                    sessionStorage.removeItem(`${this.persistenceKey}-token`);
                    return null;
                }
            }

            return tokenData.token;
        } catch (error) {
            if (this.loggingEnabled) {
                console.warn('⚠️ Erreur récupération token MPA:', error);
            }
            return null;
        }
    }

    /**
     * Sauvegarde une instance dans la persistance MPA
     */
    private saveInstanceToPersistence(containerId: string, instanceData: EmbeddedInstanceData): void {
        try {
            const instances = this.getPersistedInstances();
            instances[containerId] = instanceData;
            
            // Limiter le nombre d'instances sauvegardées (éviter le débordement)
            const instanceKeys = Object.keys(instances);
            if (instanceKeys.length > 10) {
                // Garder seulement les 10 plus récentes
                const sortedKeys = instanceKeys.sort((a, b) => instances[b].timestamp - instances[a].timestamp);
                const instancesToKeep = sortedKeys.slice(0, 10);
                const filteredInstances: Record<string, EmbeddedInstanceData> = {};
                instancesToKeep.forEach(key => {
                    filteredInstances[key] = instances[key];
                });
                sessionStorage.setItem(`${this.persistenceKey}-instances`, JSON.stringify(filteredInstances));
            } else {
                sessionStorage.setItem(`${this.persistenceKey}-instances`, JSON.stringify(instances));
            }
        } catch (error) {
            if (this.loggingEnabled) {
                console.warn('⚠️ Erreur sauvegarde instance MPA:', error);
            }
        }
    }

    /**
     * Récupère les instances depuis la persistance MPA
     */
    private getPersistedInstances(): Record<string, EmbeddedInstanceData> {
        try {
            const instancesStr = sessionStorage.getItem(`${this.persistenceKey}-instances`);
            return instancesStr ? JSON.parse(instancesStr) : {};
        } catch (error) {
            if (this.loggingEnabled) {
                console.warn('⚠️ Erreur récupération instances MPA:', error);
            }
            return {};
        }
    }

    /**
     * Récupère une instance spécifique depuis la persistance
     */
    private getPersistedInstance(containerId: string): EmbeddedInstanceData | null {
        const instances = this.getPersistedInstances();
        return instances[containerId] || null;
    }

    /**
     * Restaure l'état depuis la persistance au démarrage
     */
    private restoreFromPersistence(): void {
        try {
            // Restaurer la configuration
            const configStr = localStorage.getItem(`${this.persistenceKey}-config`);
            if (configStr) {
                const configData = JSON.parse(configStr);
                // Vérifier si la config n'est pas trop ancienne (24h max)
                if (Date.now() - configData.timestamp < 24 * 60 * 60 * 1000) {
                    this.globalConfig = configData.config;
                    this.initialized = true;
                    
                    if (this.loggingEnabled) {
                        console.log('🔄 Configuration MPA restaurée depuis la persistance');
                    }
                }
            }

            // Restaurer le token si disponible
            const token = this.getPersistedToken();
            if (token) {
                powerBIAuthService.setToken(token, 3600);
                if (this.globalConfig) {
                    this.globalConfig.accessToken = token;
                }
            }

        } catch (error) {
            if (this.loggingEnabled) {
                console.warn('⚠️ Erreur restauration persistance MPA:', error);
            }
        }
    }

    /**
     * Met à jour l'usage d'une instance
     */
    private updateInstanceUsage(containerId: string): void {
        const instance = this.embeddedInstances.get(containerId);
        if (instance) {
            instance.lastUsed = Date.now();
        }
    }

    /**
     * Nettoie les instances anciennes non utilisées
     */
    cleanupOldInstances(maxAgeMs: number = 30 * 60 * 1000): void { // 30 minutes par défaut
        const now = Date.now();
        const instancesToRemove: string[] = [];

        this.embeddedInstances.forEach((instance, containerId) => {
            if (now - instance.lastUsed > maxAgeMs) {
                instancesToRemove.push(containerId);
            }
        });

        instancesToRemove.forEach(containerId => {
            this.removeInstance(containerId);
        });

        if (this.loggingEnabled && instancesToRemove.length > 0) {
            console.log(`🧹 Nettoyage MPA: ${instancesToRemove.length} instances supprimées`);
        }
    }

    /**
     * Attache les listeners de performance
     */
    private attachPerformanceListeners(embed: Report | Dashboard, containerId: string): void {
        if (!this.performanceTrackingEnabled) return;

        performanceTracker.attachEventListeners(containerId, embed);
    }

    /**
     * Vérifie si le service est initialisé
     */
    isInitialized(): boolean {
        return this.initialized && this.globalConfig !== null;
    }

    /**
     * Met à jour le token d'accès
     */
    async updateAccessToken(newToken: string): Promise<void> {
        if (this.globalConfig) {
            this.globalConfig.accessToken = newToken;
            powerBIAuthService.setToken(newToken, 3600);
            this.saveTokenToPersistence(newToken);
            
            if (this.loggingEnabled) {
                console.log('🔄 Access token updated in MPA service');
            }
        }
    }

    /**
     * Supprime une instance
     */
    removeInstance(containerId: string): boolean {
        const removed = this.embeddedInstances.delete(containerId);
        
        if (removed) {
            // Supprimer aussi de la persistance
            const instances = this.getPersistedInstances();
            delete instances[containerId];
            sessionStorage.setItem(`${this.persistenceKey}-instances`, JSON.stringify(instances));
            
            if (this.loggingEnabled) {
                console.log(`🗑️ Instance MPA supprimée: ${containerId}`);
            }
        }
        
        return removed;
    }

    /**
     * Obtient les statistiques du service MPA
     */
    getStats(): {
        totalInstances: number;
        instancesByType: Record<string, number>;
        instanceIds: string[];
        persistedInstances: number;
        lastCleanup: Date | null;
    } {
        const instancesByType: Record<string, number> = {};
        const instanceIds: string[] = [];

        this.embeddedInstances.forEach((instance, id) => {
            const type = instance.data.type;
            instancesByType[type] = (instancesByType[type] || 0) + 1;
            instanceIds.push(id);
        });

        const persistedInstances = Object.keys(this.getPersistedInstances()).length;

        return {
            totalInstances: this.embeddedInstances.size,
            instancesByType,
            instanceIds,
            persistedInstances,
            lastCleanup: null // Vous pouvez tracker cela si nécessaire
        };
    }

    /**
     * Efface toute la persistance MPA
     */
    clearPersistence(): void {
        try {
            localStorage.removeItem(`${this.persistenceKey}-config`);
            sessionStorage.removeItem(`${this.persistenceKey}-token`);
            sessionStorage.removeItem(`${this.persistenceKey}-instances`);
            
            if (this.loggingEnabled) {
                console.log('🧹 Persistance MPA effacée');
            }
        } catch (error) {
            if (this.loggingEnabled) {
                console.error('❌ Erreur effacement persistance MPA:', error);
            }
        }
    }

    /**
     * Active/désactive le logging
     */
    setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        performanceTracker.setLogging(enabled);
    }

    /**
     * Vérifie si le logging est activé
     */
    isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }
}

// Instance singleton pour MPA
export const powerBIMPAService = PowerBIMPAService.getInstance();

export default powerBIMPAService;
