/**
 * Exemple d'utilisation Power BI optimisé pour MPA (Multi-Page Application)
 * Démontre la persistance entre les rechargements de page
 */

import React, { useState, useRef, useEffect } from 'react';
import { models } from 'powerbi-client';
import { usePowerBIMPA } from '../hooks/usePowerBIMPA';

interface MPAExampleProps {
    onEvent?: (eventName: string, eventData: any) => void;
}

export const MPAExample: React.FC<MPAExampleProps> = ({ onEvent }) => {
    const [reportConfig, setReportConfig] = useState({
        reportId: 'sample-report-mpa-1',
        embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-report-mpa-1',
        accessToken: 'demo-token-mpa'
    });

    const [dashboardConfig, setDashboardConfig] = useState({
        dashboardId: 'sample-dashboard-mpa-1',
        embedUrl: 'https://app.powerbi.com/dashboardEmbed?dashboardId=sample-dashboard-mpa-1'
    });

    const [embedLog, setEmbedLog] = useState<string[]>([]);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const reportContainerRef = useRef<HTMLDivElement>(null);
    const dashboardContainerRef = useRef<HTMLDivElement>(null);

    const {
        embedReport,
        embedDashboard,
        initializeService,
        updateAccessToken,
        removeInstance,
        clearPersistence,
        isInitialized,
        isLoading,
        error,
        stats,
        getGlobalPerformanceStats,
        clearError,
        retryInitialization
    } = usePowerBIMPA({
        enableLogging: true,
        trackPerformance: true,
        persistenceKey: 'powerbi-mpa-demo',
        maxInstanceAge: 15 * 60 * 1000 // 15 minutes
    });

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setEmbedLog(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    /**
     * Initialise le service MPA
     */
    const handleInitialize = async () => {
        try {
            addLog('🔧 Initialisation du service MPA...');
            
            await initializeService({
                accessToken: reportConfig.accessToken,
                enableLogging: true,
                enablePerformanceTracking: true,
                autoRefreshToken: true,
                persistenceKey: 'powerbi-mpa-demo',
                settings: {
                    background: models.BackgroundType.Transparent,
                    filterPaneEnabled: false,
                    navContentPaneEnabled: false
                }
            });

            addLog('✅ Service MPA initialisé avec succès');
        } catch (err) {
            addLog(`❌ Erreur initialisation: ${err}`);
        }
    };

    /**
     * Embed un rapport
     */
    const handleEmbedReport = async () => {
        if (!reportContainerRef.current || !isInitialized) return;

        try {
            addLog('📊 Embedding rapport en mode MPA...');

            const config: models.IReportEmbedConfiguration = {
                type: 'report',
                id: reportConfig.reportId,
                embedUrl: reportConfig.embedUrl,
                accessToken: reportConfig.accessToken,
                tokenType: models.TokenType.Embed,
                settings: {
                    background: models.BackgroundType.Transparent,
                    filterPaneEnabled: false,
                    navContentPaneEnabled: false,
                    layoutType: models.LayoutType.Custom,
                    customLayout: {
                        displayOption: models.DisplayOption.FitToPage
                    }
                }
            };

            await embedReport(reportContainerRef.current, config, `report-container-${reportConfig.reportId}`);
            addLog(`✅ Rapport embedé: ${reportConfig.reportId}`);
            onEvent?.('mpa-report-embedded', { reportId: reportConfig.reportId, success: true });

        } catch (err) {
            addLog(`❌ Erreur embedding rapport: ${err}`);
            onEvent?.('mpa-report-error', { reportId: reportConfig.reportId, error: err });
        }
    };

    /**
     * Embed un dashboard
     */
    const handleEmbedDashboard = async () => {
        if (!dashboardContainerRef.current || !isInitialized) return;

        try {
            addLog('📈 Embedding dashboard en mode MPA...');

            const config: models.IDashboardEmbedConfiguration = {
                type: 'dashboard',
                id: dashboardConfig.dashboardId,
                embedUrl: dashboardConfig.embedUrl,
                accessToken: reportConfig.accessToken,
                tokenType: models.TokenType.Embed
            };

            await embedDashboard(dashboardContainerRef.current, config, `dashboard-container-${dashboardConfig.dashboardId}`);
            addLog(`✅ Dashboard embedé: ${dashboardConfig.dashboardId}`);

        } catch (err) {
            addLog(`❌ Erreur embedding dashboard: ${err}`);
        }
    };

    /**
     * Simule un rechargement de page
     */
    const handleSimulatePageReload = () => {
        addLog('🔄 Simulation rechargement de page...');
        window.location.reload();
    };

    /**
     * Met à jour le token
     */
    const handleUpdateToken = async () => {
        try {
            const newToken = `demo-token-${Date.now()}`;
            await updateAccessToken(newToken);
            setReportConfig(prev => ({ ...prev, accessToken: newToken }));
            addLog(`🔑 Token mis à jour: ${newToken.slice(-10)}`);
        } catch (err) {
            addLog(`❌ Erreur mise à jour token: ${err}`);
        }
    };

    /**
     * Supprime les instances
     */
    const handleRemoveInstances = () => {
        stats.instanceIds.forEach((id: string) => {
            removeInstance(id);
            addLog(`🗑️ Instance supprimée: ${id}`);
        });
    };

    /**
     * Efface la persistance
     */
    const handleClearPersistence = () => {
        clearPersistence();
        addLog('🧹 Persistance MPA effacée');
    };

    /**
     * Initialisation automatique
     */
    useEffect(() => {
        if (!isInitialized && !isLoading && !error) {
            handleInitialize();
        }
    }, [isInitialized, isLoading, error]);

    /**
     * Log des changements de stats
     */
    useEffect(() => {
        if (isInitialized) {
            addLog(`📊 Stats: ${stats.totalInstances} instances, ${stats.persistedInstances} persistées`);
        }
    }, [stats, isInitialized]);

    const performanceStats = getGlobalPerformanceStats();

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <div style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                border: '1px solid #dee2e6'
            }}>
                <h2 style={{ margin: '0 0 15px 0', color: '#343a40' }}>
                    🔄 Power BI MPA (Multi-Page Application) Demo
                </h2>
                <p style={{ margin: '0', color: '#6c757d' }}>
                    Démontre la persistance Power BI entre les rechargements de page
                </p>
            </div>

            {/* État du service */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{
                    background: isInitialized ? '#d4edda' : (isLoading ? '#fff3cd' : '#f8d7da'),
                    padding: '15px',
                    borderRadius: '6px',
                    border: `1px solid ${isInitialized ? '#c3e6cb' : (isLoading ? '#ffeaa7' : '#f5c6cb')}`,
                    flex: '1',
                    minWidth: '200px'
                }}>
                    <h4 style={{ margin: '0 0 10px 0' }}>État du Service</h4>
                    <div style={{ fontSize: '14px' }}>
                        <p>Status: {isLoading ? '⏳ Chargement...' : (isInitialized ? '✅ Initialisé' : '❌ Non initialisé')}</p>
                        <p>Instances: {stats.totalInstances} actives, {stats.persistedInstances} persistées</p>
                        <p>Types: {Object.entries(stats.instancesByType).map(([type, count]) => `${type}: ${count}`).join(', ') || 'Aucun'}</p>
                    </div>
                </div>

                {performanceStats.totalReports > 0 && (
                    <div style={{
                        background: '#e3f2fd',
                        padding: '15px',
                        borderRadius: '6px',
                        border: '1px solid #bbdefb',
                        flex: '1',
                        minWidth: '200px'
                    }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Performance</h4>
                        <div style={{ fontSize: '14px' }}>
                            <p>Rapports: {performanceStats.totalReports}</p>
                            <p>Temps moyen: {Math.round(performanceStats.averageLoadTime)}ms</p>
                            <p>Interactions: {performanceStats.totalInteractions}</p>
                            <p>Erreurs: {performanceStats.totalErrors}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Gestion d'erreurs */}
            {error && (
                <div style={{
                    background: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '6px',
                    padding: '15px',
                    marginBottom: '20px',
                    color: '#721c24'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <strong>❌ Erreur:</strong>
                            <div style={{ marginTop: '5px' }}>{error}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={retryInitialization}
                                style={{
                                    background: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                🔄 Réessayer
                            </button>
                            <button
                                onClick={clearError}
                                style={{
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                ✕ Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Configuration */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
                marginBottom: '20px'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>⚙️ Configuration MPA</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Report ID:
                        </label>
                        <input
                            type="text"
                            value={reportConfig.reportId}
                            onChange={(e) => setReportConfig(prev => ({ ...prev, reportId: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                            Dashboard ID:
                        </label>
                        <input
                            type="text"
                            value={dashboardConfig.dashboardId}
                            onChange={(e) => setDashboardConfig(prev => ({ ...prev, dashboardId: e.target.value }))}
                            style={{
                                width: '100%',
                                padding: '8px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Access Token:
                    </label>
                    <input
                        type="text"
                        value={reportConfig.accessToken}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ced4da',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    {showAdvanced ? '🔼 Masquer' : '🔽 Avancé'}
                </button>

                {showAdvanced && (
                    <div style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Embed URL (Rapport):
                            </label>
                            <input
                                type="text"
                                value={reportConfig.embedUrl}
                                onChange={(e) => setReportConfig(prev => ({ ...prev, embedUrl: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px'
                                }}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                Embed URL (Dashboard):
                            </label>
                            <input
                                type="text"
                                value={dashboardConfig.embedUrl}
                                onChange={(e) => setDashboardConfig(prev => ({ ...prev, embedUrl: e.target.value }))}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px'
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
                marginBottom: '20px'
            }}>
                <h3 style={{ margin: '0 0 15px 0' }}>🎮 Actions MPA</h3>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleInitialize}
                        disabled={isInitialized || isLoading}
                        style={{
                            background: isInitialized ? '#6c757d' : '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            cursor: isInitialized || isLoading ? 'not-allowed' : 'pointer',
                            opacity: isInitialized || isLoading ? 0.6 : 1
                        }}
                    >
                        🔧 Initialiser Service
                    </button>

                    <button
                        onClick={handleEmbedReport}
                        disabled={!isInitialized}
                        style={{
                            background: !isInitialized ? '#6c757d' : '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            cursor: !isInitialized ? 'not-allowed' : 'pointer',
                            opacity: !isInitialized ? 0.6 : 1
                        }}
                    >
                        📊 Embed Rapport
                    </button>

                    <button
                        onClick={handleEmbedDashboard}
                        disabled={!isInitialized}
                        style={{
                            background: !isInitialized ? '#6c757d' : '#17a2b8',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            cursor: !isInitialized ? 'not-allowed' : 'pointer',
                            opacity: !isInitialized ? 0.6 : 1
                        }}
                    >
                        📈 Embed Dashboard
                    </button>

                    <button
                        onClick={handleUpdateToken}
                        disabled={!isInitialized}
                        style={{
                            background: !isInitialized ? '#6c757d' : '#ffc107',
                            color: !isInitialized ? 'white' : 'black',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            cursor: !isInitialized ? 'not-allowed' : 'pointer',
                            opacity: !isInitialized ? 0.6 : 1
                        }}
                    >
                        🔑 Nouveau Token
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={handleSimulatePageReload}
                        style={{
                            background: '#fd7e14',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🔄 Simuler Rechargement
                    </button>

                    <button
                        onClick={handleRemoveInstances}
                        disabled={stats.totalInstances === 0}
                        style={{
                            background: stats.totalInstances === 0 ? '#6c757d' : '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            cursor: stats.totalInstances === 0 ? 'not-allowed' : 'pointer',
                            opacity: stats.totalInstances === 0 ? 0.6 : 1
                        }}
                    >
                        🗑️ Supprimer Instances
                    </button>

                    <button
                        onClick={handleClearPersistence}
                        style={{
                            background: '#6f42c1',
                            color: 'white',
                            border: 'none',
                            padding: '10px 15px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        🧹 Effacer Persistance
                    </button>
                </div>
            </div>

            {/* Containers d'embedding */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{
                    background: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '15px',
                        background: '#f8f9fa',
                        borderBottom: '1px solid #dee2e6',
                        fontWeight: 'bold'
                    }}>
                        📊 Rapport Power BI (MPA)
                    </div>
                    <div
                        ref={reportContainerRef}
                        style={{
                            height: '400px',
                            background: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6c757d'
                        }}
                    >
                        {!isInitialized ? (
                            'Service non initialisé'
                        ) : (
                            'Cliquez sur "Embed Rapport" pour afficher le contenu'
                        )}
                    </div>
                </div>

                <div style={{
                    background: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        padding: '15px',
                        background: '#f8f9fa',
                        borderBottom: '1px solid #dee2e6',
                        fontWeight: 'bold'
                    }}>
                        📈 Dashboard Power BI (MPA)
                    </div>
                    <div
                        ref={dashboardContainerRef}
                        style={{
                            height: '400px',
                            background: '#f8f9fa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6c757d'
                        }}
                    >
                        {!isInitialized ? (
                            'Service non initialisé'
                        ) : (
                            'Cliquez sur "Embed Dashboard" pour afficher le contenu'
                        )}
                    </div>
                </div>
            </div>

            {/* Log des actions */}
            <div style={{
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                padding: '20px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0 }}>📋 Log des Actions MPA</h3>
                    <button
                        onClick={() => setEmbedLog([])}
                        style={{
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        🧹 Effacer
                    </button>
                </div>
                
                <div style={{
                    background: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    padding: '15px',
                    height: '200px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '13px'
                }}>
                    {embedLog.length === 0 ? (
                        <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
                            Aucune action effectuée
                        </div>
                    ) : (
                        embedLog.map((log, index) => (
                            <div key={index} style={{ marginBottom: '5px' }}>
                                {log}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Info MPA */}
            <div style={{
                background: '#e3f2fd',
                border: '1px solid #bbdefb',
                borderRadius: '6px',
                padding: '15px',
                marginTop: '20px'
            }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
                    💡 À propos du mode MPA
                </h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1565c0' }}>
                    <li>Les instances Power BI persistent entre les rechargements de page</li>
                    <li>Les tokens sont automatiquement sauvegardés en sessionStorage</li>
                    <li>La configuration du service est stockée en localStorage</li>
                    <li>Le nettoyage automatique supprime les instances anciennes</li>
                    <li>Les métriques de performance sont trackées par session</li>
                </ul>
            </div>
        </div>
    );
};

export default MPAExample;
