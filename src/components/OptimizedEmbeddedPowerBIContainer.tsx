/**
 * Optimized PowerBI Container with React.memo, useMemo, and useCallback
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { service, factories, Report } from "powerbi-client";
import { IReportEmbedConfiguration } from "powerbi-models";
import { powerBIService } from "../services/PowerBIService";
import { powerBIErrorHandler } from "../services/PowerBIErrorHandler";
import { powerBIOptimizer } from "../services/PowerBIPerformanceOptimizer";
import { PowerBIToolbar } from "./PowerBIToolbar";

interface OptimizedEmbeddedPowerBIContainerProps {
  reportId: string;
  embedUrl: string;
  accessToken: string;
  height?: string | number;
  onLoaded?: (report: Report) => void;
  onError?: (error: any) => void;
  priority?: "high" | "normal" | "low";
  lazyLoad?: boolean;
  className?: string;
  showToolbar?: boolean;
  reportName?: string;
  // More optimization props
  enableCaching?: boolean;
  enablePreloading?: boolean;
  virtualScrolling?: boolean;
}

// Memoized component for better performance
export const OptimizedEmbeddedPowerBIContainer: React.FC<OptimizedEmbeddedPowerBIContainerProps> =
  React.memo(
    ({
      reportId,
      embedUrl,
      accessToken,
      height = 500,
      onLoaded,
      onError,
      priority = "normal",
      lazyLoad = false,
      className = "",
      showToolbar = false,
      reportName = "PowerBI Report",
      enableCaching = true,
      enablePreloading = true,
      virtualScrolling = false,
    }) => {
      // Refs for stable references
      const wrapperRef = useRef<HTMLDivElement>(null);
      const detachedContainerRef = useRef<HTMLDivElement | null>(null);
      const reportRef = useRef<Report | null>(null);
      const instanceId = useRef(
        `optimized-powerbi-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`
      );

      // State
      const [isLoading, setIsLoading] = useState(false);
      const [hasError, setHasError] = useState<string | null>(null);
      const [shouldLoad, setShouldLoad] = useState(
        priority === "high" || !lazyLoad
      );
      const [isVisible, setIsVisible] = useState(!lazyLoad);

      // Memoized callback refs to prevent unnecessary re-renders
      const onLoadedCallback = useCallback(
        (report: Report) => {
          onLoaded?.(report);
        },
        [onLoaded]
      );

      const onErrorCallback = useCallback(
        (error: any) => {
          onError?.(error);
        },
        [onError]
      );

      // Memoized embed configuration
      const embedConfig = useMemo((): IReportEmbedConfiguration => {
        // Check cache first
        if (enableCaching) {
          const cached = powerBIOptimizer.getCachedReport(reportId);
          if (cached) {
            console.log(`📦 Using cached config for ${reportId}`);
          }
        }

        const baseConfig: IReportEmbedConfiguration = {
          type: "report",
          id: reportId,
          embedUrl: embedUrl,
          accessToken: accessToken,
          tokenType: 1,
          settings: {
            panes: {
              filters: { expanded: false, visible: true },
              pageNavigation: { visible: true },
            },
            bars: {
              statusBar: { visible: false },
              actionBar: { visible: true },
            },
            // Performance optimizations
            layoutType: 1,
            customLayout: {
              displayOption: 1,
              pageSize: { type: 0 },
            },
            // Reduce initial load
            filterPaneEnabled: false,
            navContentPaneEnabled: true,
          },
        };

        return enableCaching
          ? powerBIOptimizer.getOptimizedConfig(reportId, baseConfig)
          : baseConfig;
      }, [reportId, embedUrl, accessToken, enableCaching]);

      // Memoized style object to prevent re-renders
      const containerStyle = useMemo(
        () => ({
          width: "100%",
          height:
            typeof height === "number" ? `${height}px` : height.toString(),
          backgroundColor: "#f5f5f5",
          border: "1px solid #e1e5e9",
          borderRadius: showToolbar ? "0 0 4px 4px" : "4px",
          borderTop: showToolbar ? "none" : "1px solid #e1e5e9",
          position: "relative" as const,
          overflow: "hidden" as const,
        }),
        [height, showToolbar]
      );

      // Optimized embed function with caching
      const embedReport = useCallback(async () => {
        if (!wrapperRef.current || !shouldLoad) return;

        try {
          setIsLoading(true);
          setHasError(null);

          // Cache the report configuration
          if (enableCaching) {
            powerBIOptimizer.cacheReport(reportId, embedUrl, accessToken);
          }

          // Clear previous embed
          if (reportRef.current) {
            reportRef.current.off("loaded");
            reportRef.current.off("error");
            reportRef.current = null;
          }

          // Create detached container
          const detachedContainer = document.createElement("div");
          detachedContainer.id = instanceId.current;
          detachedContainer.style.width = "100%";
          detachedContainer.style.height = "100%";
          detachedContainer.style.border = "none";
          detachedContainer.setAttribute("data-powerbi-optimized", "true");
          detachedContainer.setAttribute("data-report-id", reportId);

          detachedContainerRef.current = detachedContainer;

          // Embed using service
          const report = await powerBIService.embedReport(
            instanceId.current,
            detachedContainer,
            embedConfig
          );

          reportRef.current = report;

          // Optimized event listeners
          const handleLoaded = () => {
            console.log(`✅ Optimized report loaded: ${reportId}`);
            setIsLoading(false);

            // Enable preloading for next reports
            if (enablePreloading) {
              powerBIOptimizer.preloadReport(reportId);
            }

            onLoadedCallback(report);
          };

          const handleError = (event: any) => {
            const parsedError = powerBIErrorHandler.parseError(event, reportId);
            const userMessage =
              powerBIErrorHandler.getUserFriendlyMessage(parsedError);

            console.error(
              `❌ Optimized PowerBI error for ${reportId}:`,
              parsedError
            );
            setHasError(userMessage);
            setIsLoading(false);
            onErrorCallback(parsedError);
          };

          // Use event delegation for better performance
          report.on("loaded", handleLoaded);
          report.on("error", handleError);

          // Append to wrapper
          if (wrapperRef.current) {
            wrapperRef.current.appendChild(detachedContainer);
          }

          // Setup intersection observer for lazy loading
          if (lazyLoad && enablePreloading) {
            powerBIOptimizer.observeElement(detachedContainer, reportId);
          }
        } catch (error: any) {
          console.error(
            `❌ Failed to embed optimized report ${reportId}:`,
            error
          );
          setHasError(error.message || "Failed to load report");
          setIsLoading(false);
          onErrorCallback(error);
        }
      }, [
        reportId,
        embedUrl,
        accessToken,
        shouldLoad,
        embedConfig,
        enableCaching,
        enablePreloading,
        lazyLoad,
        onLoadedCallback,
        onErrorCallback,
      ]);

      // Optimized cleanup function
      const cleanup = useCallback(() => {
        if (reportRef.current) {
          reportRef.current.off("loaded");
          reportRef.current.off("error");
          reportRef.current = null;
        }

        if (detachedContainerRef.current) {
          // Stop observing
          if (lazyLoad && enablePreloading) {
            powerBIOptimizer.unobserveElement(detachedContainerRef.current);
          }

          if (detachedContainerRef.current.parentNode) {
            detachedContainerRef.current.parentNode.removeChild(
              detachedContainerRef.current
            );
          }
          detachedContainerRef.current = null;
        }

        if (wrapperRef.current) {
          wrapperRef.current.innerHTML = "";
        }
      }, [lazyLoad, enablePreloading]);

      // Lazy loading effect
      useEffect(() => {
        if (!lazyLoad) {
          setShouldLoad(true);
          return;
        }

        if (!wrapperRef.current) return;

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              setShouldLoad(true);
              observer.disconnect();
            }
          },
          { rootMargin: "50px" }
        );

        observer.observe(wrapperRef.current);
        return () => observer.disconnect();
      }, [lazyLoad]);

      // Embed effect with dependency optimization
      useEffect(() => {
        if (shouldLoad && isVisible) {
          embedReport();
        }
        return cleanup;
      }, [shouldLoad, isVisible, embedReport, cleanup]);

      // Memoized toolbar component
      const toolbar = useMemo(() => {
        if (!showToolbar) return null;

        return (
          <PowerBIToolbar
            report={reportRef.current}
            reportId={reportId}
            reportName={reportName}
            containerId={instanceId.current}
            onError={(error) => {
              setHasError(error);
              onErrorCallback(error);
            }}
            onReportReload={() => {
              console.log("🔧 Reloading optimized report...");
              cleanup();
              setHasError(null);
              setTimeout(() => {
                setShouldLoad(true);
                embedReport();
              }, 500);
            }}
          />
        );
      }, [
        showToolbar,
        reportId,
        reportName,
        cleanup,
        embedReport,
        onErrorCallback,
      ]);

      return (
        <div
          className={`optimized-powerbi-embed ${className} priority-${priority}`}
        >
          {toolbar}

          {isLoading && (
            <div
              className="optimized-powerbi-loading"
              style={{ padding: "20px", textAlign: "center" }}
            >
              <div>🔄 Loading optimized report...</div>
            </div>
          )}

          {hasError && (
            <div
              className="optimized-powerbi-error"
              style={{ padding: "20px", textAlign: "center", color: "red" }}
            >
              <p>❌ Error: {hasError}</p>
              <button onClick={embedReport} style={{ marginTop: "10px" }}>
                🔄 Retry
              </button>
            </div>
          )}

          <div
            ref={wrapperRef}
            className="optimized-powerbi-wrapper"
            style={containerStyle}
            data-priority={priority}
            data-report-id={reportId}
          />
        </div>
      );
    },
    (prevProps, nextProps) => {
      return (
        prevProps.reportId === nextProps.reportId &&
        prevProps.embedUrl === nextProps.embedUrl &&
        prevProps.accessToken === nextProps.accessToken &&
        prevProps.height === nextProps.height &&
        prevProps.priority === nextProps.priority &&
        prevProps.lazyLoad === nextProps.lazyLoad &&
        prevProps.showToolbar === nextProps.showToolbar &&
        prevProps.reportName === nextProps.reportName
      );
    }
  );

OptimizedEmbeddedPowerBIContainer.displayName =
  "OptimizedEmbeddedPowerBIContainer";
