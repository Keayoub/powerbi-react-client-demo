/**
 * Composant de monitoring des performances Power BI
 * Affiche TTFMP, TTI et autres métriques en temps réel
 */

import React, { useState, useEffect } from 'react';
import { usePowerBIService } from '../hooks/usePowerBIService';
import { PerformanceMetrics } from '../services/PowerBIPerformanceTracker';

interface PerformanceMonitorProps {
    /** ID du container spécifique à surveiller (optionnel) */
    containerId?: string;
    /** Intervalle de mise à jour en millisecondes */
    updateInterval?: number;
    /** Affichage compact ou détaillé */
    compact?: boolean;
    /** Callback appelé quand les métriques changent */
    onMetricsUpdate?: (metrics: PerformanceMetrics[]) => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
    containerId,
    updateInterval = 2000,
    compact = false,
    onMetricsUpdate
}) => {
    const { 
        performanceMetrics, 
        getPerformanceMetrics, 
        getGlobalPerformanceStats 
    } = usePowerBIService({ trackPerformance: true });
    
    const [globalStats, setGlobalStats] = useState(getGlobalPerformanceStats());
    const [selectedContainerId, setSelectedContainerId] = useState(containerId);

    // Mise à jour périodique des métriques
    useEffect(() => {
        const interval = setInterval(() => {
            setGlobalStats(getGlobalPerformanceStats());
            if (onMetricsUpdate) {
                onMetricsUpdate(performanceMetrics);
            }
        }, updateInterval);

        return () => clearInterval(interval);
    }, [performanceMetrics, getGlobalPerformanceStats, updateInterval, onMetricsUpdate]);

    const formatTime = (time?: number): string => {
        if (time === undefined) return 'N/A';
        return `${time.toFixed(0)}ms`;
    };

    const getStatusIcon = (status: string): string => {
        switch (status) {
            case 'loading': return '⏳';
            case 'loaded': return '📥';
            case 'rendered': return '🎨';
            case 'interactive': return '✅';
            case 'error': return '❌';
            default: return '⚪';
        }
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'loading': return '#ffc107';
            case 'loaded': return '#17a2b8';
            case 'rendered': return '#6f42c1';
            case 'interactive': return '#28a745';
            case 'error': return '#dc3545';
            default: return '#6c757d';
        }
    };

    const currentMetrics = selectedContainerId 
        ? getPerformanceMetrics(selectedContainerId)
        : undefined;

    if (compact) {
        return (
            <div style={{
                display: 'flex',
                gap: '15px',
                padding: '10px',
                background: '#f8f9fa',
                borderRadius: '6px',
                fontSize: '0.9em',
                alignItems: 'center'
            }}>
                <div style={{ fontWeight: 'bold', color: '#495057' }}>
                    📊 Performance
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <span>
                        <strong>Rapports:</strong> {globalStats.totalReports}
                    </span>
                    <span>
                        <strong>TTFMP:</strong> {formatTime(globalStats.averageTTFMP)}
                    </span>
                    <span>
                        <strong>TTI:</strong> {formatTime(globalStats.averageTTI)}
                    </span>
                    <span style={{ 
                        color: globalStats.successRate >= 90 ? '#28a745' : '#dc3545',
                        fontWeight: 'bold'
                    }}>
                        <strong>Succès:</strong> {globalStats.successRate.toFixed(1)}%
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            background: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                background: '#343a40',
                color: 'white',
                padding: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, fontSize: '1.2em' }}>
                    📊 Power BI Performance Monitor
                </h3>
                <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                    Mise à jour toutes les {updateInterval / 1000}s
                </div>
            </div>

            {/* Statistiques globales */}
            <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>
                    🌍 Statistiques Globales
                </h4>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '15px'
                }}>
                    <div style={{
                        background: '#e3f2fd',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#1976d2' }}>
                            {globalStats.totalReports}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                            Rapports Totaux
                        </div>
                    </div>
                    
                    <div style={{
                        background: '#f3e5f5',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#7b1fa2' }}>
                            {formatTime(globalStats.averageTTFMP)}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                            TTFMP Moyen
                        </div>
                    </div>
                    
                    <div style={{
                        background: '#e8f5e8',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#388e3c' }}>
                            {formatTime(globalStats.averageTTI)}
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                            TTI Moyen
                        </div>
                    </div>
                    
                    <div style={{
                        background: globalStats.successRate >= 90 ? '#e8f5e8' : '#ffebee',
                        padding: '12px',
                        borderRadius: '6px',
                        textAlign: 'center'
                    }}>
                        <div style={{ 
                            fontSize: '1.8em', 
                            fontWeight: 'bold', 
                            color: globalStats.successRate >= 90 ? '#388e3c' : '#d32f2f'
                        }}>
                            {globalStats.successRate.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.9em', color: '#666' }}>
                            Taux de Succès
                        </div>
                    </div>
                </div>
            </div>

            {/* Liste des rapports */}
            {performanceMetrics.length > 0 && (
                <div style={{ padding: '20px' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '15px'
                    }}>
                        <h4 style={{ margin: 0, color: '#495057' }}>
                            📋 Détails par Rapport ({performanceMetrics.length})
                        </h4>
                        {performanceMetrics.length > 1 && (
                            <select
                                value={selectedContainerId || ''}
                                onChange={(e) => setSelectedContainerId(e.target.value || undefined)}
                                style={{
                                    padding: '6px 12px',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    fontSize: '0.9em'
                                }}
                            >
                                <option value="">Tous les rapports</option>
                                {performanceMetrics.map(metric => (
                                    <option key={metric.containerId} value={metric.containerId}>
                                        {metric.reportId}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Détails du rapport sélectionné */}
                    {currentMetrics ? (
                        <div style={{
                            background: '#f8f9fa',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            padding: '15px',
                            marginBottom: '15px'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <h5 style={{ margin: 0, color: '#495057' }}>
                                    {currentMetrics.reportId}
                                </h5>
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    color: getStatusColor(currentMetrics.status),
                                    fontWeight: 'bold'
                                }}>
                                    {getStatusIcon(currentMetrics.status)}
                                    {currentMetrics.status}
                                </span>
                            </div>
                            
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                                gap: '10px',
                                fontSize: '0.9em'
                            }}>
                                <div>
                                    <strong>TTFMP:</strong> {formatTime(currentMetrics.ttfmp)}
                                </div>
                                <div>
                                    <strong>TTI:</strong> {formatTime(currentMetrics.tti)}
                                </div>
                                <div>
                                    <strong>Chargement:</strong> {formatTime(currentMetrics.loadTime)}
                                </div>
                                <div>
                                    <strong>Interactions:</strong> {currentMetrics.interactions.length}
                                </div>
                                <div>
                                    <strong>Pages:</strong> {currentMetrics.pageChanges.length}
                                </div>
                                <div style={{ color: currentMetrics.errors.length > 0 ? '#dc3545' : '#28a745' }}>
                                    <strong>Erreurs:</strong> {currentMetrics.errors.length}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Vue de tous les rapports */
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '10px'
                        }}>
                            {performanceMetrics.map(metric => (
                                <div
                                    key={metric.containerId}
                                    style={{
                                        background: '#f8f9fa',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '6px',
                                        padding: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => setSelectedContainerId(metric.containerId)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#e9ecef';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#f8f9fa';
                                    }}
                                >
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <strong style={{ fontSize: '0.95em' }}>
                                            {metric.reportId}
                                        </strong>
                                        <span style={{ 
                                            color: getStatusColor(metric.status),
                                            fontSize: '1.2em'
                                        }}>
                                            {getStatusIcon(metric.status)}
                                        </span>
                                    </div>
                                    
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '8px',
                                        fontSize: '0.85em',
                                        color: '#666'
                                    }}>
                                        <div>TTFMP: {formatTime(metric.ttfmp)}</div>
                                        <div>TTI: {formatTime(metric.tti)}</div>
                                        <div>Load: {formatTime(metric.loadTime)}</div>
                                        <div>Errors: {metric.errors.length}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {performanceMetrics.length === 0 && (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#6c757d'
                }}>
                    <div style={{ fontSize: '3em', marginBottom: '10px' }}>📊</div>
                    <div>Aucune métrique de performance disponible</div>
                    <div style={{ fontSize: '0.9em', marginTop: '5px' }}>
                        Les métriques apparaîtront dès qu'un rapport Power BI sera chargé
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerformanceMonitor;
