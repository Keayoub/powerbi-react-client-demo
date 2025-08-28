// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';

interface MultiReportDiagnosticsProps {
    className?: string;
}

export const MultiReportDiagnostics: React.FC<MultiReportDiagnosticsProps> = ({
    className = 'multi-report-diagnostics'
}) => {
    const [diagnostics, setDiagnostics] = useState<any>({});
    const [isVisible, setIsVisible] = useState(false);

    const runDiagnostics = () => {
        const reports = document.querySelectorAll('.stable-powerbi-embed');
        const errorReports = document.querySelectorAll('.stable-powerbi-embed .error-state');
        
        const diagnosticData = {
            timestamp: new Date().toISOString(),
            totalReports: reports.length,
            errorReports: errorReports.length,
            healthyReports: reports.length - errorReports.length,
            powerBiServices: document.querySelectorAll('[data-powerbi-service]').length,
            memoryUsage: (performance as any).memory ? {
                used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
            } : 'N/A',
            pageLoad: performance.now(),
            reportsStatus: Array.from(reports).map((report, index) => ({
                index,
                hasError: report.querySelector('.error-state') !== null,
                isLoading: report.querySelector('[style*="spin"]') !== null,
                size: {
                    width: report.clientWidth,
                    height: report.clientHeight
                }
            }))
        };

        setDiagnostics(diagnosticData);
        console.log('🔍 Multi-Report Diagnostics:', diagnosticData);
    };

    useEffect(() => {
        runDiagnostics();
        const interval = setInterval(runDiagnostics, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!isVisible) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 10000
            }}>
                <button
                    onClick={() => setIsVisible(true)}
                    style={{
                        padding: '12px',
                        backgroundColor: diagnostics.errorReports > 0 ? '#dc3545' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '16px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        animation: diagnostics.errorReports > 0 ? 'pulse 2s infinite' : 'none'
                    }}
                    title="Multi-Report Diagnostics"
                >
                    🩺
                </button>
                <style>{`
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div 
            className={className}
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '400px',
                maxHeight: '600px',
                backgroundColor: 'white',
                border: '2px solid #007acc',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                zIndex: 10000,
                overflow: 'auto'
            }}
        >
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #eee',
                backgroundColor: '#f8f9fa',
                borderRadius: '10px 10px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h3 style={{ margin: 0, color: '#007acc' }}>🩺 Diagnostics Multi-Reports</h3>
                <button
                    onClick={() => setIsVisible(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '18px',
                        cursor: 'pointer',
                        color: '#666'
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ padding: '16px' }}>
                {/* Status général */}
                <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: diagnostics.errorReports > 0 ? '#ffe6e6' : '#e6ffe6',
                    borderRadius: '8px'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', color: diagnostics.errorReports > 0 ? '#d63031' : '#00b894' }}>
                        {diagnostics.errorReports > 0 ? '❌ Problèmes détectés' : '✅ Système sain'}
                    </h4>
                    <div style={{ fontSize: '14px' }}>
                        <p><strong>Reports actifs:</strong> {diagnostics.totalReports}</p>
                        <p><strong>Reports en erreur:</strong> {diagnostics.errorReports}</p>
                        <p><strong>Reports OK:</strong> {diagnostics.healthyReports}</p>
                    </div>
                </div>

                {/* Mémoire */}
                {diagnostics.memoryUsage !== 'N/A' && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        backgroundColor: '#f0f8ff',
                        borderRadius: '8px'
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#007acc' }}>💾 Utilisation mémoire</h4>
                        <div style={{ fontSize: '14px' }}>
                            <p><strong>Utilisée:</strong> {diagnostics.memoryUsage.used} MB</p>
                            <p><strong>Totale:</strong> {diagnostics.memoryUsage.total} MB</p>
                            <p><strong>Limite:</strong> {diagnostics.memoryUsage.limit} MB</p>
                        </div>
                    </div>
                )}

                {/* Status des rapports */}
                <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: '#fff9e6',
                    borderRadius: '8px'
                }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#d68910' }}>📊 Status des rapports</h4>
                    {diagnostics.reportsStatus?.map((report: any, index: number) => (
                        <div key={index} style={{
                            padding: '8px',
                            margin: '4px 0',
                            backgroundColor: report.hasError ? '#ffe6e6' : '#e6ffe6',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            <strong>Report #{index + 1}:</strong>
                            {report.hasError ? ' ❌ Erreur' : ' ✅ OK'}
                            {report.isLoading ? ' 🔄 Chargement' : ''}
                            <br />
                            <small>Taille: {report.size.width}x{report.size.height}px</small>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={runDiagnostics}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#007acc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        🔄 Actualiser
                    </button>
                    
                    <button
                        onClick={() => {
                            const errors = document.querySelectorAll('.stable-powerbi-embed .error-state');
                            errors.forEach(error => {
                                const retryBtn = error.querySelector('button');
                                if (retryBtn) retryBtn.click();
                            });
                        }}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        🔧 Retry All
                    </button>

                    <button
                        onClick={() => {
                            console.clear();
                            console.log('🧹 Console cleared for better debugging');
                        }}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        🧹 Clear Console
                    </button>
                </div>

                <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#666'
                }}>
                    <small>Dernière mise à jour: {new Date(diagnostics.timestamp).toLocaleTimeString()}</small>
                </div>
            </div>
        </div>
    );
};
