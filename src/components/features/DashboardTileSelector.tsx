// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import { PowerBIWorkspaceService, PowerBIDashboard, PowerBITile } from '../../services/powerbi-workspace-service';
import './DashboardTileSelector.css';

export interface EmbeddedDashboard {
    id: string;
    name: string;
    embedUrl: string;
    accessToken: string;
    workspaceName: string;
    workspaceId: string;
    embedConfig: any;
    type: 'dashboard';
}

export interface EmbeddedTile {
    id: string;
    name: string;
    embedUrl: string;
    accessToken: string;
    workspaceName: string;
    workspaceId: string;
    dashboardId: string;
    dashboardName: string;
    embedConfig: any;
    type: 'tile';
}

interface DashboardTileSelectorProps {
    workspaceId: string;
    workspaceName: string;
    accessToken: string;
    isVisible: boolean;
    onClose: () => void;
    onDashboardAdded: (dashboard: EmbeddedDashboard) => void;
    onTileAdded: (tile: EmbeddedTile) => void;
}

export const DashboardTileSelector: React.FC<DashboardTileSelectorProps> = ({
    workspaceId,
    workspaceName,
    accessToken,
    isVisible,
    onClose,
    onDashboardAdded,
    onTileAdded
}) => {
    const [dashboards, setDashboards] = useState<PowerBIDashboard[]>([]);
    const [selectedDashboard, setSelectedDashboard] = useState<PowerBIDashboard | null>(null);
    const [tiles, setTiles] = useState<PowerBITile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTiles, setIsLoadingTiles] = useState(false);
    const [activeTab, setActiveTab] = useState<'dashboards' | 'tiles'>('dashboards');
    
    const service = PowerBIWorkspaceService.getInstance(accessToken);

    useEffect(() => {
        if (isVisible) {
            loadDashboards();
        }
    }, [isVisible, workspaceId]);

    const loadDashboards = async () => {
        setIsLoading(true);
        try {
            service.updateAccessToken(accessToken);
            const dashboardsData = await service.getDashboards(workspaceId);
            setDashboards(dashboardsData);
        } catch (error) {
            console.error('Error loading dashboards:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTiles = async (dashboard: PowerBIDashboard) => {
        setIsLoadingTiles(true);
        try {
            service.updateAccessToken(accessToken);
            const tilesData = await service.getTiles(dashboard.id, workspaceId);
            setTiles(tilesData);
        } catch (error) {
            console.error('Error loading tiles:', error);
        } finally {
            setIsLoadingTiles(false);
        }
    };

    const handleDashboardSelect = (dashboard: PowerBIDashboard) => {
        setSelectedDashboard(dashboard);
        setActiveTab('tiles');
        loadTiles(dashboard);
    };

    const handleAddDashboard = async (dashboard: PowerBIDashboard) => {
        try {
            service.updateAccessToken(accessToken);
            const embedToken = await service.generateDashboardEmbedToken(dashboard.id, workspaceId);

            const embeddedDashboard: EmbeddedDashboard = {
                id: `dashboard-${dashboard.id}-${Date.now()}`,
                name: dashboard.displayName,
                embedUrl: dashboard.embedUrl,
                accessToken: embedToken,
                workspaceName,
                workspaceId,
                type: 'dashboard',
                embedConfig: {
                    type: 'dashboard',
                    id: dashboard.id,
                    embedUrl: dashboard.embedUrl,
                    accessToken: embedToken,
                    tokenType: 0 // models.TokenType.Embed
                }
            };

            onDashboardAdded(embeddedDashboard);
            onClose();
        } catch (error) {
            console.error('Error adding dashboard:', error);
        }
    };

    const handleAddTile = async (tile: PowerBITile) => {
        try {
            service.updateAccessToken(accessToken);
            const embedToken = await service.generateTileEmbedToken(
                selectedDashboard?.id || '',
                tile.id,
                workspaceId
            );

            const embeddedTile: EmbeddedTile = {
                id: `tile-${tile.id}-${Date.now()}`,
                name: tile.title,
                embedUrl: tile.embedUrl,
                accessToken: embedToken,
                workspaceName,
                workspaceId,
                dashboardId: selectedDashboard?.id || '',
                dashboardName: selectedDashboard?.displayName || 'Unknown Dashboard',
                type: 'tile',
                embedConfig: {
                    type: 'tile',
                    id: tile.id,
                    embedUrl: tile.embedUrl,
                    accessToken: embedToken,
                    tokenType: 0, // models.TokenType.Embed
                    dashboardId: selectedDashboard?.id
                }
            };

            onTileAdded(embeddedTile);
            onClose();
        } catch (error) {
            console.error('Error adding tile:', error);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="dashboard-tile-selector-overlay">
            <div className="dashboard-tile-selector">
                <div className="selector-header">
                    <h3>Add Dashboard or Tile</h3>
                    <button className="close-button" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="selector-tabs">
                    <button
                        className={`tab-button ${activeTab === 'dashboards' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboards')}
                        disabled={isLoading}
                    >
                        📊 Dashboards
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'tiles' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tiles')}
                        disabled={isLoading || !selectedDashboard}
                    >
                        🔲 Tiles
                    </button>
                </div>

                <div className="selector-content">
                    {activeTab === 'dashboards' && (
                        <>
                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="loading-spinner"></div>
                                    <p>Loading dashboards...</p>
                                </div>
                            ) : dashboards.length > 0 ? (
                                <div className="items-grid">
                                    {dashboards.map((dashboard) => (
                                        <div key={dashboard.id} className="dashboard-card">
                                            <div className="card-content">
                                                <div className="card-icon">📊</div>
                                                <div className="card-info">
                                                    <h4 className="card-title">{dashboard.displayName}</h4>
                                                    <p className="card-description">Dashboard</p>
                                                </div>
                                            </div>
                                            <div className="card-actions">
                                                <button
                                                    className="view-tiles-button"
                                                    onClick={() => handleDashboardSelect(dashboard)}
                                                    disabled={isLoadingTiles}
                                                >
                                                    View Tiles
                                                </button>
                                                <button
                                                    className="add-button"
                                                    onClick={() => handleAddDashboard(dashboard)}
                                                >
                                                    Add Dashboard
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p>No dashboards found in this workspace.</p>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'tiles' && (
                        <>
                            {selectedDashboard ? (
                                <>
                                    <div className="selected-dashboard">
                                        <div className="dashboard-info">
                                            <h4>📊 {selectedDashboard.displayName}</h4>
                                            <button
                                                className="back-button"
                                                onClick={() => {
                                                    setActiveTab('dashboards');
                                                    setSelectedDashboard(null);
                                                    setTiles([]);
                                                }}
                                            >
                                                ← Back to Dashboards
                                            </button>
                                        </div>
                                    </div>

                                    {isLoadingTiles ? (
                                        <div className="loading-state">
                                            <div className="loading-spinner"></div>
                                            <p>Loading tiles...</p>
                                        </div>
                                    ) : tiles.length > 0 ? (
                                        <div className="items-grid">
                                            {tiles.map((tile) => (
                                                <div key={tile.id} className="tile-card">
                                                    <div className="card-content">
                                                        <div className="card-icon">🔲</div>
                                                        <div className="card-info">
                                                            <h4 className="card-title">{tile.title}</h4>
                                                            <p className="card-description">
                                                                {tile.subTitle || 'Tile'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="card-actions">
                                                        <button
                                                            className="add-button"
                                                            onClick={() => handleAddTile(tile)}
                                                        >
                                                            Add Tile
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state">
                                            <p>No tiles found in this dashboard.</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="no-selection">
                                    <p>Select a dashboard first to view its tiles.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
