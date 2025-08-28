// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useRef, useEffect } from 'react';
import './IFrameReportViewer.css';

export interface IFrameReport {
    id: string;
    name: string;
    embedUrl: string;
    accessToken: string;
    workspaceName: string;
    datasetName: string;
    reportType: string;
    addedAt: Date;
}

interface IFrameReportViewerProps {
    reports: IFrameReport[];
    onRemoveReport?: (reportId: string) => void;
    onClearAll?: () => void;
    maxVisible?: number;
}

export const IFrameReportViewer: React.FC<IFrameReportViewerProps> = ({
    reports,
    onRemoveReport,
    onClearAll,
    maxVisible = 12
}) => {
    const [layout, setLayout] = useState<'auto-grid' | 'masonry' | 'carousel' | 'full-grid'>('auto-grid');
    const [visibleCount, setVisibleCount] = useState<number>(Math.min(reports.length, maxVisible));
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [iframeHeight, setIframeHeight] = useState<number>(400);
    const [showControls, setShowControls] = useState<boolean>(true);
    const [fullscreenReport, setFullscreenReport] = useState<string | null>(null);

    const reportsPerPage = visibleCount;
    const totalPages = Math.ceil(reports.length / reportsPerPage);
    const currentReports = reports.slice(currentPage * reportsPerPage, (currentPage + 1) * reportsPerPage);

    const generateIframeUrl = (report: IFrameReport): string => {
        const url = new URL(report.embedUrl);
        url.searchParams.set('rs:embed', 'true');
        url.searchParams.set('accessToken', report.accessToken);
        url.searchParams.set('navContentPaneEnabled', 'false');
        url.searchParams.set('filterPaneEnabled', 'false');
        return url.toString();
    };

    const handleFullscreen = (reportId: string) => {
        setFullscreenReport(reportId);
    };

    const exitFullscreen = () => {
        setFullscreenReport(null);
    };

    if (reports.length === 0) {
        return (
            <div className="iframe-report-viewer empty">
                <div className="empty-state">
                    <h3>🖼️ IFrame Multi-Report Viewer</h3>
                    <p>No reports loaded yet. Use the workspace browser above to add multiple reports.</p>
                    <div className="empty-features">
                        <div className="feature">⚡ Lightweight iframe embedding</div>
                        <div className="feature">📊 Support for 50+ reports simultaneously</div>
                        <div className="feature">🎛️ Multiple layout options (Grid, Masonry, Carousel)</div>
                        <div className="feature">📱 Responsive pagination for performance</div>
                        <div className="feature">🖥️ Fullscreen mode for detailed analysis</div>
                        <div className="feature">⚙️ Adjustable iframe heights and columns</div>
                    </div>
                </div>
            </div>
        );
    }

    const fullscreenReportData = fullscreenReport ? reports.find(r => r.id === fullscreenReport) : null;

    return (
        <div className={`iframe-report-viewer ${fullscreenReport ? 'fullscreen-mode' : ''}`}>
            {/* Fullscreen Modal */}
            {fullscreenReport && fullscreenReportData && (
                <div className="fullscreen-overlay">
                    <div className="fullscreen-header">
                        <div className="fullscreen-info">
                            <h3>{fullscreenReportData.name}</h3>
                            <span className="fullscreen-meta">
                                {fullscreenReportData.workspaceName} • {fullscreenReportData.datasetName}
                            </span>
                        </div>
                        <button onClick={exitFullscreen} className="fullscreen-close">
                            ✕ Exit Fullscreen
                        </button>
                    </div>
                    <div className="fullscreen-content">
                        <iframe
                            src={generateIframeUrl(fullscreenReportData)}
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            title={`Fullscreen: ${fullscreenReportData.name}`}
                            loading="lazy"
                        />
                    </div>
                </div>
            )}

            {/* Main Viewer */}
            <div className="viewer-header">
                <div className="header-left">
                    <h3>🖼️ IFrame Multi-Report Viewer ({reports.length} reports)</h3>
                    {reports.length > reportsPerPage && (
                        <div className="pagination-info">
                            Page {currentPage + 1} of {totalPages} • Showing {currentReports.length} of {reports.length}
                        </div>
                    )}
                </div>
                <div className="header-controls">
                    <div className="layout-controls">
                        <label>Layout:</label>
                        <select 
                            value={layout} 
                            onChange={(e) => setLayout(e.target.value as any)}
                            className="layout-selector"
                        >
                            <option value="auto-grid">🔲 Auto Grid</option>
                            <option value="full-grid">⬜ Full Grid</option>
                            <option value="masonry">🧱 Masonry</option>
                            <option value="carousel">🎠 Carousel</option>
                        </select>
                    </div>
                    
                    <div className="visible-controls">
                        <label>Visible:</label>
                        <select 
                            value={visibleCount} 
                            onChange={(e) => {
                                setVisibleCount(Number(e.target.value));
                                setCurrentPage(0);
                            }}
                            className="visible-selector"
                        >
                            <option value={4}>4 Reports</option>
                            <option value={6}>6 Reports</option>
                            <option value={9}>9 Reports</option>
                            <option value={12}>12 Reports</option>
                            <option value={16}>16 Reports</option>
                            <option value={20}>20 Reports</option>
                            <option value={25}>25 Reports</option>
                        </select>
                    </div>

                    <div className="height-controls">
                        <label>Height:</label>
                        <select 
                            value={iframeHeight} 
                            onChange={(e) => setIframeHeight(Number(e.target.value))}
                            className="height-selector"
                        >
                            <option value={300}>300px</option>
                            <option value={400}>400px</option>
                            <option value={500}>500px</option>
                            <option value={600}>600px</option>
                            <option value={800}>800px</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={() => setShowControls(!showControls)}
                        className="toggle-controls-button"
                        title="Toggle individual report controls"
                    >
                        {showControls ? '🎛️' : '📊'}
                    </button>

                    <button 
                        onClick={onClearAll}
                        className="clear-all-button"
                        title="Remove all reports"
                    >
                        🗑️ Clear All
                    </button>
                </div>
            </div>

            {/* Pagination */}
            {reports.length > reportsPerPage && (
                <div className="pagination-controls">
                    <button 
                        onClick={() => setCurrentPage(0)}
                        disabled={currentPage === 0}
                        className="pagination-button"
                    >
                        ⏮️ First
                    </button>
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                        disabled={currentPage === 0}
                        className="pagination-button"
                    >
                        ⬅️ Prev
                    </button>
                    <span className="pagination-status">
                        {currentPage + 1} / {totalPages}
                    </span>
                    <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="pagination-button"
                    >
                        Next ➡️
                    </button>
                    <button 
                        onClick={() => setCurrentPage(totalPages - 1)}
                        disabled={currentPage === totalPages - 1}
                        className="pagination-button"
                    >
                        Last ⏭️
                    </button>
                </div>
            )}

            {/* Reports Grid */}
            <div className={`reports-container ${layout}`}>
                {currentReports.map((report, index) => (
                    <div 
                        key={report.id} 
                        className="iframe-report-card"
                        style={{ 
                            height: layout === 'masonry' ? `${iframeHeight + (index % 3) * 100}px` : `${iframeHeight + 60}px`
                        }}
                    >
                        {showControls && (
                            <div className="report-header">
                                <div className="report-info">
                                    <h4 className="report-title" title={report.name}>
                                        {report.name}
                                    </h4>
                                    <div className="report-meta">
                                        <span className="workspace-tag">{report.workspaceName}</span>
                                        <span className="dataset-tag">{report.datasetName}</span>
                                        <span className="type-tag">{report.reportType}</span>
                                    </div>
                                </div>
                                <div className="report-controls">
                                    <button
                                        onClick={() => handleFullscreen(report.id)}
                                        className="fullscreen-button"
                                        title="View in fullscreen"
                                    >
                                        🔍
                                    </button>
                                    {onRemoveReport && (
                                        <button
                                            onClick={() => onRemoveReport(report.id)}
                                            className="remove-button"
                                            title="Remove report"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="iframe-container">
                            <iframe
                                src={generateIframeUrl(report)}
                                width="100%"
                                height={iframeHeight}
                                frameBorder="0"
                                title={report.name}
                                loading="lazy"
                                sandbox="allow-scripts allow-same-origin allow-forms"
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Performance Info */}
            <div className="performance-info">
                <div className="performance-stats">
                    <span>🔋 Loaded: {currentReports.length}</span>
                    <span>💾 Total: {reports.length}</span>
                    <span>📏 Height: {iframeHeight}px</span>
                    <span>⚡ Layout: {layout}</span>
                </div>
            </div>
        </div>
    );
};
