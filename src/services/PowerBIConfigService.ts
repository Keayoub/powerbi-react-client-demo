/**
 * Service de configuration Power BI pour résoudre les erreurs de configuration
 * Remplace les appels 404 vers des endpoints inexistants
 */

export interface PowerBIConfiguration {
    reportId: string;
    groupId?: string;
    embedUrl: string;
    datasetId?: string;
    settings?: {
        filterPaneEnabled?: boolean;
        navContentPaneEnabled?: boolean;
        background?: number;
        layoutType?: number;
    };
}

export interface PowerBIReport {
    id: string;
    name: string;
    embedUrl: string;
    datasetId: string;
    groupId?: string;
}

export class PowerBIConfigService {
    private static instance: PowerBIConfigService;
    private configurations: Map<string, PowerBIConfiguration> = new Map();
    private reports: PowerBIReport[] = [];
    private loggingEnabled = false;

    private constructor() {
        this.initializeDefaultConfigurations();
    }

    /**
     * Obtient l'instance singleton
     */
    static getInstance(): PowerBIConfigService {
        if (!PowerBIConfigService.instance) {
            PowerBIConfigService.instance = new PowerBIConfigService();
        }
        return PowerBIConfigService.instance;
    }

    /**
     * Active/désactive le logging
     */
    setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
    }

    /**
     * Initialise les configurations par défaut pour éviter les erreurs 404
     */
    private initializeDefaultConfigurations(): void {
        // Configuration exemple pour les rapports de démonstration
        const defaultConfigs: PowerBIConfiguration[] = [
            {
                reportId: 'sample-report-1',
                embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-report-1',
                settings: {
                    filterPaneEnabled: false,
                    navContentPaneEnabled: false,
                    background: 2, // Transparent
                    layoutType: 0 // Custom
                }
            },
            {
                reportId: 'sample-report-2',
                embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-report-2',
                settings: {
                    filterPaneEnabled: true,
                    navContentPaneEnabled: true,
                    background: 0, // Default
                    layoutType: 1 // Mobile
                }
            },
            {
                reportId: 'sample-dashboard-1',
                embedUrl: 'https://app.powerbi.com/dashboardEmbed?dashboardId=sample-dashboard-1',
                settings: {
                    background: 2
                }
            }
        ];

        defaultConfigs.forEach(config => {
            this.configurations.set(config.reportId, config);
        });

        // Rapports exemples
        this.reports = [
            {
                id: 'sample-report-1',
                name: 'Sales Report',
                embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-report-1',
                datasetId: 'sample-dataset-1'
            },
            {
                id: 'sample-report-2',
                name: 'Marketing Dashboard',
                embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-report-2',
                datasetId: 'sample-dataset-2'
            },
            {
                id: 'sample-report-3',
                name: 'Financial Analysis',
                embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-report-3',
                datasetId: 'sample-dataset-3'
            }
        ];

        if (this.loggingEnabled) {
            console.log('⚙️ Configurations par défaut initialisées:', this.configurations.size);
        }
    }

    /**
     * Obtient une configuration par ID (remplace l'appel API qui échoue)
     */
    getConfiguration(reportId: string): PowerBIConfiguration | null {
        const config = this.configurations.get(reportId);
        
        if (this.loggingEnabled) {
            if (config) {
                console.log(`⚙️ Configuration trouvée pour ${reportId}:`, config);
            } else {
                console.warn(`⚠️ Aucune configuration trouvée pour ${reportId}`);
            }
        }

        return config || null;
    }

    /**
     * Ajoute ou met à jour une configuration
     */
    setConfiguration(reportId: string, config: PowerBIConfiguration): void {
        this.configurations.set(reportId, config);
        
        if (this.loggingEnabled) {
            console.log(`⚙️ Configuration mise à jour pour ${reportId}:`, config);
        }
    }

    /**
     * Obtient toutes les configurations disponibles
     */
    getAllConfigurations(): PowerBIConfiguration[] {
        return Array.from(this.configurations.values());
    }

    /**
     * Obtient la liste des rapports disponibles
     */
    getAvailableReports(): PowerBIReport[] {
        if (this.loggingEnabled) {
            console.log('📊 Rapports disponibles:', this.reports.length);
        }
        return [...this.reports];
    }

    /**
     * Ajoute un rapport à la liste
     */
    addReport(report: PowerBIReport): void {
        this.reports.push(report);
        
        if (this.loggingEnabled) {
            console.log('📊 Rapport ajouté:', report);
        }
    }

    /**
     * Charge les configurations depuis un environnement (remplace l'API call)
     */
    async loadConfigurationsFromEnvironment(): Promise<void> {
        try {
            // En mode développement, utiliser les configurations par défaut
            if (process.env.NODE_ENV === 'development') {
                if (this.loggingEnabled) {
                    console.log('⚙️ Mode développement: utilisation des configurations par défaut');
                }
                return;
            }

            // En production, vous pouvez implémenter le chargement depuis votre API
            await this.loadConfigurationsFromAPI();
            
        } catch (error) {
            if (this.loggingEnabled) {
                console.error('❌ Erreur lors du chargement des configurations:', error);
            }
            
            // Fallback sur les configurations par défaut
            console.warn('⚠️ Utilisation des configurations par défaut en cas d\'erreur');
        }
    }

    /**
     * Charge les configurations depuis votre API (à implémenter)
     */
    private async loadConfigurationsFromAPI(): Promise<void> {
        // Remplacez cette URL par votre vraie API
        const apiUrl = '/api/powerbi/configurations';
        
        try {
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Traiter les données de l'API
            if (data.configurations && Array.isArray(data.configurations)) {
                data.configurations.forEach((config: PowerBIConfiguration) => {
                    this.setConfiguration(config.reportId, config);
                });
            }

            if (data.reports && Array.isArray(data.reports)) {
                this.reports = data.reports;
            }

            if (this.loggingEnabled) {
                console.log('⚙️ Configurations chargées depuis l\'API');
            }
            
        } catch (error) {
            if (this.loggingEnabled) {
                console.error('❌ Erreur API configurations:', error);
            }
            throw error;
        }
    }

    /**
     * Génère une configuration par défaut pour un rapport inexistant
     */
    generateDefaultConfiguration(reportId: string): PowerBIConfiguration {
        const config: PowerBIConfiguration = {
            reportId,
            embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}`,
            settings: {
                filterPaneEnabled: false,
                navContentPaneEnabled: false,
                background: 2, // Transparent
                layoutType: 0 // Custom
            }
        };

        // Sauvegarder la configuration générée
        this.setConfiguration(reportId, config);

        if (this.loggingEnabled) {
            console.log(`⚙️ Configuration par défaut générée pour ${reportId}`);
        }

        return config;
    }

    /**
     * Valide une configuration
     */
    validateConfiguration(config: PowerBIConfiguration): boolean {
        const isValid = !!(
            config.reportId &&
            config.embedUrl &&
            config.embedUrl.includes('powerbi.com')
        );

        if (this.loggingEnabled && !isValid) {
            console.error('❌ Configuration invalide:', config);
        }

        return isValid;
    }

    /**
     * Efface toutes les configurations (pour les tests)
     */
    clearConfigurations(): void {
        this.configurations.clear();
        this.reports = [];
        
        if (this.loggingEnabled) {
            console.log('🗑️ Toutes les configurations effacées');
        }
    }

    /**
     * Exporte les configurations pour debug/backup
     */
    exportConfigurations(): string {
        const exportData = {
            configurations: Object.fromEntries(this.configurations),
            reports: this.reports,
            timestamp: new Date().toISOString()
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Importe des configurations depuis JSON
     */
    importConfigurations(jsonData: string): void {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.configurations) {
                Object.entries(data.configurations).forEach(([id, config]) => {
                    this.configurations.set(id, config as PowerBIConfiguration);
                });
            }

            if (data.reports && Array.isArray(data.reports)) {
                this.reports = data.reports;
            }

            if (this.loggingEnabled) {
                console.log('📥 Configurations importées avec succès');
            }
            
        } catch (error) {
            if (this.loggingEnabled) {
                console.error('❌ Erreur lors de l\'import:', error);
            }
            throw error;
        }
    }
}

// Instance singleton exportée
export const powerBIConfigService = PowerBIConfigService.getInstance();

export default powerBIConfigService;
