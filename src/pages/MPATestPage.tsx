// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useRef, useCallback, useEffect } from "react";
import { EmbeddedPowerBIContainer } from "../components/EmbeddedPowerBIContainer";
import PowerBIErrorBoundary from "../components/PowerBIErrorBoundary";
import { WorkspaceBrowser } from "../components/workspace-browser/WorkspaceBrowser";
import { powerBIService } from "../services/PowerBIService";

interface OptimizedReport {
  id: string;
  name: string;
  embedUrl: string;
  accessToken: string;
  workspaceName: string;
  priority: "high" | "normal" | "low";
  lazyLoad: boolean;
  addedAt: Date;
  powerBiReportId?: string; // The actual Power BI report ID for embedding
}

interface PerformanceMetrics {
  loadTime: number;
  priority: "high" | "normal" | "low";
  lazyLoad: boolean;
  timestamp: Date;
  totalReports: number;
  activeReports: number;
}

interface ServiceMetrics {
  totalServices: number;
  activeFrames: number;
  reports: number;
  dashboards: number;
  singletonMode: boolean;
}

const MPATestPage: React.FC = () => {
  const [optimizedReports, setOptimizedReports] = useState<OptimizedReport[]>(
    []
  );
  const [performanceMetrics, setPerformanceMetrics] = useState<
    PerformanceMetrics[]
  >([]);
  const [currentTestRun, setCurrentTestRun] = useState<number>(1);
  const [isWorkspaceBrowserOpen, setIsWorkspaceBrowserOpen] =
    useState<boolean>(false);
  const [embedError, setEmbedError] = useState<string | null>(null);
  const [isAnalysisMode, setIsAnalysisMode] = useState<boolean>(false);
  const [serviceMetrics, setServiceMetrics] = useState<ServiceMetrics>({
    totalServices: 0,
    activeFrames: 0,
    reports: 0,
    dashboards: 0,
    singletonMode: true,
  });

  // Track concurrent duplications to prevent overloading
  const [activeDuplications, setActiveDuplications] = useState<number>(0);

  // References for performance tracking
  const testRunIdRef = useRef<number>(0);
  const reportStartTimesRef = useRef<Map<string, number>>(new Map());

  // Update service metrics periodically
  useEffect(() => {
    const updateServiceMetrics = () => {
      const metrics = powerBIService.getLoadedInstancesCount();
      setServiceMetrics({
        totalServices: metrics.services,
        activeFrames: metrics.frames,
        reports: metrics.reports,
        dashboards: metrics.dashboards,
        singletonMode: metrics.singletonMode,
      });
    };

    // Update immediately
    updateServiceMetrics();

    // Update every 2 seconds
    const interval = setInterval(updateServiceMetrics, 2000);

    return () => clearInterval(interval);
  }, [optimizedReports.length]);

  // Store pending report configuration for workspace selection
  const [pendingReportConfig, setPendingReportConfig] = useState<{
    priority: "high" | "normal" | "low";
    lazyLoad: boolean;
  } | null>(null);

  // Priority queue optimizations
  const addOptimizedReport = (
    priority: "high" | "normal" | "low",
    lazyLoad: boolean
  ) => {
    // Always open workspace browser for report selection
    setPendingReportConfig({ priority, lazyLoad });
    setIsWorkspaceBrowserOpen(true);
  };

  const removeOptimizedReport = (reportId: string) => {
    // If removing a duplicate report that was counted in active duplications, 
    // we need to handle this in the component lifecycle rather than here
    // since this just removes from the list, not from active processing
    setOptimizedReports((prev: OptimizedReport[]) =>
      prev.filter((report) => report.id !== reportId)
    );

    // Clean up start time tracking
    reportStartTimesRef.current.delete(reportId);

    setCurrentTestRun((prev: number) => prev + 1);
  };

  const clearAllReports = () => {
    setOptimizedReports([]);
    reportStartTimesRef.current.clear();
    setPerformanceMetrics([]);
    setCurrentTestRun(1);
    testRunIdRef.current = 0;
    setActiveDuplications(0); // Reset duplications counter
    setEmbedError(null); // Clear any errors
  };

  const handleReportLoaded = (
    reportId: string,
    priority: "high" | "normal" | "low",
    lazyLoad: boolean
  ) => {
    const currentTime = Date.now();
    const startTime = reportStartTimesRef.current.get(reportId);

    if (startTime) {
      // Calculate elapsed time properly (currentTime - startTime)
      const loadTime = currentTime - startTime;

      setPerformanceMetrics((prev: PerformanceMetrics[]) => [
        ...prev,
        {
          loadTime, // This is now elapsed time in milliseconds
          priority,
          lazyLoad,
          timestamp: new Date(),
          totalReports: optimizedReports.length,
          activeReports: optimizedReports.length,
        },
      ]);

      // Clean up the start time after recording
      reportStartTimesRef.current.delete(reportId);
    }
  };

  const handleReportError = (reportId: string, error: any) => {
    console.error(`Report ${reportId} failed to load:`, error);
    setEmbedError(
      `Report ${reportId} failed to load: ${error.message || error}`
    );

    // Clean up start time even on error
    reportStartTimesRef.current.delete(reportId);
  };

  const reloadAllReports = () => {
    console.log("🔄 Reloading all embedded reports...");

    // Clear any existing errors
    setEmbedError(null);

    // Reset performance metrics for fresh tracking
    setPerformanceMetrics([]);

    // Clear existing start times
    reportStartTimesRef.current.clear();

    // Reset start times for all current reports
    optimizedReports.forEach((report) => {
      reportStartTimesRef.current.set(report.id, Date.now());
    });

    // Increment test run to trigger re-render of all components
    setCurrentTestRun((prev: number) => prev + 1);

    console.log(`✅ Reloaded ${optimizedReports.length} reports`);
  };

  const handleWorkspaceSelection = (
    token: string,
    embedUrl: string,
    selection: any
  ) => {
    testRunIdRef.current += 1;
    const localReportId = `workspace-report-${testRunIdRef.current}`;

    // Record start time for performance tracking
    reportStartTimesRef.current.set(localReportId, Date.now());

    // Use pending configuration or default to normal priority
    const config = pendingReportConfig || {
      priority: "normal" as const,
      lazyLoad: false,
    };

    const newReport: OptimizedReport = {
      id: localReportId,
      name: `${config.priority.toUpperCase()} - ${
        selection?.report?.name || `Workspace Report ${testRunIdRef.current}`
      }${config.lazyLoad ? " (Lazy)" : ""}`,
      embedUrl: embedUrl,
      accessToken: token,
      workspaceName: selection?.workspace?.name || "Selected Workspace",
      priority: config.priority,
      lazyLoad: config.lazyLoad,
      addedAt: new Date(),
      // Store the actual Power BI report ID for embedding
      powerBiReportId: selection?.report?.id,
    };

    setOptimizedReports((prev: OptimizedReport[]) => {
      const updated = [...prev, newReport];
      return updated.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    });

    setIsWorkspaceBrowserOpen(false);
    setPendingReportConfig(null); // Clear pending configuration
    setCurrentTestRun((prev: number) => prev + 1);
  };

  const calculateAverageLoadTime = () => {
    if (performanceMetrics.length === 0) return 0;
    const total = performanceMetrics.reduce(
      (sum, metric) => sum + metric.loadTime,
      0
    );
    return Math.round(total / performanceMetrics.length);
  };

  const getMetricsByPriority = (priority: "high" | "normal" | "low") => {
    return performanceMetrics.filter((metric) => metric.priority === priority);
  };

  const resetPerformanceTest = () => {
    setPerformanceMetrics([]);
    setCurrentTestRun(1);
    setOptimizedReports([]);
    reportStartTimesRef.current.clear();
    testRunIdRef.current = 0;
    setEmbedError(null);
  };

  const startPerformanceTest = () => {
    resetPerformanceTest();

    // Add reports with different priorities and lazy loading configurations
    setTimeout(() => addOptimizedReport("high", false), 100);
    setTimeout(() => addOptimizedReport("normal", false), 200);
    setTimeout(() => addOptimizedReport("low", true), 300);
    setTimeout(() => addOptimizedReport("high", true), 400);
    setTimeout(() => addOptimizedReport("normal", true), 500);

    setCurrentTestRun((prev: number) => prev + 1);
  };

  const exportPerformanceData = () => {
    const data = {
      testRun: currentTestRun,
      reports: optimizedReports.map((report) => ({
        id: report.id,
        name: report.name,
        priority: report.priority,
        lazyLoad: report.lazyLoad,
        addedAt: report.addedAt.toISOString(),
      })),
      metrics: performanceMetrics.map((metric) => ({
        loadTime: metric.loadTime,
        priority: metric.priority,
        lazyLoad: metric.lazyLoad,
        timestamp: metric.timestamp.toISOString(),
        totalReports: metric.totalReports,
        activeReports: metric.activeReports,
      })),
      summary: {
        totalTests: performanceMetrics.length,
        averageLoadTime: calculateAverageLoadTime(),
        highPriorityAvg:
          getMetricsByPriority("high").length > 0
            ? Math.round(
                getMetricsByPriority("high").reduce(
                  (sum, m) => sum + m.loadTime,
                  0
                ) / getMetricsByPriority("high").length
              )
            : 0,
        normalPriorityAvg:
          getMetricsByPriority("normal").length > 0
            ? Math.round(
                getMetricsByPriority("normal").reduce(
                  (sum, m) => sum + m.loadTime,
                  0
                ) / getMetricsByPriority("normal").length
              )
            : 0,
        lowPriorityAvg:
          getMetricsByPriority("low").length > 0
            ? Math.round(
                getMetricsByPriority("low").reduce(
                  (sum, m) => sum + m.loadTime,
                  0
                ) / getMetricsByPriority("low").length
              )
            : 0,
      },
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `powerbi-performance-test-${currentTestRun}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const PerformanceStatsCard = ({
    title,
    value,
    unit = "ms",
    color = "#0078d4",
  }: {
    title: string;
    value: number;
    unit?: string;
    color?: string;
  }) => (
    <div
      style={{
        background: "white",
        border: `2px solid ${color}`,
        borderRadius: "8px",
        padding: "16px",
        margin: "8px",
        minWidth: "150px",
        textAlign: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
        {title}
      </div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>
        {value.toLocaleString()}
        {unit}
      </div>
    </div>
  );

  const AdvancedStatsTable = () => (
    <div style={{ margin: "20px 0" }}>
      <h3>Detailed Performance Metrics</h3>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "white",
          }}
        >
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                Load Time (ms)
              </th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                Priority
              </th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                Lazy Load
              </th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                Timestamp
              </th>
            </tr>
          </thead>
          <tbody>
            {performanceMetrics.map((metric, index) => (
              <tr key={index}>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  {metric.loadTime.toLocaleString()}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background:
                        metric.priority === "high"
                          ? "#ff6b6b"
                          : metric.priority === "normal"
                          ? "#4ecdc4"
                          : "#95a5a6",
                      color: "white",
                      fontSize: "12px",
                    }}
                  >
                    {metric.priority.toUpperCase()}
                  </span>
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  {metric.lazyLoad ? "✓" : "✗"}
                </td>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  {metric.timestamp.toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const toggleAnalysisMode = () => {
    setIsAnalysisMode(!isAnalysisMode);
  };

  const renderOptimizedReport = (report: OptimizedReport) => (
    <div key={report.id} style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px",
          background: "#f8f9fa",
          borderRadius: "8px 8px 0 0",
          border: "1px solid #dee2e6",
        }}
      >
        <div>
          <strong>{report.name}</strong>
          <div style={{ fontSize: "12px", color: "#666" }}>
            Priority: {report.priority} | Lazy Load:{" "}
            {report.lazyLoad ? "Yes" : "No"} | Added:{" "}
            {report.addedAt.toLocaleTimeString()}
          </div>
        </div>
        <div style={{ display: "flex", gap: "5px" }}>
          <button
            onClick={() => removeOptimizedReport(report.id)}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title="Remove this report"
          >
            🗑️ Remove
          </button>
          <button
            onClick={() => duplicateReport(report.id)}
            style={{
              background: "#007bff",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title="Duplicate this report with same settings"
          >
            📋 Duplicate
          </button>
        </div>
      </div>
      <PowerBIErrorBoundary>
        <EmbeddedPowerBIContainer
          key={`${report.id}-${currentTestRun}`}
          embedUrl={report.embedUrl}
          accessToken={report.accessToken}
          reportId={report.powerBiReportId || report.id}
          onLoaded={(reportInstance) =>
            handleReportLoaded(report.id, report.priority, report.lazyLoad)
          }
          onError={(error) => handleReportError(report.id, error)}
          height="400px"
          lazyLoad={report.lazyLoad}
          priority={report.priority}
        />
      </PowerBIErrorBoundary>
    </div>
  );

  // Add a duplicate report function with enhanced feedback and token refresh
  const duplicateReport = async (reportId: string) => {
    // Limit concurrent duplications to prevent overloading Power BI API
    if (activeDuplications >= 3) {
      setEmbedError("Too many concurrent duplications. Please wait for current ones to complete.");
      return;
    }

    const reportToDuplicate = optimizedReports.find(
      (report) => report.id === reportId
    );
    if (reportToDuplicate) {
      try {
        // Increment active duplications counter
        setActiveDuplications(prev => prev + 1);
        
        testRunIdRef.current += 1;
        const duplicateId = `duplicate-${Date.now()}-${testRunIdRef.current}`;

        // Record start time for performance tracking
        reportStartTimesRef.current.set(duplicateId, Date.now());

        // Add delay to prevent rate limiting (especially for multiple quick duplications)
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

        // Try to get a fresh token for the duplicate to avoid token issues
        let accessToken = reportToDuplicate.accessToken;
        try {
          // Check if we have access to token service and try to refresh
          if (powerBIService.isInitialized()) {
            const freshToken = await powerBIService.getValidToken();
            
            // Validate token is different and not empty
            if (freshToken && freshToken !== accessToken && freshToken.length > 10) {
              accessToken = freshToken;
              console.log("🔄 Using fresh token for duplicate report");
            } else {
              console.warn("⚠️ Fresh token appears invalid or same as original, using original");
            }
          }
        } catch (tokenError) {
          console.warn(
            "⚠️ Could not refresh token, using original:",
            tokenError
          );
          // Continue with original token
        }

        // Generate a unique embed URL by adding a timestamp parameter to avoid caching issues
        let uniqueEmbedUrl = reportToDuplicate.embedUrl;
        if (uniqueEmbedUrl.includes('?')) {
          uniqueEmbedUrl += `&_t=${Date.now()}`;
        } else {
          uniqueEmbedUrl += `?_t=${Date.now()}`;
        }

        const newReport: OptimizedReport = {
          ...reportToDuplicate,
          id: duplicateId,
          name: `${reportToDuplicate.name} (Copy #${testRunIdRef.current})`,
          accessToken: accessToken, // Use potentially refreshed token
          embedUrl: uniqueEmbedUrl, // Use unique URL to avoid caching
          addedAt: new Date(),
        };

        setOptimizedReports((prev) => {
          const updated = [...prev, newReport];
          return updated.sort((a, b) => {
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });
        });

        // Trigger re-render
        setCurrentTestRun((prev: number) => prev + 1);

        // Show success feedback
        console.log(`📋 Duplicated report: ${reportToDuplicate.name}`);
      } catch (error) {
        console.error(
          `❌ Failed to duplicate report ${reportToDuplicate.name}:`,
          error
        );
        setEmbedError(
          `Failed to duplicate report: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        // Decrement active duplications counter
        setActiveDuplications(prev => Math.max(0, prev - 1));
      }
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Multi-PowerBI Analysis (MPA) Test Page</h1>
      <p>
        Test and analyze multiple PowerBI reports with different optimization
        strategies.
      </p>

      {embedError && (
        <div
          style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "20px",
            border: "1px solid #f5c6cb",
          }}
        >
          {embedError}
          <button
            onClick={() => setEmbedError(null)}
            style={{
              float: "right",
              background: "transparent",
              border: "none",
              color: "#721c24",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <h2>Performance Dashboard</h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <PerformanceStatsCard
            title="Total Reports"
            value={optimizedReports.length}
            unit=""
            color="#28a745"
          />
          <PerformanceStatsCard
            title="Active Reports"
            value={optimizedReports.length}
            unit=""
            color="#17a2b8"
          />
          <PerformanceStatsCard
            title="PowerBI Service (Singleton)"
            value={serviceMetrics.totalServices}
            unit=""
            color="#ff6f61"
          />
          <PerformanceStatsCard
            title="Active Frames"
            value={serviceMetrics.activeFrames}
            unit=""
            color="#ff9f43"
          />
          <PerformanceStatsCard
            title="Active Duplications"
            value={activeDuplications}
            unit="/3 max"
            color={activeDuplications >= 3 ? "#dc3545" : "#28a745"}
          />
          <PerformanceStatsCard
            title="Tests Completed"
            value={performanceMetrics.length}
            unit=""
            color="#6f42c1"
          />
          <PerformanceStatsCard
            title="Average Load Time"
            value={calculateAverageLoadTime()}
            unit="ms"
            color="#fd7e14"
          />
          <PerformanceStatsCard
            title="High Priority Avg"
            value={
              getMetricsByPriority("high").length > 0
                ? Math.round(
                    getMetricsByPriority("high").reduce(
                      (sum, m) => sum + m.loadTime,
                      0
                    ) / getMetricsByPriority("high").length
                  )
                : 0
            }
            unit="ms"
            color="#dc3545"
          />
          <PerformanceStatsCard
            title="Normal Priority Avg"
            value={
              getMetricsByPriority("normal").length > 0
                ? Math.round(
                    getMetricsByPriority("normal").reduce(
                      (sum, m) => sum + m.loadTime,
                      0
                    ) / getMetricsByPriority("normal").length
                  )
                : 0
            }
            unit="ms"
            color="#28a745"
          />
          <PerformanceStatsCard
            title="Low Priority Avg"
            value={
              getMetricsByPriority("low").length > 0
                ? Math.round(
                    getMetricsByPriority("low").reduce(
                      (sum, m) => sum + m.loadTime,
                      0
                    ) / getMetricsByPriority("low").length
                  )
                : 0
            }
            unit="ms"
            color="#6c757d"
          />
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Control Panel</h2>
        <p style={{ color: "#666", marginBottom: "15px" }}>
          🎯 <strong>All priority buttons open workspace selection</strong> -
          Choose a report from your Power BI workspace and it will be added with
          the specified priority and settings.
          <br />
          🔄 <strong>Reload All Reports</strong> - Refreshes all embedded
          reports while keeping your selections (useful for performance testing
          or data refresh).
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => addOptimizedReport("high", false)}
            style={{
              background: "#dc3545",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            📊 Add High Priority Report
          </button>
          <button
            onClick={() => addOptimizedReport("normal", false)}
            style={{
              background: "#28a745",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            📈 Add Normal Priority Report
          </button>
          <button
            onClick={() => addOptimizedReport("low", true)}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            📉 Add Low Priority Report (Lazy)
          </button>
          <button
            onClick={clearAllReports}
            style={{
              background: "#6c757d",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clear All
          </button>
          <button
            onClick={reloadAllReports}
            style={{
              background: "#007bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            🔄 Reload All Reports
          </button>
          <button
            onClick={startPerformanceTest}
            style={{
              background: "#fd7e14",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Start Performance Test
          </button>
          <button
            onClick={exportPerformanceData}
            style={{
              background: "#6f42c1",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            disabled={performanceMetrics.length === 0}
          >
            Export Data
          </button>
          <button
            onClick={toggleAnalysisMode}
            style={{
              background: isAnalysisMode ? "#28a745" : "#007bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {isAnalysisMode ? "Hide Analysis" : "Show Analysis"}
          </button>
          <button
            onClick={() => {
              const newMode = !serviceMetrics.singletonMode;
              powerBIService.setSingletonMode(newMode);

              // Clear all reports to ensure proper reinitialization
              clearAllReports();

              // Show notification
              alert(
                `Singleton mode ${
                  newMode ? "enabled" : "disabled"
                }. All reports have been cleared for proper reinitialization.`
              );
            }}
            style={{
              background: serviceMetrics.singletonMode ? "#17a2b8" : "#ffc107",
              color: serviceMetrics.singletonMode ? "white" : "black",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔧{" "}
            {serviceMetrics.singletonMode ? "Singleton: ON" : "Singleton: OFF"}
          </button>
        </div>
      </div>

      {isAnalysisMode && performanceMetrics.length > 0 && (
        <AdvancedStatsTable />
      )}

      <div style={{ marginBottom: "20px" }}>
        <h2>Embedded Reports (Test Run #{currentTestRun})</h2>
        {optimizedReports.length === 0 ? (
          <p style={{ color: "#666", fontStyle: "italic" }}>
            No reports loaded. Use the control panel above to add reports and
            test performance.
          </p>
        ) : (
          optimizedReports.map(renderOptimizedReport)
        )}
      </div>

      {isWorkspaceBrowserOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "80%",
              maxHeight: "80%",
              overflow: "auto",
            }}
          >
            {pendingReportConfig && (
              <div
                style={{
                  marginBottom: "15px",
                  padding: "10px",
                  backgroundColor: "#e7f3ff",
                  borderRadius: "4px",
                  border: "1px solid #b3d9ff",
                }}
              >
                <strong>
                  🎯 Selecting report for:{" "}
                  {pendingReportConfig.priority.toUpperCase()} Priority
                  {pendingReportConfig.lazyLoad ? " (Lazy Load)" : ""}
                </strong>
              </div>
            )}
            <WorkspaceBrowser
              onEmbedTokenGenerated={(token, embedUrl, selection) => {
                handleWorkspaceSelection(token, embedUrl, selection);
                setIsWorkspaceBrowserOpen(false);
              }}
            />
            <button
              onClick={() => setIsWorkspaceBrowserOpen(false)}
              style={{
                marginTop: "10px",
                padding: "8px 16px",
                backgroundColor: "#666",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MPATestPage;
