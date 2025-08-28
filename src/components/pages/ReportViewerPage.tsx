// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiReportViewer, EmbeddedReport } from '../multi-report-viewer/MultiReportViewer';
import { IFrameReportViewer, IFrameReport } from '../iframe-report-viewer/IFrameReportViewer';
import './ReportViewerPage.css';

interface ViewerConfig {
    multiReportMode: boolean;
    iframeMode: boolean;
}

export const ReportViewerPage: React.FC = () => {
    const navigate = useNavigate();
    
    // Load reports and config from sessionStorage
    const [embeddedReports, setEmbeddedReports] = useState<EmbeddedReport[]>([]);
    const [iframeReports, setIframeReports] = useState<IFrameReport[]>([]);
    const [viewerConfig, setViewerConfig] = useState<ViewerConfig>({
        multiReportMode: true,
        iframeMode: false
    });
    
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load data from sessionStorage
        try {
            const embeddedData = sessionStorage.getItem('embeddedReports');
            const iframeData = sessionStorage.getItem('iframeReports');
            const configData = sessionStorage.getItem('viewerConfig');

            if (embeddedData) {
                setEmbeddedReports(JSON.parse(embeddedData));
            }
            if (iframeData) {
                setIframeReports(JSON.parse(iframeData));
            }
            if (configData) {
                setViewerConfig(JSON.parse(configData));
            }
        } catch (error) {
            console.error('Error loading reports from sessionStorage:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleRemoveEmbeddedReport = (reportId: string) => {
        setEmbeddedReports(prev => {
            const updated = prev.filter(r => r.id !== reportId);
            sessionStorage.setItem('embeddedReports', JSON.stringify(updated));
            return updated;
        });
    };

    const handleRemoveIFrameReport = (reportId: string) => {
        setIframeReports(prev => {
            const updated = prev.filter(r => r.id !== reportId);
            sessionStorage.setItem('iframeReports', JSON.stringify(updated));
            return updated;
        });
    };

    const handleClearAllEmbedded = () => {
        setEmbeddedReports([]);
        sessionStorage.removeItem('embeddedReports');
    };

    const handleClearAllIFrame = () => {
        setIframeReports([]);
        sessionStorage.removeItem('iframeReports');
    };

    const handleBackToConfig = () => {
        navigate('/configuration');
    };

    const totalReports = embeddedReports.length + iframeReports.length;

    if (isLoading) {
        return (
            <div className="report-viewer-page loading">
                <div className="loading-indicator">
                    <h2>🔄 Loading Reports...</h2>
                    <p>Setting up your report viewing experience</p>
                </div>
            </div>
        );
    }

    if (totalReports === 0) {
        return (
            <div className="report-viewer-page empty">
                <div className="empty-state">
                    <h2>📊 No Reports Selected</h2>
                    <p>You haven't selected any reports to view yet.</p>
                    <div className="empty-actions">
                        <button onClick={handleBackToConfig} className="primary-action">
                            ⚙️ Go to Configuration
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="report-viewer-page">
            <div className="viewer-header">
                <div className="header-content">
                    <h1>📊 Report Viewer</h1>
                    <div className="header-info">
                        <span className="mode-indicator">
                            {viewerConfig.multiReportMode 
                                ? viewerConfig.iframeMode 
                                    ? '🖼️ IFrame Multi-Report Mode'
                                    : '📊 PowerBI Multi-Report Mode'
                                : '📈 Single Report Mode'
                            }
                        </span>
                        <span className="report-count">
                            {totalReports} report{totalReports !== 1 ? 's' : ''} loaded
                        </span>
                    </div>
                </div>

                <div className="header-actions">
                    <button onClick={handleBackToConfig} className="config-button">
                        ⚙️ Configuration
                    </button>
                    
                    <div className="quick-stats">
                        {embeddedReports.length > 0 && (
                            <div className="stat-badge powerbi">
                                📊 {embeddedReports.length} PowerBI
                            </div>
                        )}
                        {iframeReports.length > 0 && (
                            <div className="stat-badge iframe">
                                🖼️ {iframeReports.length} IFrame
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="viewer-content">
                {/* PowerBI Embed Reports */}
                {embeddedReports.length > 0 && !viewerConfig.iframeMode && (
                    <div className="viewer-section">
                        <div className="section-header">
                            <h2>📊 PowerBI Embedded Reports ({embeddedReports.length})</h2>
                            <p>Rich interactive reports with full PowerBI capabilities</p>
                        </div>
                        <MultiReportViewer
                            reports={embeddedReports}
                            onRemoveReport={handleRemoveEmbeddedReport}
                            onClearAll={handleClearAllEmbedded}
                        />
                    </div>
                )}

                {/* IFrame Reports */}
                {iframeReports.length > 0 && viewerConfig.iframeMode && (
                    <div className="viewer-section">
                        <div className="section-header">
                            <h2>🖼️ IFrame Reports ({iframeReports.length})</h2>
                            <p>Lightweight iframe embedding optimized for viewing many reports</p>
                        </div>
                        <IFrameReportViewer
                            reports={iframeReports}
                            onRemoveReport={handleRemoveIFrameReport}
                            onClearAll={handleClearAllIFrame}
                            maxVisible={25}
                        />
                    </div>
                )}

                {/* Mixed Mode Display */}
                {!viewerConfig.iframeMode && iframeReports.length > 0 && (
                    <div className="viewer-section">
                        <div className="section-header">
                            <h2>🖼️ IFrame Reports ({iframeReports.length})</h2>
                            <p>Additional reports in lightweight iframe mode</p>
                        </div>
                        <IFrameReportViewer
                            reports={iframeReports}
                            onRemoveReport={handleRemoveIFrameReport}
                            onClearAll={handleClearAllIFrame}
                            maxVisible={25}
                        />
                    </div>
                )}
            </div>

            <div className="viewer-footer">
                <div className="performance-summary">
                    <h3>📈 Session Summary</h3>
                    <div className="summary-stats">
                        <div className="summary-item">
                            <span className="summary-label">Total Reports:</span>
                            <span className="summary-value">{totalReports}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">PowerBI Embedded:</span>
                            <span className="summary-value">{embeddedReports.length}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">IFrame Reports:</span>
                            <span className="summary-value">{iframeReports.length}</span>
                        </div>
                        <div className="summary-item">
                            <span className="summary-label">Viewing Mode:</span>
                            <span className="summary-value">
                                {viewerConfig.iframeMode ? 'IFrame' : 'PowerBI Embed'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
