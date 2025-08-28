/**
 * Composant wrapper pour gérer l'initialisation et les erreurs Power BI
 * Résout les problèmes d'authentification et de configuration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { models } from 'powerbi-client';
import { powerBIService } from '../services/PowerBIService';
import { powerBIAuthService } from '../services/PowerBIAuthService';
import { powerBIConfigService } from '../services/PowerBIConfigService';

interface PowerBIProviderProps {
    children: React.ReactNode;
    enableLogging?: boolean;
    enablePerformanceTracking?: boolean;
    accessToken?: string;
    autoRefreshToken?: boolean;
    onError?: (error: string) => void;
}

interface PowerBIContextType {
    isInitialized: boolean;
    isLoading: boolean;
    error: string | null;
    tokenInfo: {
        hasToken: boolean;
        isValid: boolean;
        expiresAt: Date | null;
    };
    refreshToken: () => Promise<void>;
    clearError: () => void;
    retryInitialization: () => Promise<void>;
}

const PowerBIContext = React.createContext<PowerBIContextType | null>(null);

export const PowerBIProvider: React.FC<PowerBIProviderProps> = ({
    children,
    enableLogging = process.env.NODE_ENV === 'development',
    enablePerformanceTracking = true,
    accessToken,
    autoRefreshToken = true,
    onError
}) => {
    const [isInitialized, setIsInitialized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tokenInfo, setTokenInfo] = useState(powerBIAuthService.getTokenInfo());
    const [initAttempts, setInitAttempts] = useState(0);

    /**
     * Gère les erreurs de manière centralisée
     */
    const handleError = useCallback((err: any, context: string) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const fullError = `${context}: ${errorMessage}`;
        
        setError(fullError);
        
        if (enableLogging) {
            console.error(`❌ ${context}:`, err);
        }
        
        if (onError) {
            onError(fullError);
        }
    }, [enableLogging, onError]);

    /**
     * Initialise le service Power BI avec gestion d'erreurs complète
     */
    const initializePowerBIService = useCallback(async () => {
        if (isInitialized && initAttempts === 0) return;
        
        setIsLoading(true);
        setError(null);

        try {
            if (enableLogging) {
                console.log('🔧 Début de l\'initialisation Power BI Service...');
            }

            // Étape 1: Configurer les services de base
            powerBIAuthService.setLogging(enableLogging);
            powerBIConfigService.setLogging(enableLogging);

            // Étape 2: Gérer l'authentification
            if (accessToken) {
                powerBIAuthService.setToken(accessToken, 3600);
                if (enableLogging) {
                    console.log('🔑 Token d\'accès fourni');
                }
            } else {
                // Tenter d'obtenir un token automatiquement
                try {
                    const autoToken = await powerBIAuthService.getValidToken();
                    if (enableLogging) {
                        console.log('🔑 Token obtenu automatiquement');
                    }
                } catch (tokenError) {
                    if (enableLogging) {
                        console.warn('⚠️ Impossible d\'obtenir un token automatiquement, utilisation du mode développement');
                    }
                    // En mode développement, continuer sans token réel
                }
            }

            // Étape 3: Charger les configurations
            await powerBIConfigService.loadConfigurationsFromEnvironment();

            // Étape 4: Initialiser le service principal
            await powerBIService.initialize({
                accessToken: accessToken || powerBIAuthService.getCurrentToken() || undefined,
                enablePerformanceTracking,
                enableLogging,
                autoRefreshToken,
                settings: {
                    background: models.BackgroundType.Transparent,
                    filterPaneEnabled: false,
                    navContentPaneEnabled: false
                }
            });

            // Étape 5: Mettre à jour l'état
            setIsInitialized(true);
            setTokenInfo(powerBIAuthService.getTokenInfo());
            setInitAttempts(0);

            if (enableLogging) {
                console.log('✅ Power BI Service initialisé avec succès');
            }

        } catch (err) {
            const attemptCount = initAttempts + 1;
            setInitAttempts(attemptCount);
            
            if (attemptCount < 3) {
                if (enableLogging) {
                    console.warn(`⚠️ Tentative ${attemptCount} échouée, retry dans 2s...`, err);
                }
                
                // Retry automatique avec délai croissant
                setTimeout(() => {
                    initializePowerBIService();
                }, 2000 * attemptCount);
                
                return; // Ne pas définir l'erreur encore, on va retry
            }
            
            handleError(err, 'Initialisation Power BI');
        } finally {
            setIsLoading(false);
        }
    }, [
        isInitialized, 
        initAttempts, 
        enableLogging, 
        enablePerformanceTracking, 
        accessToken, 
        autoRefreshToken, 
        handleError
    ]);

    /**
     * Rafraîchit le token d'accès
     */
    const refreshToken = useCallback(async () => {
        try {
            setError(null);
            await powerBIAuthService.refreshToken();
            
            const newToken = powerBIAuthService.getCurrentToken();
            if (newToken) {
                await powerBIService.updateAccessToken(newToken);
            }
            
            setTokenInfo(powerBIAuthService.getTokenInfo());
            
            if (enableLogging) {
                console.log('🔄 Token rafraîchi avec succès');
            }

        } catch (err) {
            handleError(err, 'Rafraîchissement du token');
            throw err;
        }
    }, [enableLogging, handleError]);

    /**
     * Efface l'erreur courante
     */
    const clearError = useCallback(() => {
        setError(null);
        setInitAttempts(0);
    }, []);

    /**
     * Relance l'initialisation manuellement
     */
    const retryInitialization = useCallback(async () => {
        setIsInitialized(false);
        setInitAttempts(0);
        await initializePowerBIService();
    }, [initializePowerBIService]);

    /**
     * Surveillance périodique du token
     */
    useEffect(() => {
        if (!isInitialized || !autoRefreshToken) return;

        const interval = setInterval(() => {
            const currentTokenInfo = powerBIAuthService.getTokenInfo();
            setTokenInfo(currentTokenInfo);

            // Auto-refresh si nécessaire
            if (currentTokenInfo.hasToken && !currentTokenInfo.isValid) {
                if (enableLogging) {
                    console.log('🔄 Token expiré, rafraîchissement automatique...');
                }
                
                refreshToken().catch((err) => {
                    if (enableLogging) {
                        console.error('❌ Échec du rafraîchissement automatique:', err);
                    }
                });
            }
        }, 60000); // Vérifier toutes les minutes

        return () => clearInterval(interval);
    }, [isInitialized, autoRefreshToken, enableLogging, refreshToken]);

    /**
     * Initialisation au montage
     */
    useEffect(() => {
        initializePowerBIService();
    }, [initializePowerBIService]);

    const contextValue: PowerBIContextType = {
        isInitialized,
        isLoading,
        error,
        tokenInfo,
        refreshToken,
        clearError,
        retryInitialization
    };

    return (
        <PowerBIContext.Provider value={contextValue}>
            {children}
        </PowerBIContext.Provider>
    );
};

