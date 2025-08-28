// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import './UsageAnalytics.css';

interface UsageStats {
    totalReports: number;
    totalViews: number;
    totalBookmarks: number;
    averageViewTime: number;
    popularReports: Array<{ name: string; views: number; workspace: string }>;
    dailyActivity: Array<{ date: string; views: number; reports: number }>;
    workspaceUsage: Array<{ workspace: string; reports: number; views: number }>;
}

interface UsageAnalyticsProps {
    isVisible: boolean;
    onClose: () => void;
}

export const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({
    isVisible,
    onClose
}) => {
    const [stats, setStats] = useState<UsageStats>({
        totalReports: 0,
        totalViews: 0,
        totalBookmarks: 0,
        averageViewTime: 0,
        popularReports: [],
        dailyActivity: [],
        workspaceUsage: []
    });
    
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isVisible) {
            loadUsageStats();
        }
    }, [isVisible, timeRange]);

    const loadUsageStats = async () => {
        setIsLoading(true);
        
        // Simulate loading real analytics data
        // In a real app, this would fetch from your analytics API
        setTimeout(() => {
            const mockStats: UsageStats = {
                totalReports: 47,
                totalViews: 1234,
                totalBookmarks: 89,
                averageViewTime: 4.5,
                popularReports: [
                    { name: 'Sales Dashboard Q4', views: 234, workspace: 'Sales' },
                    { name: 'Marketing Performance', views: 189, workspace: 'Marketing' },
                    { name: 'Financial Summary', views: 156, workspace: 'Finance' },
                    { name: 'Operations Overview', views: 134, workspace: 'Operations' },
                    { name: 'Customer Analytics', views: 98, workspace: 'Sales' }
                ],
                dailyActivity: generateDailyActivity(timeRange),
                workspaceUsage: [
                    { workspace: 'Sales', reports: 12, views: 456 },
                    { workspace: 'Marketing', reports: 8, views: 234 },
                    { workspace: 'Finance', reports: 15, views: 345 },
                    { workspace: 'Operations', reports: 7, views: 123 },
                    { workspace: 'My Workspace', reports: 5, views: 76 }
                ]
            };
            setStats(mockStats);
            setIsLoading(false);
        }, 1000);
    };

    const generateDailyActivity = (range: string) => {
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
        const activity = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            activity.push({
                date: date.toISOString().split('T')[0],
                views: Math.floor(Math.random() * 50) + 10,
                reports: Math.floor(Math.random() * 8) + 2
            });
        }
        
        return activity;
    };

    const formatDuration = (minutes: number): string => {
        if (minutes < 60) {
            return `${Math.round(minutes)}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return `${hours}h ${mins}m`;
    };

    if (!isVisible) return null;

    return (
        <div className="analytics-overlay">
            <div className="analytics-dashboard">
                <div className="analytics-header">
                    <div className="header-content">
                        <h2>📊 Usage Analytics</h2>
                        <div className="time-range-selector">
                            <label>Time Range:</label>
                            <select
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
                            >
                                <option value="7d">Last 7 days</option>
                                <option value="30d">Last 30 days</option>
                                <option value="90d">Last 90 days</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={onClose} className="close-button">✕</button>
                </div>

                {isLoading ? (
                    <div className="analytics-loading">
                        <div className="loading-spinner"></div>
                        <p>Loading analytics data...</p>
                    </div>
                ) : (
                    <div className="analytics-content">
                        {/* Key Metrics */}
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <div className="metric-icon">📊</div>
                                <div className="metric-info">
                                    <div className="metric-value">{stats.totalReports}</div>
                                    <div className="metric-label">Total Reports</div>
                                </div>
                            </div>
                            
                            <div className="metric-card">
                                <div className="metric-icon">👁️</div>
                                <div className="metric-info">
                                    <div className="metric-value">{stats.totalViews.toLocaleString()}</div>
                                    <div className="metric-label">Total Views</div>
                                </div>
                            </div>
                            
                            <div className="metric-card">
                                <div className="metric-icon">🔖</div>
                                <div className="metric-info">
                                    <div className="metric-value">{stats.totalBookmarks}</div>
                                    <div className="metric-label">Bookmarks Created</div>
                                </div>
                            </div>
                            
                            <div className="metric-card">
                                <div className="metric-icon">⏱️</div>
                                <div className="metric-info">
                                    <div className="metric-value">{formatDuration(stats.averageViewTime * 60)}</div>
                                    <div className="metric-label">Avg. View Time</div>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-grid">
                            {/* Popular Reports */}
                            <div className="analytics-card">
                                <h3>🏆 Most Popular Reports</h3>
                                <div className="popular-reports">
                                    {stats.popularReports.map((report, index) => (
                                        <div key={report.name} className="popular-report">
                                            <div className="report-rank">#{index + 1}</div>
                                            <div className="report-details">
                                                <div className="report-name">{report.name}</div>
                                                <div className="report-workspace">{report.workspace}</div>
                                            </div>
                                            <div className="report-views">{report.views} views</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Daily Activity Chart */}
                            <div className="analytics-card">
                                <h3>📈 Daily Activity</h3>
                                <div className="activity-chart">
                                    {stats.dailyActivity.slice(-14).map((day) => (
                                        <div key={day.date} className="activity-bar">
                                            <div
                                                className="bar views"
                                                style={{ height: `${(day.views / 50) * 100}%` }}
                                                title={`${day.views} views on ${day.date}`}
                                            ></div>
                                            <div className="bar-label">
                                                {new Date(day.date).getDate()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="chart-legend">
                                    <span className="legend-item">
                                        <span className="legend-color views"></span>
                                        Report Views
                                    </span>
                                </div>
                            </div>

                            {/* Workspace Usage */}
                            <div className="analytics-card">
                                <h3>🏢 Workspace Usage</h3>
                                <div className="workspace-usage">
                                    {stats.workspaceUsage.map((workspace) => (
                                        <div key={workspace.workspace} className="workspace-item">
                                            <div className="workspace-info">
                                                <div className="workspace-name">{workspace.workspace}</div>
                                                <div className="workspace-stats">
                                                    {workspace.reports} reports • {workspace.views} views
                                                </div>
                                            </div>
                                            <div className="workspace-bar">
                                                <div
                                                    className="usage-fill"
                                                    style={{ width: `${(workspace.views / 500) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Export Options */}
                        <div className="analytics-actions">
                            <button className="export-button">
                                📄 Export PDF Report
                            </button>
                            <button className="export-button">
                                📊 Export Excel Data
                            </button>
                            <button className="refresh-button" onClick={loadUsageStats}>
                                🔄 Refresh Data
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
