import React, { useState, useCallback } from 'react';
import { EmbeddedPowerBIContainer } from '../EmbeddedPowerBIContainer';
import { useReportLoadManager } from '../../utils/report-load-manager';

interface MultiReportDemoProps {
    reports: Array<{
        id: string;
        embedUrl: string;
        accessToken: string;
        title: string;
        priority?: 'high' | 'normal' | 'low';
    }>;
}

export const MultiReportDemo: React.FC<MultiReportDemoProps> = ({ reports }) => {
    const [loadManagerStatus, setLoadManagerStatus] = useState<any>({});
    const loadManager = useReportLoadManager();

    // Mise à jour du statut du gestionnaire de charge
    const updateStatus = useCallback(() => {
        setLoadManagerStatus(loadManager.getStatus());
    }, [loadManager]);

    // Configuration pour optimiser l'affichage de multiples rapports
    const getReportConfig = (index: number, total: number) => {
        // Les 2 premiers rapports ont une priorité élevée
        const priority: 'high' | 'normal' | 'low' = index < 2 ? 'high' : index < 4 ? 'normal' : 'low';
        
        // Lazy loading pour les rapports au-delà du 3ème
        const lazyLoad = index >= 3;
        
        // Optimisations de ressources pour les rapports de faible priorité
        const resourceOptimization = priority === 'low' ? {
            disableAnimations: true,
            reduceQuality: true,
            limitRefreshRate: true
        } : {};

        return {
            priority,
            lazyLoad,
            resourceOptimization,
            height: '400px',
            maxConcurrentLoads: Math.min(3, Math.ceil(total / 2)) // Adaptatif selon le nombre total
        };
    };

    React.useEffect(() => {
        // Configuration initiale du gestionnaire
        loadManager.setMaxConcurrent(3);
        
        // Mise à jour périodique du statut (pour la démo)
        const interval = setInterval(updateStatus, 1000);
        return () => clearInterval(interval);
    }, [loadManager, updateStatus]);

    return (
        <div className="multi-report-demo">
            <div className="demo-header">
                <h2>Démonstration Multi-Rapports Optimisée</h2>
                <div className="load-manager-status">
                    <h3>Statut du Gestionnaire de Charge</h3>
                    <div className="status-grid">
                        <div className="status-item">
                            <span className="label">En cours de chargement:</span>
                            <span className="value">{loadManagerStatus.loading?.length || 0}</span>
                        </div>
                        <div className="status-item">
                            <span className="label">En attente:</span>
                            <span className="value">{loadManagerStatus.queued?.length || 0}</span>
                        </div>
                        <div className="status-item">
                            <span className="label">Max concurrent:</span>
                            <span className="value">{loadManagerStatus.maxConcurrent || 3}</span>
                        </div>
                    </div>
                    
                    {loadManagerStatus.loading?.length > 0 && (
                        <div className="loading-reports">
                            <strong>Rapports en cours:</strong>
                            {loadManagerStatus.loading.map((id: string) => (
                                <span key={id} className="loading-tag">{id}</span>
                            ))}
                        </div>
                    )}
                    
                    {loadManagerStatus.queued?.length > 0 && (
                        <div className="queued-reports">
                            <strong>Rapports en attente:</strong>
                            {loadManagerStatus.queued.map((id: string) => (
                                <span key={id} className="queued-tag">{id}</span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="reports-grid">
                {reports.map((report, index) => {
                    const config = getReportConfig(index, reports.length);
                    
                    return (
                        <div key={report.id} className="report-container">
                            <div className="report-header">
                                <h4>{report.title}</h4>
                                <div className="report-meta">
                                    <span className={`priority priority-${config.priority}`}>
                                        {config.priority}
                                    </span>
                                    {config.lazyLoad && (
                                        <span className="lazy-indicator">Lazy Load</span>
                                    )}
                                    {config.resourceOptimization.disableAnimations && (
                                        <span className="optimization-indicator">Optimisé</span>
                                    )}
                                </div>
                            </div>
                            
                            <EmbeddedPowerBIContainer
                                reportId={report.id}
                                embedUrl={report.embedUrl}
                                accessToken={report.accessToken}
                                className="demo-report"
                                priority={config.priority}
                                lazyLoad={config.lazyLoad}
                                height={config.height}
                                maxConcurrentLoads={config.maxConcurrentLoads}
                                resourceOptimization={config.resourceOptimization}
                                showLoadingState={true}
                                onLoaded={() => {
                                    console.log(`🎯 Report ${report.id} loaded in demo`);
                                    updateStatus();
                                }}
                                onError={(error: any) => {
                                    console.error(`🚨 Report ${report.id} failed in demo:`, error);
                                    updateStatus();
                                }}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="demo-tips">
                <h3>💡 Conseils d'Optimisation</h3>
                <ul>
                    <li><strong>Priorités:</strong> Les rapports critiques sont chargés en premier</li>
                    <li><strong>Lazy Loading:</strong> Les rapports hors écran attendent d'être visibles</li>
                    <li><strong>Limite de concurrence:</strong> Maximum {loadManagerStatus.maxConcurrent || 3} rapports chargés simultanément</li>
                    <li><strong>Optimisations de ressources:</strong> Qualité réduite pour les rapports de faible priorité</li>
                    <li><strong>Gestion des erreurs:</strong> Retry automatique avec gestion de la queue</li>
                </ul>
            </div>
        </div>
    );
};

// Styles CSS pour la démo
const demoStyles = `
.multi-report-demo {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.demo-header {
    margin-bottom: 30px;
    border-bottom: 2px solid #eee;
    padding-bottom: 20px;
}

.load-manager-status {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin-top: 15px;
}

.status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin: 10px 0;
}

.status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: white;
    border-radius: 4px;
    border-left: 4px solid #007acc;
}

.loading-reports, .queued-reports {
    margin-top: 10px;
}

.loading-tag, .queued-tag {
    display: inline-block;
    padding: 2px 8px;
    margin: 2px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: bold;
}

.loading-tag {
    background: #ffeaa7;
    color: #d63031;
}

.queued-tag {
    background: #ddd;
    color: #636e72;
}

.reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.report-container {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.report-header {
    padding: 15px;
    background: #f8f9fa;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.report-meta {
    display: flex;
    gap: 8px;
}

.priority {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8em;
    font-weight: bold;
}

.priority-high { background: #d63031; color: white; }
.priority-normal { background: #fdcb6e; color: #2d3436; }
.priority-low { background: #74b9ff; color: white; }

.lazy-indicator, .optimization-indicator {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7em;
    background: #00b894;
    color: white;
}

.demo-report {
    border: none !important;
}

.demo-tips {
    background: #e3f2fd;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #2196f3;
}

.demo-tips ul {
    margin: 10px 0;
    padding-left: 20px;
}

.demo-tips li {
    margin: 8px 0;
    line-height: 1.5;
}
`;

// Injecter les styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = demoStyles;
    document.head.appendChild(styleSheet);
}
