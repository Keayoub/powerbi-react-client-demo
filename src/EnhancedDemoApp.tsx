/**
 * Enhanced Demo App with Performance Optimizations
 * Integrates all performance improvements and monitoring
 */

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { ErrorDiagnostic } from './components/ErrorDiagnostic';
import { QueryUserErrorRecovery } from './components/QueryUserErrorRecovery';
import { EnhancedPowerBIContainer, EnhancedVirtualPowerBIContainer, PowerBIOptimizationUtils } from './components/LazyPowerBIComponents';
import { PowerBIPerformanceOptimizer } from './services/PowerBIPerformanceOptimizer';
import { simulatePowerBIErrors, clearSimulatedErrors } from './utils/error-simulation';
import './DemoApp.css';

interface Report {
  id: string;
  reportId: string;
  embedUrl: string;
  reportName: string;
  priority: "high" | "normal" | "low";
}

const EnhancedDemoApp: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [accessToken, setAccessToken] = useState<string>('');
  const [viewMode, setViewMode] = useState<'single' | 'virtual' | 'grid'>('single');
  const [performanceMode, setPerformanceMode] = useState<'standard' | 'optimized'>('optimized');
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(true);
  const [queryUserErrorReport, setQueryUserErrorReport] = useState<string | null>(null);

  // Initialize performance optimizer
  const performanceOptimizer = useMemo(() => {
    return PowerBIPerformanceOptimizer.getInstance();
  }, []);

  // Sample reports data
  const sampleReports: Report[] = [
    {
      id: '1',
      reportId: 'sample-report-1',
      embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-1',
      reportName: 'Sales Dashboard',
      priority: 'high'
    },
    {
      id: '2',
      reportId: 'sample-report-2',
      embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-2',
      reportName: 'Marketing Analytics',
      priority: 'normal'
    },
    {
      id: '3',
      reportId: 'sample-report-3',
      embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=sample-3',
      reportName: 'Financial Overview',
      priority: 'high'
    }
  ];

  // Initialize app
  useEffect(() => {
    // Set sample data
    setReports(sampleReports);
    setAccessToken('sample-token'); // In real app, get from auth service

    // Initialize performance optimizations
    PowerBIOptimizationUtils.preconnectToPowerBI();
    PowerBIOptimizationUtils.addResourceHints();

    // Update metrics
    window.updatePowerBIMetrics({
      reportCount: sampleReports.length,
      serviceInstanceCount: 1,
      frameCount: sampleReports.length
    });

    // Listen for QueryUserError events
    const handleQueryUserError = (event: any) => {
      console.log('🚨 QueryUserError event received:', event.detail);
      setQueryUserErrorReport(event.detail.reportId);
    };

    window.addEventListener('queryUserError', handleQueryUserError);

    return () => {
      window.removeEventListener('queryUserError', handleQueryUserError);
    };
  }, []);

  // Handle report load
  const handleReportLoad = (reportId: string) => {
    const report = reports.find(r => r.reportId === reportId);
    if (report) {
      window.addReportMetric({
        reportId: report.reportId,
        reportName: report.reportName,
        loadTime: Math.random() * 3000 + 1000, // Simulated load time
        status: 'loaded',
        lastUpdated: new Date(),
        size: Math.random() * 1024 * 1024 * 5, // Simulated size
        cacheHit: Math.random() > 0.5
      });

      // Update performance metrics
      window.updatePowerBIMetrics({
        apiCallCount: (JSON.parse(localStorage.getItem('powerBIMetrics') || '{}')).apiCallCount + 1 || 1
      });
    }
  };

  // Handle report error
  const handleReportError = (reportId: string, error: Error | any) => {
    const report = reports.find(r => r.reportId === reportId);
    if (report) {
      window.addReportMetric({
        reportId: report.reportId,
        reportName: report.reportName,
        loadTime: 0,
        status: 'error',
        lastUpdated: new Date(),
        size: 0,
        cacheHit: false
      });

      // Update error count
      window.updatePowerBIMetrics({
        errorCount: (JSON.parse(localStorage.getItem('powerBIMetrics') || '{}')).errorCount + 1 || 1
      });

      // Check if this is a QueryUserError
      if (error?.message?.includes('QueryUserError') || error?.type?.includes('QueryUserError')) {
        console.log(`🚨 QueryUserError detected for report: ${reportId}`);
        setQueryUserErrorReport(reportId);
      }
    }
  };

  // Render single report view
  const renderSingleView = () => (
    <div className="single-view">
      <div className="report-selector">
        <h3>Select Report:</h3>
        {reports.map(report => (
          <button
            key={report.id}
            className="report-button"
            onClick={() => {
              // Simulate report selection
              handleReportLoad(report.reportId);
            }}
          >
            📊 {report.reportName}
            <span className={`priority-badge ${report.priority}`}>
              {report.priority}
            </span>
          </button>
        ))}
      </div>
      
      {reports.length > 0 && (
        <div className="report-container">
          {performanceMode === 'optimized' ? (
            <EnhancedPowerBIContainer
              reportId={reports[0].reportId}
              embedUrl={reports[0].embedUrl}
              accessToken={accessToken}
              reportName={reports[0].reportName}
              priority={reports[0].priority}
              enableCaching={true}
              enablePreloading={true}
              showToolbar={true}
              onLoaded={() => handleReportLoad(reports[0].reportId)}
              onError={(error: any) => handleReportError(reports[0].reportId, error)}
            />
          ) : (
            <div className="standard-report-container">
              Standard PowerBI embed would go here
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Render virtual scroll view
  const renderVirtualView = () => (
    <div className="virtual-view">
      <h3>📈 Virtual Scrolling View (Optimized for Large Datasets)</h3>
      <EnhancedVirtualPowerBIContainer
        reports={reports.map(r => ({
          ...r,
          accessToken
        }))}
        itemHeight={500}
        containerHeight={600}
        overscan={2}
        enableCaching={performanceMode === 'optimized'}
        enablePreloading={performanceMode === 'optimized'}
        onReportLoad={handleReportLoad}
        onReportError={handleReportError}
      />
    </div>
  );

  // Render grid view
  const renderGridView = () => (
    <div className="grid-view">
      <h3>🎯 Grid View</h3>
      <div className="reports-grid">
        {reports.map(report => (
          <div key={report.id} className="grid-item">
            {performanceMode === 'optimized' ? (
              <EnhancedPowerBIContainer
                reportId={report.reportId}
                embedUrl={report.embedUrl}
                accessToken={accessToken}
                reportName={report.reportName}
                priority={report.priority}
                height={300}
                enableCaching={true}
                enablePreloading={true}
                lazyLoad={true}
                showToolbar={false}
                onLoaded={() => handleReportLoad(report.reportId)}
                onError={(error: any) => handleReportError(report.reportId, error)}
              />
            ) : (
              <div className="standard-grid-item">
                Standard PowerBI embed: {report.reportName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="enhanced-demo-app">
      {/* Performance Dashboard */}
      {showPerformanceDashboard && <PerformanceDashboard />}

      {/* Error Diagnostic System */}
      <ErrorDiagnostic
        onRetryAll={() => {
          // Retry all failed reports
          reports.forEach(report => {
            const event = new CustomEvent('retryReport', { 
              detail: { reportId: report.reportId } 
            });
            window.dispatchEvent(event);
          });
        }}
        onClearErrors={() => {
          console.log('All errors cleared');
        }}
      />

      {/* Header with Controls */}
      <header className="app-header">
        <h1>🚀 Enhanced PowerBI Demo</h1>
        <p>Advanced Performance Optimizations & Monitoring</p>
        
        <div className="controls">
          <div className="control-group">
            <label>View Mode:</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as any)}
              className="control-select"
            >
              <option value="single">Single Report</option>
              <option value="virtual">Virtual Scrolling</option>
              <option value="grid">Grid View</option>
            </select>
          </div>

          <div className="control-group">
            <label>Performance Mode:</label>
            <select 
              value={performanceMode} 
              onChange={(e) => setPerformanceMode(e.target.value as any)}
              className="control-select"
            >
              <option value="optimized">Optimized</option>
              <option value="standard">Standard</option>
            </select>
          </div>

          <button
            className={`dashboard-toggle ${showPerformanceDashboard ? 'active' : ''}`}
            onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
          >
            {showPerformanceDashboard ? '📊 Hide Dashboard' : '📊 Show Dashboard'}
          </button>
        </div>
      </header>

      {/* Performance Mode Info */}
      <div className={`performance-info ${performanceMode}`}>
        <h3>
          {performanceMode === 'optimized' ? '⚡ Optimized Mode Active' : '🔧 Standard Mode'}
        </h3>
        <ul>
          {performanceMode === 'optimized' ? (
            <>
              <li>✅ Report caching enabled</li>
              <li>✅ React.memo optimization</li>
              <li>✅ Intersection observer lazy loading</li>
              <li>✅ Resource preloading</li>
              <li>✅ Enhanced error handling</li>
              <li>✅ Performance monitoring</li>
            </>
          ) : (
            <>
              <li>❌ Basic PowerBI embedding</li>
              <li>❌ No caching</li>
              <li>❌ No lazy loading</li>
              <li>❌ Standard error handling</li>
            </>
          )}
        </ul>
      </div>

      {/* Main Content */}
      <main className="app-content">
        <Suspense fallback={<div className="loading-fallback">Loading components...</div>}>
          {viewMode === 'single' && renderSingleView()}
          {viewMode === 'virtual' && renderVirtualView()}
          {viewMode === 'grid' && renderGridView()}
        </Suspense>
      </main>

      {/* QueryUserError Recovery Modal */}
      {queryUserErrorReport && (
        <QueryUserErrorRecovery
          reportId={queryUserErrorReport}
          onRetry={(newConfig) => {
            console.log('🔄 Retrying with new configuration:', newConfig);
            
            // Update the report configuration
            const updatedReports = reports.map(report => 
              report.reportId === queryUserErrorReport 
                ? { ...report, ...newConfig }
                : report
            );
            setReports(updatedReports);
            setAccessToken(newConfig.accessToken);
            
            // Close the modal
            setQueryUserErrorReport(null);
            
            // Trigger a reload
            window.location.reload();
          }}
          onDismiss={() => setQueryUserErrorReport(null)}
        />
      )}

      {/* Footer with Stats */}
      <footer className="app-footer">
        <div className="stats">
          <span>📊 Reports: {reports.length}</span>
          <span>⚡ Mode: {performanceMode}</span>
          <span>👁️ View: {viewMode}</span>
          <span>🎯 Optimizations: {performanceMode === 'optimized' ? 'Active' : 'Disabled'}</span>
        </div>
      </footer>
    </div>
  );
};

export default EnhancedDemoApp;
