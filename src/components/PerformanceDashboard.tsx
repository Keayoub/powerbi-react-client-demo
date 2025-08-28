/**
 * Advanced Performance Monitoring Dashboard
 * Real-time metrics for PowerBI embedding performance
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './PerformanceDashboard.css';

interface PerformanceMetrics {
  reportLoadTime: number;
  embedTime: number;
  renderTime: number;
  interactionDelay: number;
  memoryUsage: number;
  apiCallCount: number;
  errorCount: number;
  cacheHitRate: number;
  reportCount: number;
  frameCount: number;
  serviceInstanceCount: number;
}

interface ReportMetric {
  reportId: string;
  reportName: string;
  loadTime: number;
  status: 'loading' | 'loaded' | 'error';
  lastUpdated: Date;
  size: number;
  cacheHit: boolean;
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    reportLoadTime: 0,
    embedTime: 0,
    renderTime: 0,
    interactionDelay: 0,
    memoryUsage: 0,
    apiCallCount: 0,
    errorCount: 0,
    cacheHitRate: 0,
    reportCount: 0,
    frameCount: 0,
    serviceInstanceCount: 0
  });

  const [reports, setReports] = useState<ReportMetric[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    const performance = window.performance;
    const memory = (performance as any).memory;

    // Get PowerBI specific metrics from global state or localStorage
    const powerBIMetrics = JSON.parse(localStorage.getItem('powerBIMetrics') || '{}');

    setMetrics(prev => ({
      ...prev,
      memoryUsage: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0, // MB
      reportCount: powerBIMetrics.reportCount || 0,
      frameCount: powerBIMetrics.frameCount || 0,
      serviceInstanceCount: powerBIMetrics.serviceInstanceCount || 1,
      apiCallCount: powerBIMetrics.apiCallCount || 0,
      errorCount: powerBIMetrics.errorCount || 0,
      cacheHitRate: powerBIMetrics.cacheHitRate || 0,
      reportLoadTime: powerBIMetrics.avgLoadTime || 0,
      embedTime: powerBIMetrics.avgEmbedTime || 0,
      renderTime: powerBIMetrics.avgRenderTime || 0,
      interactionDelay: powerBIMetrics.avgInteractionDelay || 0
    }));

    // Update report details
    const reportDetails = powerBIMetrics.reports || [];
    setReports(reportDetails);
  }, []);

  // Auto-refresh metrics
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(collectMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, collectMetrics]);

  // Initial load
  useEffect(() => {
    collectMetrics();
  }, [collectMetrics]);

  // Performance score calculation
  const performanceScore = useMemo(() => {
    const loadTimeScore = Math.max(0, 100 - (metrics.reportLoadTime / 50)); // 50ms = 100 points
    const memoryScore = Math.max(0, 100 - (metrics.memoryUsage / 10)); // 100MB = 0 points
    const errorScore = Math.max(0, 100 - (metrics.errorCount * 10));
    const cacheScore = metrics.cacheHitRate;

    return Math.round((loadTimeScore + memoryScore + errorScore + cacheScore) / 4);
  }, [metrics]);

  // Get performance status color
  const getStatusColor = (score: number): string => {
    if (score >= 80) return '#4ade80'; // green
    if (score >= 60) return '#fbbf24'; // yellow
    return '#ef4444'; // red
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`performance-dashboard ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h3>⚡ Performance Monitor</h3>
          <div className="performance-score" style={{ color: getStatusColor(performanceScore) }}>
            {performanceScore}/100
          </div>
        </div>
        <div className="header-controls">
          <button
            className="refresh-button"
            onClick={collectMetrics}
            title="Refresh Metrics"
          >
            🔄
          </button>
          <button
            className={`auto-refresh-toggle ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto Refresh"
          >
            ⏱️
          </button>
          <button
            className="expand-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '🔽' : '🔼'}
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="quick-metrics">
        <div className="metric-item">
          <span className="metric-label">Reports:</span>
          <span className="metric-value">{metrics.reportCount}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Frames:</span>
          <span className="metric-value">{metrics.frameCount}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Services:</span>
          <span className="metric-value">{metrics.serviceInstanceCount}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Memory:</span>
          <span className="metric-value">{metrics.memoryUsage.toFixed(1)} MB</span>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="dashboard-content">
          {/* Performance Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Load Performance</h4>
              <div className="metric-details">
                <div className="metric-row">
                  <span>Avg Load Time:</span>
                  <span>{metrics.reportLoadTime.toFixed(0)}ms</span>
                </div>
                <div className="metric-row">
                  <span>Embed Time:</span>
                  <span>{metrics.embedTime.toFixed(0)}ms</span>
                </div>
                <div className="metric-row">
                  <span>Render Time:</span>
                  <span>{metrics.renderTime.toFixed(0)}ms</span>
                </div>
                <div className="metric-row">
                  <span>Interaction Delay:</span>
                  <span>{metrics.interactionDelay.toFixed(0)}ms</span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <h4>Cache & Resources</h4>
              <div className="metric-details">
                <div className="metric-row">
                  <span>Cache Hit Rate:</span>
                  <span>{metrics.cacheHitRate.toFixed(1)}%</span>
                </div>
                <div className="metric-row">
                  <span>API Calls:</span>
                  <span>{metrics.apiCallCount}</span>
                </div>
                <div className="metric-row">
                  <span>Error Count:</span>
                  <span className={metrics.errorCount > 0 ? 'error' : ''}>{metrics.errorCount}</span>
                </div>
                <div className="metric-row">
                  <span>Memory Usage:</span>
                  <span>{metrics.memoryUsage.toFixed(1)} MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Report Details Table */}
          {reports.length > 0 && (
            <div className="reports-table">
              <h4>Report Details</h4>
              <table>
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Status</th>
                    <th>Load Time</th>
                    <th>Size</th>
                    <th>Cache</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.reportId}>
                      <td className="report-name">{report.reportName}</td>
                      <td>
                        <span className={`status-badge ${report.status}`}>
                          {report.status}
                        </span>
                      </td>
                      <td>{report.loadTime.toFixed(0)}ms</td>
                      <td>{formatSize(report.size)}</td>
                      <td>
                        <span className={`cache-indicator ${report.cacheHit ? 'hit' : 'miss'}`}>
                          {report.cacheHit ? '✓' : '✗'}
                        </span>
                      </td>
                      <td>{report.lastUpdated.toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Performance Recommendations */}
          <div className="recommendations">
            <h4>💡 Performance Recommendations</h4>
            <ul>
              {metrics.reportLoadTime > 3000 && (
                <li>⚠️ Report load time is high. Consider implementing report caching.</li>
              )}
              {metrics.memoryUsage > 150 && (
                <li>⚠️ High memory usage detected. Consider using virtual scrolling for large datasets.</li>
              )}
              {metrics.cacheHitRate < 50 && (
                <li>💾 Low cache hit rate. Review caching strategy and preloading settings.</li>
              )}
              {metrics.errorCount > 5 && (
                <li>🚨 Multiple errors detected. Check network connectivity and token validity.</li>
              )}
              {metrics.serviceInstanceCount > 3 && (
                <li>🔄 Multiple service instances detected. Consider using singleton mode.</li>
              )}
              {metrics.frameCount > 10 && (
                <li>📊 Many frames loaded. Consider implementing virtual scrolling or pagination.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Global function to update metrics from PowerBI components
declare global {
  interface Window {
    updatePowerBIMetrics: (metrics: Partial<PerformanceMetrics>) => void;
    addReportMetric: (report: ReportMetric) => void;
  }
}

// Initialize global metric tracking
window.updatePowerBIMetrics = (newMetrics: Partial<PerformanceMetrics>) => {
  const existing = JSON.parse(localStorage.getItem('powerBIMetrics') || '{}');
  const updated = { ...existing, ...newMetrics };
  localStorage.setItem('powerBIMetrics', JSON.stringify(updated));
};

window.addReportMetric = (report: ReportMetric) => {
  const existing = JSON.parse(localStorage.getItem('powerBIMetrics') || '{}');
  const reports = existing.reports || [];
  const existingIndex = reports.findIndex((r: ReportMetric) => r.reportId === report.reportId);
  
  if (existingIndex >= 0) {
    reports[existingIndex] = report;
  } else {
    reports.push(report);
  }
  
  existing.reports = reports;
  existing.reportCount = reports.length;
  localStorage.setItem('powerBIMetrics', JSON.stringify(existing));
};
