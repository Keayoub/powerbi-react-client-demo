// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkspaceBrowser } from '../workspace-browser/WorkspaceBrowser';
import { EmbeddedReport } from '../multi-report-viewer/MultiReportViewer';
import { IFrameReport } from '../iframe-report-viewer/IFrameReportViewer';
import { DebugPanel } from '../debug-panel/DebugPanel';
import { ReportSearch } from '../features/ReportSearch';
import { DashboardTileSelector, EmbeddedDashboard, EmbeddedTile } from '../features/DashboardTileSelector';
import { BookmarkSelector } from '../features/BookmarkSelector';
import './ConfigurationPage.css';

export const ConfigurationPage: React.FC = () => {
    const navigate = useNavigate();
    
    // Shared state for collected reports
    const [embeddedReports, setEmbeddedReports] = useState<EmbeddedReport[]>([]);
    const [iframeReports, setIframeReports] = useState<IFrameReport[]>([]);
    const [embeddedDashboards, setEmbeddedDashboards] = useState<EmbeddedDashboard[]>([]);
    const [embeddedTiles, setEmbeddedTiles] = useState<EmbeddedTile[]>([]);
    
    // Configuration settings
    const [multiReportMode, setMultiReportMode] = useState<boolean>(true);
    const [iframeMode, setIframeMode] = useState<boolean>(false);
    const [autoNavigate, setAutoNavigate] = useState<boolean>(false);
    
    // Search and filter state
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [searchFilters, setSearchFilters] = useState<any>({});
    
    const allReports = [...embeddedReports, ...iframeReports, ...embeddedDashboards, ...embeddedTiles];
    
    // Extract unique workspace names for filtering
    const availableWorkspaces = Array.from(new Set(allReports.map(report => report.workspaceName)));
    
    const filteredReports = allReports.filter(report => {
        // Basic search filtering
        const matchesSearch = !searchTerm || 
            report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.workspaceName.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Workspace filter
        const matchesWorkspace = !searchFilters.workspace || 
            report.workspaceName === searchFilters.workspace;
        
        // Type filter - categorize by report type
        const matchesType = !searchFilters.type || 
            (searchFilters.type === 'Report' && ('reportType' in report)) ||
            (searchFilters.type === 'Dashboard' && ('type' in report && report.type === 'dashboard')) ||
            (searchFilters.type === 'Tile' && ('type' in report && report.type === 'tile'));
        
        // Date range filter - use addedAt date
        const matchesDateRange = !searchFilters.dateRange || (() => {
            if (!('addedAt' in report)) return true;
            
            const reportDate = new Date(report.addedAt);
            const now = new Date();
            
            switch (searchFilters.dateRange) {
                case 'today':
                    return reportDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return reportDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return reportDate >= monthAgo;
                default:
                    return true;
            }
        })();
        
        // Favorite filter (placeholder - would need favorites persistence)
        const matchesFavorite = !searchFilters.favorite || 
            ('isFavorite' in report ? report.isFavorite : false);
        
        return matchesSearch && matchesWorkspace && matchesType && matchesDateRange && matchesFavorite;
    });
    
    const handleReportAdded = (report: EmbeddedReport) => {
        setEmbeddedReports(prev => {
            if (prev.some(r => r.id === report.id)) {
                return prev;
            }
            const newReports = [...prev, report];
            
            if (autoNavigate) {
                navigate('/reports');
            }
            
            return newReports;
        });
    };

    const handleIFrameReportAdded = (report: IFrameReport) => {
        setIframeReports(prev => {
            if (prev.some(r => r.id === report.id)) {
                return prev;
            }
            const newReports = [...prev, report];
            
            if (autoNavigate) {
                navigate('/reports');
            }
            
            return newReports;
        });
    };

    const handleDashboardAdded = (dashboard: EmbeddedDashboard) => {
        setEmbeddedDashboards(prev => {
            if (prev.some(d => d.id === dashboard.id)) {
                return prev;
            }
            const newDashboards = [...prev, dashboard];
            
            if (autoNavigate) {
                navigate('/reports');
            }
            
            return newDashboards;
        });
    };

    const handleTileAdded = (tile: EmbeddedTile) => {
        setEmbeddedTiles(prev => {
            if (prev.some(t => t.id === tile.id)) {
                return prev;
            }
            const newTiles = [...prev, tile];
            
            if (autoNavigate) {
                navigate('/reports');
            }
            
            return newTiles;
        });
    };

    const handleGoToReports = () => {
        // Pass the reports via sessionStorage for the ReportViewerPage
        sessionStorage.setItem('embeddedReports', JSON.stringify(embeddedReports));
        sessionStorage.setItem('iframeReports', JSON.stringify(iframeReports));
        sessionStorage.setItem('embeddedDashboards', JSON.stringify(embeddedDashboards));
        sessionStorage.setItem('embeddedTiles', JSON.stringify(embeddedTiles));
        sessionStorage.setItem('viewerConfig', JSON.stringify({
            multiReportMode,
            iframeMode
        }));
        navigate('/reports');
    };

    const totalReports = embeddedReports.length + iframeReports.length + embeddedDashboards.length + embeddedTiles.length;

    return (
        <div className="configuration-page">
            <div className="config-header">
                <div className="header-content">
                    <h1>⚙️ Configuration & Report Selection</h1>
                    <p>Configure your viewing preferences and select reports to view</p>
                </div>
                
                <div className="header-stats">
                    <div className="stat-item">
                        <span className="stat-value">{embeddedReports.length}</span>
                        <span className="stat-label">PowerBI Reports</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{iframeReports.length}</span>
                        <span className="stat-label">IFrame Reports</span>
                    </div>
                    <div className="stat-item total">
                        <span className="stat-value">{totalReports}</span>
                        <span className="stat-label">Total Selected</span>
                    </div>
                </div>
            </div>

            <div className="config-content">
                {/* Search Component */}
                <ReportSearch
                    onSearchTermChange={setSearchTerm}
                    onFilterChange={setSearchFilters}
                    totalReports={allReports.length}
                    filteredReports={filteredReports.length}
                    availableWorkspaces={availableWorkspaces}
                />
                
                <div className="config-content-inner">
                    <div className="config-sidebar">
                    <div className="settings-panel">
                        <h3>🎛️ Viewer Settings</h3>
                        
                        <div className="setting-group">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={multiReportMode}
                                    onChange={(e) => setMultiReportMode(e.target.checked)}
                                />
                                <span className="setting-text">
                                    📊 Multi-Report Mode
                                </span>
                            </label>
                            <p className="setting-description">
                                {multiReportMode 
                                    ? 'Enable viewing multiple reports simultaneously'
                                    : 'Traditional single report viewing'
                                }
                            </p>
                        </div>

                        {multiReportMode && (
                            <div className="setting-group">
                                <label className="setting-label">
                                    <input
                                        type="checkbox"
                                        checked={iframeMode}
                                        onChange={(e) => setIframeMode(e.target.checked)}
                                    />
                                    <span className="setting-text">
                                        🖼️ IFrame Mode
                                    </span>
                                </label>
                                <p className="setting-description">
                                    {iframeMode 
                                        ? 'Lightweight iframe embedding for 50+ reports'
                                        : 'Rich PowerBI embed with full interactivity'
                                    }
                                </p>
                            </div>
                        )}

                        <div className="setting-group">
                            <label className="setting-label">
                                <input
                                    type="checkbox"
                                    checked={autoNavigate}
                                    onChange={(e) => setAutoNavigate(e.target.checked)}
                                />
                                <span className="setting-text">
                                    🚀 Auto Navigate
                                </span>
                            </label>
                            <p className="setting-description">
                                Automatically navigate to report viewer when adding reports
                            </p>
                        </div>
                    </div>

                    <div className="selected-reports-panel">
                        <h3>📋 Selected Reports ({totalReports})</h3>
                        
                        {embeddedReports.length > 0 && (
                            <div className="report-section">
                                <h4>📊 PowerBI Reports ({embeddedReports.length})</h4>
                                <div className="report-list">
                                    {embeddedReports.map((report) => (
                                        <div key={report.id} className="report-item powerbi">
                                            <div className="report-info">
                                                <span className="report-name">{report.name}</span>
                                                <span className="report-workspace">{report.workspaceName}</span>
                                            </div>
                                            <button
                                                onClick={() => setEmbeddedReports(prev => prev.filter(r => r.id !== report.id))}
                                                className="remove-button"
                                                title="Remove report"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {iframeReports.length > 0 && (
                            <div className="report-section">
                                <h4>🖼️ IFrame Reports ({iframeReports.length})</h4>
                                <div className="report-list">
                                    {iframeReports.map((report) => (
                                        <div key={report.id} className="report-item iframe">
                                            <div className="report-info">
                                                <span className="report-name">{report.name}</span>
                                                <span className="report-workspace">{report.workspaceName}</span>
                                            </div>
                                            <button
                                                onClick={() => setIframeReports(prev => prev.filter(r => r.id !== report.id))}
                                                className="remove-button"
                                                title="Remove report"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {totalReports === 0 && (
                            <div className="no-reports">
                                <p>No reports selected yet</p>
                                <p>👈 Use the workspace browser to select reports</p>
                            </div>
                        )}

                        {totalReports > 0 && (
                            <div className="action-buttons">
                                <button
                                    onClick={handleGoToReports}
                                    className="primary-action"
                                >
                                    🚀 View Reports ({totalReports})
                                </button>
                                <button
                                    onClick={() => {
                                        setEmbeddedReports([]);
                                        setIframeReports([]);
                                    }}
                                    className="secondary-action"
                                >
                                    🗑️ Clear All
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="config-main">
                    <div className="workspace-browser-container">
                        <WorkspaceBrowser
                            multiReportMode={multiReportMode}
                            iframeMode={iframeMode}
                            onReportAdded={handleReportAdded}
                            onIFrameReportAdded={handleIFrameReportAdded}
                            onDashboardAdded={handleDashboardAdded}
                            onTileAdded={handleTileAdded}
                        />
                    </div>
                </div>
                </div>
            </div>
            
            {/* Debug Panel */}
            <DebugPanel />
        </div>
    );
};
