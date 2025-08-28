// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from "react";
import "./DemoApp.css";
import { AuthProvider } from "./context/AuthContext";
import { ReportSelectionPage } from "./components/ReportSelectionPage";
import MPATestPage from "./pages/MPATestPage";
import { ErrorDiagnostic } from "./components/ErrorDiagnostic";
import { QueryUserErrorRecovery } from "./components/QueryUserErrorRecovery";
import { PerformanceDashboard } from "./components/PerformanceDashboard";

/**
 * Enhanced PowerBI Demo Application with Error Recovery
 * 2 main pages: Report Embed + MPA Test
 * Features: QueryUserError recovery, Performance monitoring, Error diagnostics
 */
function DemoAppContent() {
  const [activePage, setActivePage] = useState<"reports" | "mpa">("reports");
  const [showQueryUserRecovery, setShowQueryUserRecovery] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [errorContext, setErrorContext] = useState<{
    reportId: string;
    embedUrl?: string;
    accessToken?: string;
  }>({ reportId: 'unknown' });

  // Listen for QueryUserError events to show recovery modal
  useEffect(() => {
    const handleQueryUserError = (event: any) => {
      console.warn('QueryUserError detected, showing recovery modal');
      
      // Extract error context from the event
      const context = event.detail || {};
      setErrorContext({
        reportId: context.reportId || 'unknown-report',
        embedUrl: context.embedUrl,
        accessToken: context.accessToken
      });
      
      setShowQueryUserRecovery(true);
    };

    // Listen for global error events
    window.addEventListener('powerbi-queryuser-error', handleQueryUserError);
    
    return () => {
      window.removeEventListener('powerbi-queryuser-error', handleQueryUserError);
    };
  }, []);

  const handleRetry = (newConfig: {
    reportId: string;
    embedUrl: string;
    accessToken: string;
  }) => {
    console.log('Retrying with new config:', newConfig);
    
    // Dispatch a retry event that other components can listen to
    const retryEvent = new CustomEvent('powerbi-retry-config', {
      detail: newConfig
    });
    window.dispatchEvent(retryEvent);
    
    setShowQueryUserRecovery(false);
  };

  return (
    <div className="demo-app">
      {/* Simple Navigation */}
      <header className="app-header">
        <div className="header-content">
          <img
            src="./assets/PowerBI_Icon.png"
            alt="Power BI"
            className="powerbi-icon"
          />
          <h1>📊 PowerBI React Demo</h1>
          <nav className="page-nav">
            <button
              className={`nav-button ${activePage === "reports" ? "active" : ""}`}
              onClick={() => setActivePage("reports")}
            >
              📈 Report Selection & Multi-Report
            </button>
            <button
              className={`nav-button ${activePage === "mpa" ? "active" : ""}`}
              onClick={() => setActivePage("mpa")}
            >
              ⚙️ Advanced Optimization & Singleton
            </button>
            
            {/* Enhanced Features Buttons */}
            <button
              className="nav-button enhanced-button"
              onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
              title="Toggle Performance Dashboard"
            >
              📊 Performance
            </button>
          </nav>
        </div>
      </header>

      {/* Performance Dashboard */}
      {showPerformanceDashboard && (
        <div className="performance-dashboard-overlay">
          <div className="dashboard-container">
            <button 
              className="close-dashboard-btn"
              onClick={() => setShowPerformanceDashboard(false)}
              title="Close Performance Dashboard"
            >
              ✕
            </button>
            <PerformanceDashboard />
          </div>
        </div>
      )}

      {/* Page Content */}
      <main className="app-content">
        {activePage === "reports" && <ReportSelectionPage />}
        {activePage === "mpa" && <MPATestPage />}
      </main>

      {/* QueryUserError Recovery Modal */}
      {showQueryUserRecovery && (
        <QueryUserErrorRecovery 
          reportId={errorContext.reportId}
          onRetry={handleRetry}
          onDismiss={() => setShowQueryUserRecovery(false)}
        />
      )}

      {/* Error Diagnostic Panel */}
      <ErrorDiagnostic />

      {/* Footer */}
      <footer className="demo-footer">
        <div className="footer-content">
          <p>&copy; 2024 Microsoft Corporation. PowerBI React Demo - Simplified Architecture.</p>
          <div className="footer-links">
            <a
              href="https://learn.microsoft.com/power-bi/"
              target="_blank"
              rel="noopener noreferrer"
            >
              📚 PowerBI Documentation
            </a>
            <a
              href="https://github.com/Microsoft/powerbi-client-react"
              target="_blank"
              rel="noopener noreferrer"
            >
              🔧 GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function DemoApp() {
  return (
    <AuthProvider>
      <DemoAppContent />
    </AuthProvider>
  );
}
