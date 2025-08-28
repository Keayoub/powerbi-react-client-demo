// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState } from "react";
import "./DemoApp.css";
import { AuthProvider } from "./context/AuthContext";
import { ReportSelectionPage } from "./components/ReportSelectionPage";
import MPATestPage from "./pages/MPATestPage";

/**
 * Simplified PowerBI Demo Application
 * 2 main pages: Report Embed + MPA Test
 */
function DemoAppContent() {
  const [activePage, setActivePage] = useState<"reports" | "mpa">("reports");

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
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="app-content">
        {activePage === "reports" && <ReportSelectionPage />}
        {activePage === "mpa" && <MPATestPage />}
      </main>

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
