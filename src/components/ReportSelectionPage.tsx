// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState } from 'react';
import { EmbeddedPowerBIContainer } from './EmbeddedPowerBIContainer';
import { WorkspaceBrowser } from './workspace-browser/WorkspaceBrowser';
import PowerBIErrorBoundary from './PowerBIErrorBoundary';
import './ReportSelectionPage.css';

interface SelectedReport {
    id: string;
    name: string;
    embedUrl: string;
    accessToken: string;
    workspaceName: string;
}

export const ReportSelectionPage: React.FC = () => {
    const [selectedReports, setSelectedReports] = useState<SelectedReport[]>([]);
    const [showBrowser, setShowBrowser] = useState(true);

    const handleReportSelected = (report: {
        id: string;
        name: string;
        embedUrl: string;
        accessToken: string;
        workspaceName: string;
        datasetName: string;
        reportType: string;
        embedConfig: any;
    }) => {
        console.log('Report selected:', report);
        const newReport: SelectedReport = {
            id: report.id,
            name: report.name,
            embedUrl: report.embedUrl,
            accessToken: report.accessToken,
            workspaceName: report.workspaceName
        };
        
        // Check if report already exists
        const existingReportIndex = selectedReports.findIndex(r => r.id === report.id);
        if (existingReportIndex === -1) {
            setSelectedReports(prev => [...prev, newReport]);
        }
        
        // Switch to multi-report view
        setShowBrowser(false);
    };

    const handleEmbedTokenGenerated = (token: string, embedUrl: string, selection: any) => {
        console.log('Embed token generated:', { token, embedUrl, selection });
        if (selection.report) {
            const newReport: SelectedReport = {
                id: selection.report.id,
                name: selection.report.name,
                embedUrl: embedUrl,
                accessToken: token,
                workspaceName: selection.workspace?.name || 'Unknown'
            };
            
            // Check if report already exists
            const existingReportIndex = selectedReports.findIndex(r => r.id === selection.report.id);
            if (existingReportIndex === -1) {
                setSelectedReports(prev => [...prev, newReport]);
            }
            
            // Switch to multi-report view
            setShowBrowser(false);
        }
    };

    const handleBackToSelection = () => {
        setShowBrowser(true);
    };

    const handleRemoveReport = (reportId: string) => {
        setSelectedReports(prev => prev.filter(r => r.id !== reportId));
    };

    const handleClearAllReports = () => {
        setSelectedReports([]);
    };

    // Report control handlers
    const handlePrintReport = async (reportId: string) => {
        try {
            const reportInstance = (window as any)[`powerbiReport_${reportId}`];
            if (reportInstance && reportInstance.print) {
                await reportInstance.print();
                console.log(`Print initiated for report: ${reportId}`);
            } else {
                console.warn(`Report instance not found for printing: ${reportId}`);
                // Fallback: open print dialog for the container
                window.print();
            }
        } catch (error) {
            console.error('Error printing report:', error);
            alert('Could not print report. Please try again.');
        }
    };

    const handleFullscreenReport = async (reportId: string) => {
        try {
            const reportInstance = (window as any)[`powerbiReport_${reportId}`];
            if (reportInstance && reportInstance.fullscreen) {
                await reportInstance.fullscreen();
                console.log(`Fullscreen activated for report: ${reportId}`);
            } else {
                console.warn(`Report instance not found for fullscreen: ${reportId}`);
                // Fallback: find the report container and request fullscreen
                const container = document.querySelector(`[data-report-id="${reportId}"]`);
                if (container && container.requestFullscreen) {
                    container.requestFullscreen();
                }
            }
        } catch (error) {
            console.error('Error entering fullscreen:', error);
            alert('Could not enter fullscreen mode. Please try again.');
        }
    };

    const handleRefreshReport = async (reportId: string) => {
        try {
            const reportInstance = (window as any)[`powerbiReport_${reportId}`];
            if (reportInstance && reportInstance.refresh) {
                await reportInstance.refresh();
                console.log(`Report refreshed: ${reportId}`);
            } else {
                console.warn(`Report instance not found for refresh: ${reportId}`);
                // Fallback: reload the page
                window.location.reload();
            }
        } catch (error) {
            console.error('Error refreshing report:', error);
            alert('Could not refresh report. Please try again.');
        }
    };

    const handleExportReport = async (reportId: string) => {
        try {
            const reportInstance = (window as any)[`powerbiReport_${reportId}`];
            if (reportInstance && reportInstance.exportData) {
                // Export to PDF is most common
                const exportConfig = {
                    format: 'PDF',
                    layout: 'Landscape',
                    settings: {
                        includeHiddenPages: false
                    }
                };
                await reportInstance.exportData(exportConfig);
                console.log(`Export initiated for report: ${reportId}`);
            } else {
                console.warn(`Report instance not found for export: ${reportId}`);
                alert('Export functionality requires a valid report instance.');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            alert('Could not export report. Please check permissions and try again.');
        }
    };

    return (
        <div className="report-selection-page">
            {showBrowser ? (
                <div className="workspace-browser-container">
                    <div className="page-header">
                        <h2>📊 Select a PowerBI Report</h2>
                        <p>Choose a workspace and report to embed</p>
                    </div>
                    
                    <PowerBIErrorBoundary>
                        <WorkspaceBrowser
                            onReportAdded={handleReportSelected}
                            onEmbedTokenGenerated={handleEmbedTokenGenerated}
                            multiReportMode={true}
                            iframeMode={false}
                        />
                    </PowerBIErrorBoundary>
                </div>
            ) : (
                <div className="multi-report-container">
                    <div className="page-header">
                        <div className="header-controls">
                            <button 
                                className="back-button"
                                onClick={handleBackToSelection}
                            >
                                ← Add More Reports
                            </button>
                            {selectedReports.length > 0 && (
                                <button 
                                    className="clear-button"
                                    onClick={handleClearAllReports}
                                >
                                    🗑️ Clear All Reports
                                </button>
                            )}
                        </div>
                        <h2>📈 Multi-Report Dashboard ({selectedReports.length} reports)</h2>
                        <p>Selected reports from various workspaces</p>
                    </div>

                    {selectedReports.length === 0 ? (
                        <div className="no-reports">
                            <p>No reports selected. Click "Add More Reports" to get started.</p>
                        </div>
                    ) : (
                        <div className="reports-grid">
                            {selectedReports.map((report, index) => (
                                <div key={report.id} className="report-card">
                                    <div className="report-header">
                                        <div className="report-info">
                                            <h3>{report.name}</h3>
                                            <p>Workspace: {report.workspaceName}</p>
                                        </div>
                                        <div className="report-controls">
                                            <button 
                                                className="control-button"
                                                onClick={() => handlePrintReport(report.id)}
                                                title="Print Report"
                                            >
                                                🖨️
                                            </button>
                                            <button 
                                                className="control-button"
                                                onClick={() => handleFullscreenReport(report.id)}
                                                title="Fullscreen"
                                            >
                                                🔍
                                            </button>
                                            <button 
                                                className="control-button"
                                                onClick={() => handleRefreshReport(report.id)}
                                                title="Refresh Data"
                                            >
                                                🔄
                                            </button>
                                            <button 
                                                className="control-button"
                                                onClick={() => handleExportReport(report.id)}
                                                title="Export Report"
                                            >
                                                📤
                                            </button>
                                            <button 
                                                className="remove-button"
                                                onClick={() => handleRemoveReport(report.id)}
                                                title="Remove this report"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="report-debug">
                                        <small>
                                            ID: {report.id} | 
                                            Token: {report.accessToken ? '✓' : '✗'}
                                        </small>
                                    </div>
                                    
                                    <PowerBIErrorBoundary>
                                        <EmbeddedPowerBIContainer
                                            reportId={report.id}
                                            embedUrl={report.embedUrl}
                                            accessToken={report.accessToken}
                                            priority='high'
                                            height="500px"
                                            onLoaded={(reportInstance: any) => {
                                                console.log(`Report ${index + 1} loaded:`, reportInstance);
                                                // Store reference for control operations
                                                (window as any)[`powerbiReport_${report.id}`] = reportInstance;
                                            }}
                                            onError={(error: any) => {
                                                console.error(`Report ${index + 1} error:`, error);
                                            }}
                                        />
                                    </PowerBIErrorBoundary>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