/**
 * Hook pour utiliser le contexte Power BI
 */
export const usePowerBI = (): PowerBIContextType => {
    const context = React.useContext(PowerBIContext);
    if (!context) {
        throw new Error('usePowerBI must be used within a PowerBIProvider');
    }
    return context;
};

/**
 * Composant d'affichage des erreurs Power BI
 */
export const PowerBIErrorDisplay: React.FC<{
    error: string | null;
    onRetry?: () => void;
    onClear?: () => void;
}> = ({ error, onRetry, onClear }) => {
    if (!error) return null;

    return (
        <div style={{
            background: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            padding: '12px',
            margin: '10px 0',
            color: '#856404'
        }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>⚠️</span>
                <div style={{ flex: 1 }}>
                    <strong>Erreur Power BI:</strong>
                    <div style={{ marginTop: '4px', fontSize: '14px' }}>
                        {error}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                style={{
                                    background: '#0078d4',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                🔄 Réessayer
                            </button>
                        )}
                        {onClear && (
                            <button
                                onClick={onClear}
                                style={{
                                    background: '#6c757d',
                                    color: 'white',
                                    border: 'none',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                ✕ Fermer
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Composant de statut de l'initialisation
 */
export const PowerBIStatus: React.FC = () => {
    const { isInitialized, isLoading, error, tokenInfo, retryInitialization, clearError } = usePowerBI();

    if (isLoading) {
        return (
            <div style={{
                background: '#e3f2fd',
                border: '1px solid #2196f3',
                borderRadius: '4px',
                padding: '12px',
                margin: '10px 0',
                color: '#1976d2',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
            }}>
                <div style={{ 
                    width: '16px', 
                    height: '16px', 
                    border: '2px solid #2196f3', 
                    borderTop: '2px solid transparent', 
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <span>Initialisation de Power BI en cours...</span>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <PowerBIErrorDisplay 
                error={error} 
                onRetry={retryInitialization}
                onClear={clearError}
            />
        );
    }

    if (isInitialized) {
        return (
            <div style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                padding: '12px',
                margin: '10px 0',
                color: '#155724'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✅</span>
                    <strong>Power BI Service initialisé</strong>
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                    Token: {tokenInfo.hasToken ? (tokenInfo.isValid ? '✅ Valide' : '⚠️ Expiré') : '❌ Absent'}
                    {tokenInfo.expiresAt && (
                        <span> | Expire: {tokenInfo.expiresAt.toLocaleTimeString()}</span>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default PowerBIProvider;
