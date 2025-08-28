// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PowerBIWorkspaceService, PowerBIWorkspace, PowerBIDataset, PowerBIReport } from '../../services/powerbi-workspace-service';
import { DashboardTileSelector } from '../features/DashboardTileSelector';
import './WorkspaceBrowser.css';

interface SelectedItem {
    workspace?: PowerBIWorkspace;
    dataset?: PowerBIDataset;
    report?: PowerBIReport;
}

interface WorkspaceBrowserProps {
    onSelectionChange?: (selection: SelectedItem) => void;
    onEmbedTokenGenerated?: (token: string, embedUrl: string, selection: SelectedItem) => void;
    onReportAdded?: (report: {
        id: string;
        name: string;
        embedUrl: string;
        accessToken: string;
        workspaceName: string;
        datasetName: string;
        reportType: string;
        embedConfig: any;
    }) => void;
    onIFrameReportAdded?: (report: {
        id: string;
        name: string;
        embedUrl: string;
        accessToken: string;
        workspaceName: string;
        datasetName: string;
        reportType: string;
        addedAt: Date;
    }) => void;
    onDashboardAdded?: (dashboard: any) => void;
    onTileAdded?: (tile: any) => void;
    multiReportMode?: boolean;
    iframeMode?: boolean;
}

export const WorkspaceBrowser: React.FC<WorkspaceBrowserProps> = ({ 
    onSelectionChange, 
    onEmbedTokenGenerated,
    onReportAdded,
    onIFrameReportAdded,
    onDashboardAdded,
    onTileAdded,
    multiReportMode = false,
    iframeMode = false
}) => {
    const { powerBiToken, isAuthenticated, login, loading: authLoading, error: authError } = useAuth();
    const [workspaces, setWorkspaces] = useState<PowerBIWorkspace[]>([]);
    const [datasets, setDatasets] = useState<PowerBIDataset[]>([]);
    const [reports, setReports] = useState<PowerBIReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [selectedWorkspace, setSelectedWorkspace] = useState<PowerBIWorkspace | null>(null);
    const [selectedDataset, setSelectedDataset] = useState<PowerBIDataset | null>(null);
    const [selectedReport, setSelectedReport] = useState<PowerBIReport | null>(null);
    
    const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
    const [expandedDataset, setExpandedDataset] = useState<string | null>(null);
    const [showDashboardTileSelector, setShowDashboardTileSelector] = useState(false);

    // Load workspaces when component mounts and user is authenticated
    useEffect(() => {
        if (isAuthenticated && powerBiToken) {
            loadWorkspaces();
        }
    }, [isAuthenticated, powerBiToken]);

    // Notify parent of selection changes
    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange({
                workspace: selectedWorkspace || undefined,
                dataset: selectedDataset || undefined,
                report: selectedReport || undefined
            });
        }
    }, [selectedWorkspace, selectedDataset, selectedReport, onSelectionChange]);

    const loadWorkspaces = async () => {
        if (!powerBiToken) return;

        setLoading(true);
        setError(null);
        
        try {
            const service = new PowerBIWorkspaceService(powerBiToken);
            const workspaceList = await service.getWorkspaces();
            setWorkspaces(workspaceList);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load workspaces';
            setError(errorMessage);
            console.error('Error loading workspaces:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadDatasetsAndReports = async (workspace: PowerBIWorkspace) => {
        if (!powerBiToken) return;

        setLoading(true);
        setError(null);

        try {
            const service = new PowerBIWorkspaceService(powerBiToken);
            const [datasetList, reportList] = await Promise.all([
                service.getDatasets(workspace.id),
                service.getReports(workspace.id)
            ]);
            
            setDatasets(datasetList);
            setReports(reportList);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load datasets and reports';
            setError(errorMessage);
            console.error('Error loading datasets and reports:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceClick = async (workspace: PowerBIWorkspace) => {
        if (expandedWorkspace === workspace.id) {
            // Collapse workspace
            setExpandedWorkspace(null);
            setSelectedWorkspace(null);
            setSelectedDataset(null);
            setSelectedReport(null);
            setDatasets([]);
            setReports([]);
        } else {
            // Expand workspace and select it
            setExpandedWorkspace(workspace.id);
            setSelectedWorkspace(workspace);
            // Clear previous selections when switching workspaces
            setSelectedDataset(null);
            setSelectedReport(null);
            setExpandedDataset(null);
            await loadDatasetsAndReports(workspace);
        }
    };

    const handleDatasetClick = (dataset: PowerBIDataset) => {
        if (selectedDataset?.id === dataset.id) {
            // Deselect if clicking the same dataset
            setSelectedDataset(null);
            setSelectedReport(null);
            setExpandedDataset(null);
        } else {
            // Select new dataset
            setSelectedDataset(dataset);
            setSelectedReport(null); // Clear report selection when changing dataset
            setExpandedDataset(dataset.id);
        }
    };

    const handleReportClick = (report: PowerBIReport) => {
        if (selectedReport?.id === report.id) {
            // Deselect if clicking the same report
            setSelectedReport(null);
        } else {
            // Select new report
            setSelectedReport(report);
        }
    };

    const generateEmbedToken = async () => {
        if (!powerBiToken || !selectedReport || !selectedDataset || !selectedWorkspace) {
            setError('Please select a workspace, dataset, and report first');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('Starting embed token generation for:', {
                workspace: selectedWorkspace?.name,
                dataset: selectedDataset?.name,
                report: selectedReport?.name,
                workspaceId: selectedWorkspace?.id,
                datasetId: selectedDataset?.id,
                reportId: selectedReport?.id
            });

            const service = new PowerBIWorkspaceService(powerBiToken);
            const token = await service.generateEmbedToken(
                selectedReport.id,
                [selectedDataset.id],
                selectedWorkspace.id
            );

            console.log('Embed token generated successfully');

            if (multiReportMode && iframeMode && onIFrameReportAdded) {
                // Add to iframe multi-report viewer
                const iframeReport = {
                    id: selectedReport.id,
                    name: selectedReport.name,
                    embedUrl: selectedReport.embedUrl,
                    accessToken: token,
                    workspaceName: selectedWorkspace.name,
                    datasetName: selectedDataset.name,
                    reportType: selectedReport.reportType,
                    addedAt: new Date()
                };
                
                onIFrameReportAdded(iframeReport);
                
                // Clear selection after adding to allow selecting another report
                setSelectedReport(null);
                setExpandedDataset(null);
            } else if (multiReportMode && onReportAdded) {
                // Add to multi-report viewer
                const reportConfig = {
                    id: selectedReport.id,
                    name: selectedReport.name,
                    embedUrl: selectedReport.embedUrl,
                    accessToken: token,
                    workspaceName: selectedWorkspace.name,
                    datasetName: selectedDataset.name,
                    reportType: selectedReport.reportType,
                    embedConfig: {
                        type: 'report',
                        embedUrl: selectedReport.embedUrl,
                        tokenType: 1, // TokenType.Embed
                        accessToken: token,
                        settings: {
                            panes: {
                                filters: {
                                    expanded: false,
                                    visible: true
                                }
                            }
                        }
                    }
                };
                
                onReportAdded(reportConfig);
                
                // Clear selection after adding to allow selecting another report
                setSelectedReport(null);
                setExpandedDataset(null);
            } else if (onEmbedTokenGenerated) {
                // Single report mode
                onEmbedTokenGenerated(token, selectedReport.embedUrl, {
                    workspace: selectedWorkspace,
                    dataset: selectedDataset,
                    report: selectedReport
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate embed token';
            setError(errorMessage);
            console.error('Error generating embed token:', {
                error: err,
                selectedWorkspace: selectedWorkspace?.name,
                selectedDataset: selectedDataset?.name,
                selectedReport: selectedReport?.name,
                workspaceId: selectedWorkspace?.id,
                datasetId: selectedDataset?.id,
                reportId: selectedReport?.id
            });
        } finally {
            setLoading(false);
        }
    };

    const getReportsForDataset = (datasetId: string): PowerBIReport[] => {
        return reports.filter(report => report.datasetId === datasetId);
    };

    if (!isAuthenticated) {
        return (
            <div className="workspace-browser">
                <div className="auth-required">
                    <p>Please sign in to browse Power BI workspaces</p>
                    <button 
                        className="sign-in-button"
                        onClick={login}
                        disabled={authLoading}
                    >
                        {authLoading ? 'Connecting...' : 'Sign In with Microsoft'}
                    </button>
                    {authError && (
                        <div className="auth-error">
                            <p>Error: {authError}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="workspace-browser">
            <div className="browser-header">
                <h3>Power BI Workspace Browser</h3>
                <div className="header-controls">
                    <div className="mode-toggle">
                        <label>
                            <input
                                type="checkbox"
                                checked={multiReportMode}
                                onChange={(e) => {
                                    // This would need to be controlled by parent component
                                    console.log('Multi-report mode:', e.target.checked);
                                }}
                                disabled={true} // Controlled by parent
                            />
                            📊 Multi-Report Mode
                        </label>
                    </div>
                    <button 
                        onClick={loadWorkspaces} 
                        disabled={loading || !powerBiToken}
                        className="refresh-button"
                    >
                        {loading ? '🔄' : '↻'} Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <span>❌ {error}</span>
                </div>
            )}

            {loading && (
                <div className="loading-indicator">
                    <span>🔄 Loading...</span>
                </div>
            )}

            <div className="workspace-list">
                {workspaces.map(workspace => (
                    <div key={workspace.id} className="workspace-item">
                        <div 
                            className={`workspace-header ${selectedWorkspace?.id === workspace.id ? 'selected' : ''}`}
                            onClick={() => handleWorkspaceClick(workspace)}
                        >
                            <span className="expand-icon">
                                {expandedWorkspace === workspace.id ? '▼' : '▶'}
                            </span>
                            <span className="workspace-name">📁 {workspace.name}</span>
                            <span className="workspace-type">{workspace.type}</span>
                        </div>

                        {expandedWorkspace === workspace.id && (
                            <div className="workspace-content">
                                <div className="datasets-section">
                                    <h4>📊 Datasets ({datasets.length})</h4>
                                    {datasets.map(dataset => (
                                        <div key={dataset.id} className="dataset-item">
                                            <div 
                                                className={`dataset-header ${selectedDataset?.id === dataset.id ? 'selected' : ''}`}
                                                onClick={() => handleDatasetClick(dataset)}
                                            >
                                                <span className="expand-icon">
                                                    {expandedDataset === dataset.id ? '▼' : '▶'}
                                                </span>
                                                <span className="dataset-name">{dataset.name}</span>
                                                <span className="dataset-info">
                                                    {dataset.targetStorageMode} | {dataset.isRefreshable ? '🔄' : '📊'}
                                                </span>
                                            </div>

                                            {expandedDataset === dataset.id && (
                                                <div className="dataset-reports">
                                                    <h5>📋 Reports for this dataset:</h5>
                                                    {getReportsForDataset(dataset.id).map(report => (
                                                        <div 
                                                            key={report.id} 
                                                            className={`report-item ${selectedReport?.id === report.id ? 'selected' : ''}`}
                                                            onClick={() => handleReportClick(report)}
                                                        >
                                                            <span className="report-name">📈 {report.name}</span>
                                                            <span className="report-type">{report.reportType}</span>
                                                        </div>
                                                    ))}
                                                    {getReportsForDataset(dataset.id).length === 0 && (
                                                        <div className="no-reports">No reports found for this dataset</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Dashboards and Tiles Section */}
                                <div className="dashboards-section">
                                    <h4>📊 Dashboards & Tiles</h4>
                                    <div className="dashboard-tile-actions">
                                        <button 
                                            className="dashboard-tile-button"
                                            onClick={() => setShowDashboardTileSelector(true)}
                                            disabled={!powerBiToken}
                                        >
                                            🎛️ Browse Dashboards & Tiles
                                        </button>
                                        <p className="action-hint">
                                            View and add individual dashboards or tiles from this workspace
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {selectedWorkspace && (
                <div className="selection-summary">
                    <h4>Current Selection:</h4>
                    <div className="selection-details">
                        <div className="selection-item workspace-selection">
                            <strong>Workspace:</strong> 
                            <span className="selection-value">{selectedWorkspace.name}</span>
                            <span className="selection-meta">({selectedWorkspace.type})</span>
                        </div>
                        
                        {selectedDataset && (
                            <div className="selection-item dataset-selection">
                                <strong>Dataset:</strong> 
                                <span className="selection-value">{selectedDataset.name}</span>
                                <span className="selection-meta">({selectedDataset.targetStorageMode})</span>
                            </div>
                        )}
                        
                        {selectedReport && (
                            <div className="selection-item report-selection">
                                <strong>Report:</strong> 
                                <span className="selection-value">{selectedReport.name}</span>
                                <span className="selection-meta">({selectedReport.reportType})</span>
                            </div>
                        )}
                    </div>
                    
                    {selectedWorkspace && selectedDataset && selectedReport ? (
                        <div className="action-section">
                            <div className="action-buttons">
                                <button 
                                    onClick={generateEmbedToken}
                                    disabled={loading}
                                    className="generate-token-button primary"
                                >
                                    {loading ? '🔄 Generating...' : 
                                        multiReportMode ? 
                                            (iframeMode ? '🖼️ Add to IFrame Viewer' : '➕ Add to Multi-Viewer') : 
                                            '🎯 Load Selected Report'
                                    }
                                </button>
                                <button 
                                    onClick={() => {
                                        setSelectedDataset(null);
                                        setSelectedReport(null);
                                        setExpandedDataset(null);
                                    }}
                                    disabled={loading}
                                    className="clear-selection-button"
                                >
                                    🔄 Try Different Dataset/Report
                                </button>
                            </div>
                            <div className="action-hint">
                                {multiReportMode 
                                    ? iframeMode 
                                        ? 'Click "Add to IFrame Viewer" to add this report to the lightweight iframe collection below.'
                                        : 'Click "Add to Multi-Viewer" to add this report to the PowerBI embed collection below.'
                                    : 'Click "Load Selected Report" to generate an embed token and display the report below.'
                                }
                            </div>
                        </div>
                    ) : selectedWorkspace ? (
                        <div className="selection-guide">
                            <div className="guide-header">
                                <span>📋 Complete your selection to load a report</span>
                                <button 
                                    onClick={() => {
                                        setSelectedWorkspace(null);
                                        setSelectedDataset(null);
                                        setSelectedReport(null);
                                        setExpandedWorkspace(null);
                                        setExpandedDataset(null);
                                        setDatasets([]);
                                        setReports([]);
                                    }}
                                    className="change-workspace-button"
                                >
                                    🔄 Change Workspace
                                </button>
                            </div>
                            <div className="guide-steps">
                                <div className={`guide-step completed`}>
                                    <span className="step-number">1</span>
                                    <span className="step-text">Workspace: {selectedWorkspace.name}</span>
                                    <span className="step-check">✓</span>
                                </div>
                                <div className={`guide-step ${selectedDataset ? 'completed' : 'current'}`}>
                                    <span className="step-number">2</span>
                                    <span className="step-text">
                                        {selectedDataset ? `Dataset: ${selectedDataset.name}` : 'Choose a dataset from the list above'}
                                    </span>
                                    {selectedDataset && <span className="step-check">✓</span>}
                                </div>
                                <div className={`guide-step ${selectedReport ? 'completed' : selectedDataset ? 'current' : 'pending'}`}>
                                    <span className="step-number">3</span>
                                    <span className="step-text">
                                        {selectedReport ? `Report: ${selectedReport.name}` : 'Pick a report from the selected dataset'}
                                    </span>
                                    {selectedReport && <span className="step-check">✓</span>}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="selection-guide">
                            <div className="guide-steps">
                                <div className="guide-step current">
                                    <span className="step-number">1</span>
                                    <span className="step-text">Click on a workspace above to start</span>
                                </div>
                                <div className="guide-step pending">
                                    <span className="step-number">2</span>
                                    <span className="step-text">Then select a dataset</span>
                                </div>
                                <div className="guide-step pending">
                                    <span className="step-number">3</span>
                                    <span className="step-text">Finally pick a report to load</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {workspaces.length === 0 && !loading && !error && (
                <div className="no-workspaces">
                    <p>No workspaces found. You may need additional permissions to access Power BI workspaces.</p>
                </div>
            )}

            {/* Dashboard and Tile Selector Modal */}
            {showDashboardTileSelector && selectedWorkspace && powerBiToken && (
                <DashboardTileSelector
                    workspaceId={selectedWorkspace.id}
                    workspaceName={selectedWorkspace.name}
                    accessToken={powerBiToken}
                    isVisible={showDashboardTileSelector}
                    onClose={() => setShowDashboardTileSelector(false)}
                    onDashboardAdded={(dashboard) => {
                        if (onDashboardAdded) {
                            onDashboardAdded(dashboard);
                        }
                        setShowDashboardTileSelector(false);
                    }}
                    onTileAdded={(tile) => {
                        if (onTileAdded) {
                            onTileAdded(tile);
                        }
                        setShowDashboardTileSelector(false);
                    }}
                />
            )}
        </div>
    );
};
