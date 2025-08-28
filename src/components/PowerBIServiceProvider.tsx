/**
 * Composant pour initialiser le service Power BI singleton au niveau de la page
 * À utiliser une seule fois par page pour configurer le service partagé
 */

import React, { useEffect, useState } from 'react';
import { models } from 'powerbi-client';
import { usePowerBIServiceInitializer } from '../hooks/usePowerBIService';
import { powerBIService } from '../services/PowerBIService';

interface PowerBIServiceProviderProps {
    children: React.ReactNode;
    accessToken: string;
    tokenType?: models.TokenType;
    globalSettings?: models.ISettings;
    autoTokenRefresh?: boolean;
    tokenRefreshInterval?: number; // en minutes
    enableLogging?: boolean;
    enablePerformanceTracking?: boolean;
}

export const PowerBIServiceProvider: React.FC<PowerBIServiceProviderProps> = ({
    children,
    accessToken,
    tokenType = models.TokenType.Embed,
    globalSettings = {},
    autoTokenRefresh = false,
    tokenRefreshInterval = 50, // 50 minutes (avant expiration à 1h)
    enableLogging = true,
    enablePerformanceTracking = true
}) => {
    const [isServiceReady, setIsServiceReady] = useState(false);
    const [serviceStats, setServiceStats] = useState(powerBIService.getStats());

    // Configuration du service Power BI
    const serviceConfig = {
        accessToken,
        tokenType,
        enableLogging,
        enablePerformanceTracking,
        settings: {
            background: models.BackgroundType.Transparent,
            filterPaneEnabled: false,
            navContentPaneEnabled: false,
            ...globalSettings
        }
    };

    // Initialisation du service
    const { isInitialized } = usePowerBIServiceInitializer(serviceConfig, [accessToken]);

    // Mise à jour de l'état quand le service est prêt
    useEffect(() => {
        setIsServiceReady(isInitialized);
        if (isInitialized && enableLogging) {
            console.log('🚀 PowerBI Service Provider ready');
        }
    }, [isInitialized, enableLogging]);

    // Rafraîchissement automatique du token
    useEffect(() => {
        if (!autoTokenRefresh || !isInitialized) return;

        const interval = setInterval(async () => {
            try {
                // Dans un vrai projet, vous devriez récupérer un nouveau token depuis votre API
                console.log('🔄 Auto token refresh would trigger here');
                // await powerBIService.updateAccessToken(newToken);
            } catch (error) {
                console.error('❌ Failed to refresh token:', error);
            }
        }, tokenRefreshInterval * 60 * 1000);

        return () => clearInterval(interval);
    }, [autoTokenRefresh, tokenRefreshInterval, isInitialized]);

    // Mise à jour périodique des statistiques
    useEffect(() => {
        const interval = setInterval(() => {
            setServiceStats(powerBIService.getStats());
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    // Cleanup au démontage (changement de page)
    useEffect(() => {
        return () => {
            console.log('🧹 PowerBI Service Provider cleanup');
            powerBIService.cleanup();
        };
    }, []);

    if (!isServiceReady) {
        return (
            <div className="powerbi-service-loading">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <h3>Initialisation du service Power BI...</h3>
                    <p>Configuration du service singleton en cours</p>
                </div>
            </div>
        );
    }

    return (
        <div className="powerbi-service-provider">
            <div className="service-header">
                <div className="service-status">
                    <span className="status-indicator active"></span>
                    <span className="status-text">Service Power BI actif</span>
                </div>
                <div className="service-stats">
                    <span className="stat-item">
                        Instances: {serviceStats.totalInstances}
                    </span>
                    <span className="stat-item">
                        Rapports: {serviceStats.instancesByType.report || 0}
                    </span>
                    <span className="stat-item">
                        Dashboards: {serviceStats.instancesByType.dashboard || 0}
                    </span>
                </div>
            </div>
            
            {children}
        </div>
    );
};

// Styles CSS pour le provider
const providerStyles = `
.powerbi-service-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    padding: 40px;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 20px 0;
}

.loading-container {
    text-align: center;
    color: #6c757d;
}

.loading-container .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e9ecef;
    border-top: 4px solid #007acc;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.powerbi-service-provider {
    margin-bottom: 20px;
}

.service-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: linear-gradient(135deg, #007acc 0%, #0056b3 100%);
    color: white;
    border-radius: 8px 8px 0 0;
    font-size: 0.9em;
    margin-bottom: 0;
}

.service-status {
    display: flex;
    align-items: center;
    gap: 8px;
}

.status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #dc3545;
}

.status-indicator.active {
    background: #28a745;
    box-shadow: 0 0 8px rgba(40, 167, 69, 0.6);
}

.service-stats {
    display: flex;
    gap: 16px;
}

.stat-item {
    font-size: 0.85em;
    opacity: 0.9;
    font-weight: 500;
}

@media (max-width: 768px) {
    .service-header {
        flex-direction: column;
        gap: 8px;
        text-align: center;
    }
    
    .service-stats {
        gap: 12px;
    }
}
`;

// Injecter les styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = providerStyles;
    document.head.appendChild(styleSheet);
}
