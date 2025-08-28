// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { models } from 'powerbi-client';

export interface OptimizedEmbedConfig {
    type: 'report' | 'dashboard' | 'tile' | 'visual';
    id: string;
    embedUrl: string;
    accessToken: string;
    settings?: models.ISettings;
    pageView?: models.PageView;
    datasetBinding?: models.IDatasetBinding;
}

export class OptimizedPowerBIConfig {
    /**
     * Crée une configuration optimisée pour architecture multi-SPA
     * - Pas de bootstrap (config directe)
     * - Settings optimisés pour performance
     * - Gestion d'erreurs renforcée
     */
    static createOptimizedConfig(
        reportId: string,
        embedUrl: string,
        accessToken: string,
        options?: {
            enableExport?: boolean;
            enablePrint?: boolean;
            enableFullscreen?: boolean;
            hideFilters?: boolean;
            hidePageNavigation?: boolean;
            autoSave?: boolean;
        }
    ): models.IReportEmbedConfiguration {
        
        const defaultOptions = {
            enableExport: true,
            enablePrint: true,
            enableFullscreen: true,
            hideFilters: false,
            hidePageNavigation: false,
            autoSave: false,
            ...options
        };

        return {
            type: 'report',
            id: reportId,
            embedUrl: embedUrl,
            accessToken: accessToken,
            tokenType: models.TokenType.Embed,
            
            // Settings optimisés pour multi-SPA
            settings: {
                // Performance optimizations
                background: models.BackgroundType.Transparent,
                
                // UI optimizations pour votre contexte
                panes: {
                    filters: {
                        expanded: !defaultOptions.hideFilters,
                        visible: !defaultOptions.hideFilters
                    },
                    pageNavigation: {
                        visible: !defaultOptions.hidePageNavigation
                    }
                },
                
                // Toolbar optimizations
                bars: {
                    statusBar: { visible: false }, // Pas nécessaire dans embed
                    actionBar: { 
                        visible: true
                    }
                },
                
                // Layout optimizations
                layoutType: models.LayoutType.Custom,
                customLayout: {
                    displayOption: models.DisplayOption.FitToPage
                }
            },
            
            // Permissions optimisées
            permissions: models.Permissions.All,
            
            // View mode selon le contexte
            viewMode: models.ViewMode.View,
            
            // Pas de bootstrap - tout configuré d'emblée
            datasetBinding: undefined // Pas de binding dynamique
        };
    }

    /**
     * Configuration spéciale pour visuals individuels
     */
    static createVisualConfig(
        reportId: string,
        embedUrl: string,
        accessToken: string,
        visualName: string,
        pageName?: string
    ): models.IVisualEmbedConfiguration {
        return {
            type: 'visual',
            id: visualName,
            visualName: visualName,
            embedUrl: `${embedUrl}&pageName=${pageName}&visualName=${visualName}`,
            accessToken: accessToken,
            tokenType: models.TokenType.Embed,
            
            settings: {
                background: models.BackgroundType.Transparent,
                
                // Minimal UI pour visuals
                panes: {
                    filters: { visible: false },
                    pageNavigation: { visible: false }
                },
                
                bars: {
                    statusBar: { visible: false },
                    actionBar: { visible: false }
                }
            }
        };
    }

    /**
     * Configuration pour dashboards
     */
    static createDashboardConfig(
        dashboardId: string,
        embedUrl: string,
        accessToken: string,
        options?: {
            enableTileDetails?: boolean;
            enableFiltering?: boolean;
        }
    ): models.IDashboardEmbedConfiguration {
        const defaultOptions = {
            enableTileDetails: true,
            enableFiltering: true,
            ...options
        };

        return {
            type: 'dashboard',
            id: dashboardId,
            embedUrl: embedUrl,
            accessToken: accessToken,
            tokenType: models.TokenType.Embed,
            
            settings: {
                background: models.BackgroundType.Transparent,
                
                panes: {
                    filters: {
                        visible: defaultOptions.enableFiltering
                    }
                },
                
                bars: {
                    statusBar: { visible: false },
                    actionBar: { visible: false }
                }
            },
            
            permissions: models.Permissions.Read
        };
    }

    /**
     * Configuration pour tiles individuels
     */
    static createTileConfig(
        dashboardId: string,
        tileId: string,
        embedUrl: string,
        accessToken: string
    ): models.ITileEmbedConfiguration {
        return {
            type: 'tile',
            id: tileId,
            embedUrl: embedUrl,
            accessToken: accessToken,
            tokenType: models.TokenType.Embed,
            dashboardId: dashboardId,
            
            settings: {
                background: models.BackgroundType.Transparent,
                
                // Minimal UI pour tiles
                panes: {
                    filters: { visible: false },
                    pageNavigation: { visible: false }
                },
                
                bars: {
                    statusBar: { visible: false },
                    actionBar: { visible: false }
                }
            }
        };
    }
}
