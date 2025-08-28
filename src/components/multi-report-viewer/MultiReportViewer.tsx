// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState } from 'react';
import { models, Report } from 'powerbi-client';
import { EmbeddedPowerBIContainer } from '../EmbeddedPowerBIContainer';
import { BookmarkManager } from '../features/BookmarkManager';
import { ReportActions } from '../features/ReportActions';
import './MultiReportViewer.css';

export interface EmbeddedReport {
    id: string;
    name: string;
    embedUrl: string;
    accessToken: string;
    workspaceName: string;
    datasetName: string;
    reportType: string;
    embedConfig: models.IReportEmbedConfiguration;
}

interface MultiReportViewerProps {
    reports: EmbeddedReport[];
    onRemoveReport?: (reportId: string) => void;
    onClearAll?: () => void;
}

export const MultiReportViewer: React.FC<MultiReportViewerProps> = ({
    reports,
    onRemoveReport,
    onClearAll
}) => {
    const [layout, setLayout] = useState<'grid' | 'tabs' | 'stack'>('grid');
    const [activeTab, setActiveTab] = useState<string>(reports[0]?.id || '');
    const [gridColumns, setGridColumns] = useState<1 | 2 | 3>(2);
    const [reportInstances, setReportInstances] = useState<Map<string, Report>>(new Map());
    const [showBookmarkManager, setShowBookmarkManager] = useState<string | null>(null);

    const handleReportLoaded = (reportId: string) => {
        console.log(`Report ${reportId} loaded successfully`);
    };

    const handleReportError = (reportId: string, error: any) => {
        console.error(`Report ${reportId} failed to load:`, error);
    };

    const handleGetEmbedded = (reportId: string, report: Report) => {
        setReportInstances(prev => new Map(prev.set(reportId, report)));
    };

    if (reports.length === 0) {
        return (
            <div className="multi-report-viewer empty">
                <div className="empty-state">
                    <h3>📊 Multi-Report Viewer</h3>
                    <p>No reports loaded yet. Use the workspace browser above to select and load multiple reports.</p>
                    <div className="empty-features">
                        <div className="feature">✅ Load multiple reports simultaneously</div>
                        <div className="feature">✅ Switch between grid, tabs, and stack layouts</div>
                        <div className="feature">✅ Independent controls for each report</div>
                        <div className="feature">✅ Responsive design for different screen sizes</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="multi-report-viewer">
            <div className="viewer-header">
                <div className="header-left">
                    <h3>📊 Multi-Report Viewer ({reports.length} reports)</h3>
                </div>
                <div className="header-controls">
                    <div className="layout-controls">
                        <label>Layout:</label>
                        <select 
                            value={layout} 
                            onChange={(e) => setLayout(e.target.value as 'grid' | 'tabs' | 'stack')}
                            className="layout-selector"
                        >
                            <option value="grid">🏢 Grid</option>
                            <option value="tabs">📑 Tabs</option>
                            <option value="stack">📚 Stack</option>
                        </select>
                    </div>
                    
                    {layout === 'grid' && (
                        <div className="grid-controls">
                            <label>Columns:</label>
                            <select 
                                value={gridColumns} 
                                onChange={(e) => setGridColumns(Number(e.target.value) as 1 | 2 | 3)}
                                className="grid-selector"
                            >
                                <option value={1}>1 Column</option>
                                <option value={2}>2 Columns</option>
                                <option value={3}>3 Columns</option>
                            </select>
                        </div>
                    )}
                    
                    <button 
                        onClick={onClearAll}
                        className="clear-all-button"
                        title="Remove all reports"
                    >
                        🗑️ Clear All
                    </button>
                </div>
            </div>

            {/* Tabs Layout */}
            {layout === 'tabs' && (
                <div className="tabs-layout">
                    <div className="tab-headers">
                        {reports.map((report) => (
                            <button
                                key={report.id}
                                className={`tab-header ${activeTab === report.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(report.id)}
                            >
                                <span className="tab-title">{report.name}</span>
                                <span className="tab-workspace">({report.workspaceName})</span>
                                {onRemoveReport && (
                                    <button
                                        className="tab-close"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveReport(report.id);
                                            if (activeTab === report.id && reports.length > 1) {
                                                setActiveTab(reports.find(r => r.id !== report.id)?.id || '');
                                            }
                                        }}
                                        title="Remove report"
                                    >
                                        ×
                                    </button>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="tab-content">
                        {reports.map((report) => (
                            <div
                                key={report.id}
                                className={`tab-panel ${activeTab === report.id ? 'active' : ''}`}
                            >
                                <ReportPanel 
                                    report={report}
                                    onRemove={onRemoveReport}
                                    onLoaded={() => handleReportLoaded(report.id)}
                                    onError={(error) => handleReportError(report.id, error)}
                                    showControls={false}
                                    layout={layout}
                                    gridColumns={gridColumns}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Grid Layout */}
            {layout === 'grid' && (
                <div className={`grid-layout columns-${gridColumns}`}>
                    {reports.map((report) => (
                        <ReportPanel 
                            key={report.id}
                            report={report}
                            reportInstance={reportInstances.get(report.id) || null}
                            onRemove={onRemoveReport}
                            onLoaded={() => handleReportLoaded(report.id)}
                            onError={(error) => handleReportError(report.id, error)}
                            onGetEmbedded={(embeddedReport) => handleGetEmbedded(report.id, embeddedReport)}
                            onShowBookmarks={() => setShowBookmarkManager(report.id)}
                            showControls={true}
                            layout={layout}
                            gridColumns={gridColumns}
                        />
                    ))}
                </div>
            )}

            {/* Stack Layout */}
            {layout === 'stack' && (
                <div className="stack-layout">
                    {reports.map((report) => (
                        <ReportPanel 
                            key={report.id}
                            report={report}
                            reportInstance={reportInstances.get(report.id) || null}
                            onRemove={onRemoveReport}
                            onLoaded={() => handleReportLoaded(report.id)}
                            onError={(error) => handleReportError(report.id, error)}
                            onGetEmbedded={(embeddedReport) => handleGetEmbedded(report.id, embeddedReport)}
                            onShowBookmarks={() => setShowBookmarkManager(report.id)}
                            showControls={true}
                        />
                    ))}
                </div>
            )}

            {/* Bookmark Manager */}
            {showBookmarkManager && (
                <BookmarkManager
                    report={reportInstances.get(showBookmarkManager) || null}
                    reportId={showBookmarkManager}
                    reportName={reports.find(r => r.id === showBookmarkManager)?.name || 'Unknown'}
                    isVisible={true}
                    onClose={() => setShowBookmarkManager(null)}
                />
            )}
        </div>
    );
};

interface ReportPanelProps {
    report: EmbeddedReport;
    reportInstance?: Report | null;
    onRemove?: (reportId: string) => void;
    onLoaded: () => void;
    onError: (error: any) => void;
    onGetEmbedded?: (embeddedReport: Report) => void;
    onShowBookmarks?: () => void;
    showControls: boolean;
    layout?: 'grid' | 'tabs' | 'stack';
    gridColumns?: number;
}

const ReportPanel: React.FC<ReportPanelProps> = ({
    report,
    reportInstance,
    onRemove,
    onLoaded,
    onError,
    onGetEmbedded,
    onShowBookmarks,
    showControls,
    layout = 'grid',
    gridColumns = 2
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className={`report-panel ${!isExpanded ? 'collapsed' : ''}`}>
            {showControls && (
                <div className="panel-header">
                    <div className="panel-info">
                        <h4 className="report-title">{report.name}</h4>
                        <div className="report-meta">
                            <span className="workspace-tag">{report.workspaceName}</span>
                            <span className="dataset-tag">{report.datasetName}</span>
                            <span className="type-tag">{report.reportType}</span>
                        </div>
                    </div>
                    <div className="panel-controls">
                        <button
                            onClick={onShowBookmarks}
                            className="bookmark-button"
                            title="Manage bookmarks"
                            disabled={!reportInstance}
                        >
                            🔖
                        </button>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="expand-button"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? '⬆️' : '⬇️'}
                        </button>
                        {onRemove && (
                            <button
                                onClick={() => onRemove(report.id)}
                                className="remove-button"
                                title="Remove report"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            {/* Report Actions */}
            {showControls && isExpanded && reportInstance && (
                <ReportActions
                    report={reportInstance}
                    reportId={report.id}
                    reportName={report.name}
                />
            )}
            
            {isExpanded && (
                <div className="panel-content">
                    <EmbeddedPowerBIContainer
                        reportId={report.id}
                        embedUrl={report.embedUrl}
                        accessToken={report.accessToken}
                        className="multi-report-frame"
                        onLoaded={onLoaded}
                        onError={onError}
                        height="400px"
                    />
                </div>
            )}
        </div>
    );
};
