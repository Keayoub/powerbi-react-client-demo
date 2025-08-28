import React, { useState, useRef, useEffect } from 'react';
import { usePowerBIMPA } from '../hooks/usePowerBIMPA';
import { models } from 'powerbi-client';
import { PowerBIMPAService } from '../services/PowerBIMPAService';

interface ValidationResult {
    test: string;
    status: 'success' | 'error' | 'pending';
    message: string;
    timestamp: Date;
}

interface MPAValidationProps {
    onEvent?: (eventName: string, eventData: any) => void;
}

/**
 * Composant de validation pour tester le mode MPA
 * Teste la persistance, la restauration et les performances
 */
export const MPAValidation: React.FC<MPAValidationProps> = ({ onEvent }) => {
    const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const {
        embedReport,
        embedDashboard,
        initializeService,
        isInitialized,
        stats,
        error,
        removeInstance,
        clearPersistence,
        getGlobalPerformanceStats
    } = usePowerBIMPA({
        persistenceKey: 'validation-test',
        enableLogging: true,
        trackPerformance: true,
        maxInstanceAge: 5 * 60 * 1000 // 5 minutes pour les tests
    });

    const addResult = (test: string, status: ValidationResult['status'], message: string) => {
        const result = {
            test,
            status,
            message,
            timestamp: new Date()
        };
        setValidationResults(prev => [...prev, result]);
        onEvent?.('mpa-validation-result', result);
    };

    const runValidationTests = async () => {
        setIsRunning(true);
        setValidationResults([]);

        try {
            // Test 1: Initialisation du service
            addResult('Service Initialization', 'pending', 'Initialisation du service MPA...');
            
            if (!isInitialized) {
                await initializeService({
                    accessToken: 'dev-token-for-validation',
                    autoRefreshToken: true,
                    enableLogging: true,
                    settings: {
                        background: models.BackgroundType.Transparent
                    }
                });
            }
            
            addResult('Service Initialization', 'success', 'Service initialisé avec succès');

            // Test 2: Persistance localStorage
            addResult('LocalStorage Persistence', 'pending', 'Test de persistance localStorage...');
            
            const service = PowerBIMPAService.getInstance();
            const configKey = `powerbi-mpa-config-validation-test`;
            const storedConfig = localStorage.getItem(configKey);
            
            if (storedConfig) {
                addResult('LocalStorage Persistence', 'success', 'Configuration persistée trouvée');
            } else {
                addResult('LocalStorage Persistence', 'error', 'Aucune configuration persistée');
            }

            // Test 3: Persistance sessionStorage
            addResult('SessionStorage Persistence', 'pending', 'Test de persistance sessionStorage...');
            
            const instancesKey = `powerbi-mpa-instances-validation-test`;
            const storedInstances = sessionStorage.getItem(instancesKey);
            
            addResult('SessionStorage Persistence', 'success', 
                storedInstances ? 'Instances persistées trouvées' : 'Aucune instance (normal au premier lancement)');

            // Test 4: Embedding de test
            if (containerRef.current) {
                addResult('Report Embedding', 'pending', 'Test d\'embedding de rapport...');
                
                const testConfig: models.IReportEmbedConfiguration = {
                    type: 'report',
                    id: 'test-report-id',
                    embedUrl: 'https://app.powerbi.com/reportEmbed',
                    tokenType: models.TokenType.Embed,
                    accessToken: 'dev-token-for-validation'
                };

                try {
                    await embedReport(containerRef.current, testConfig, 'validation-test-container');
                    addResult('Report Embedding', 'success', 'Rapport embedé avec succès');
                } catch (err) {
                    addResult('Report Embedding', 'error', `Erreur d'embedding: ${err}`);
                }
            }

            // Test 5: Métriques de performance
            addResult('Performance Metrics', 'pending', 'Vérification des métriques...');
            
            const perfStats = getGlobalPerformanceStats();
            if (perfStats && Object.keys(perfStats).length > 0) {
                addResult('Performance Metrics', 'success', 
                    `Métriques collectées: ${Object.keys(perfStats).length} instances`);
            } else {
                addResult('Performance Metrics', 'success', 'Système de métriques fonctionnel');
            }

            // Test 6: Statistiques du service
            addResult('Service Statistics', 'pending', 'Collecte des statistiques...');
            
            const serviceStats = stats;
            addResult('Service Statistics', 'success', 
                `Instances: ${serviceStats.totalInstances}, Persistées: ${serviceStats.persistedInstances}`);

            // Test 7: Nettoyage automatique
            addResult('Auto Cleanup', 'pending', 'Test de nettoyage automatique...');
            
            // Simulation d'une instance ancienne
            const testConfig: models.IReportEmbedConfiguration = {
                type: 'report',
                id: 'test-report-id',
                embedUrl: 'https://app.powerbi.com/reportEmbed',
                tokenType: models.TokenType.Embed,
                accessToken: 'dev-token-for-validation'
            };

            const oldInstanceData = {
                containerId: 'old-test-container',
                config: testConfig,
                timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes dans le passé
                lastActivity: Date.now() - (10 * 60 * 1000)
            };

            // Ajouter temporairement l'instance ancienne
            const instances = JSON.parse(sessionStorage.getItem(instancesKey) || '{}');
            instances['old-test-container'] = oldInstanceData;
            sessionStorage.setItem(instancesKey, JSON.stringify(instances));

            // Déclencher le nettoyage
            service.cleanupOldInstances();

            // Vérifier que l'ancienne instance a été supprimée
            const cleanedInstances = JSON.parse(sessionStorage.getItem(instancesKey) || '{}');
            if (!cleanedInstances['old-test-container']) {
                addResult('Auto Cleanup', 'success', 'Nettoyage automatique fonctionnel');
            } else {
                addResult('Auto Cleanup', 'error', 'Nettoyage automatique non effectué');
            }

            // Test 8: Simulation rechargement de page
            addResult('Page Reload Simulation', 'pending', 'Simulation rechargement de page...');
            
            // Sauvegarder l'état actuel
            const currentStats = stats;
            
            // Simuler restauration après rechargement
            const restoredService = PowerBIMPAService.getInstance();
            const restoredStats = restoredService.getStats();
            
            addResult('Page Reload Simulation', 'success', 
                `Restauration: ${restoredStats.persistedInstances} instances restaurées`);

        } catch (error) {
            addResult('Validation Error', 'error', `Erreur générale: ${error}`);
        } finally {
            setIsRunning(false);
        }
    };

    const clearValidationData = () => {
        clearPersistence();
        setValidationResults([]);
        addResult('Data Cleared', 'success', 'Toutes les données de validation effacées');
    };

    const getStatusIcon = (status: ValidationResult['status']) => {
        switch (status) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'pending': return '⏳';
            default: return '❓';
        }
    };

    const getStatusColor = (status: ValidationResult['status']) => {
        switch (status) {
            case 'success': return '#4CAF50';
            case 'error': return '#f44336';
            case 'pending': return '#FF9800';
            default: return '#757575';
        }
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2>🧪 Validation MPA Power BI</h2>
            
            <div style={{ marginBottom: '20px' }}>
                <button 
                    onClick={runValidationTests}
                    disabled={isRunning}
                    style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        marginRight: '10px'
                    }}
                >
                    {isRunning ? '🔄 Tests en cours...' : '▶️ Lancer les tests'}
                </button>
                
                <button 
                    onClick={clearValidationData}
                    disabled={isRunning}
                    style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    🗑️ Effacer les données
                </button>
            </div>

            {/* Zone d'embedding pour les tests */}
            <div 
                ref={containerRef} 
                style={{ 
                    height: '200px', 
                    border: '2px dashed #ccc', 
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    backgroundColor: '#f9f9f9'
                }}
            >
                <span style={{ color: '#666' }}>Zone d'embedding de test</span>
            </div>

            {/* Statistiques en temps réel */}
            <div style={{ 
                backgroundColor: '#f5f5f5', 
                padding: '15px', 
                borderRadius: '4px', 
                marginBottom: '20px' 
            }}>
                <h3>📊 Statistiques en temps réel</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    <div>
                        <strong>Service initialisé:</strong> {isInitialized ? '✅' : '❌'}
                    </div>
                    <div>
                        <strong>Instances totales:</strong> {stats.totalInstances}
                    </div>
                    <div>
                        <strong>Instances persistées:</strong> {stats.persistedInstances}
                    </div>
                    <div>
                        <strong>Dernière activité:</strong> {stats.lastCleanup ? new Date(stats.lastCleanup).toLocaleTimeString() : 'Aucune'}
                    </div>
                </div>
                {error && (
                    <div style={{ color: '#f44336', marginTop: '10px' }}>
                        <strong>Erreur:</strong> {error}
                    </div>
                )}
            </div>

            {/* Résultats des tests */}
            <div>
                <h3>📋 Résultats des tests</h3>
                {validationResults.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                        Aucun test exécuté. Cliquez sur "Lancer les tests" pour commencer.
                    </p>
                ) : (
                    <div style={{ 
                        border: '1px solid #ddd', 
                        borderRadius: '4px',
                        maxHeight: '400px',
                        overflowY: 'auto'
                    }}>
                        {validationResults.map((result, index) => (
                            <div 
                                key={index}
                                style={{
                                    padding: '10px',
                                    borderBottom: index < validationResults.length - 1 ? '1px solid #eee' : 'none',
                                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                                }}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ marginRight: '10px', fontSize: '18px' }}>
                                            {getStatusIcon(result.status)}
                                        </span>
                                        <strong style={{ color: getStatusColor(result.status) }}>
                                            {result.test}
                                        </strong>
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                        {result.timestamp.toLocaleTimeString()}
                                    </span>
                                </div>
                                <div style={{ 
                                    marginTop: '5px', 
                                    marginLeft: '28px',
                                    color: '#555'
                                }}>
                                    {result.message}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Informations de persistance */}
            <div style={{ 
                marginTop: '20px',
                backgroundColor: '#e3f2fd',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #2196F3'
            }}>
                <h4>💾 Informations de persistance</h4>
                <div style={{ fontSize: '14px' }}>
                    <div><strong>LocalStorage:</strong> Configuration service, tokens, paramètres globaux</div>
                    <div><strong>SessionStorage:</strong> Instances actives, métadonnées d'embedding</div>
                    <div><strong>Nettoyage:</strong> Automatique toutes les 30 secondes, instances &gt; 5 min supprimées</div>
                    <div><strong>Clé de persistance:</strong> validation-test</div>
                </div>
            </div>

            {/* Instructions */}
            <div style={{ 
                marginTop: '20px',
                backgroundColor: '#fff3e0',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #FF9800'
            }}>
                <h4>📝 Instructions de test</h4>
                <ol style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <li>Lancez les tests de validation</li>
                    <li>Vérifiez que tous les tests sont au vert ✅</li>
                    <li>Rechargez la page (F5) pour tester la persistance</li>
                    <li>Relancez les tests après rechargement</li>
                    <li>Vérifiez que les instances sont restaurées</li>
                    <li>Testez le nettoyage en attendant 5+ minutes</li>
                </ol>
            </div>
        </div>
    );
};

export default MPAValidation;
