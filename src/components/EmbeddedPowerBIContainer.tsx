// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { service, factories, Report } from "powerbi-client";
import { IReportEmbedConfiguration } from "powerbi-models";
import { powerBIService } from "../services/PowerBIService";
import { powerBIErrorHandler } from "../services/PowerBIErrorHandler";
import { PowerBIToolbar } from "./PowerBIToolbar";

interface EmbeddedPowerBIContainerProps {
  reportId: string;
  embedUrl: string;
  accessToken: string;
  height?: string | number;
  onLoaded?: (report: Report) => void;
  onError?: (error: any) => void;
  // Optimization props
  priority?: "high" | "normal" | "low";
  lazyLoad?: boolean;
  maxConcurrentLoads?: number;
  resourceOptimization?: {
    disableAnimations?: boolean;
    reduceQuality?: boolean;
    limitRefreshRate?: boolean;
  };
  className?: string;
  showLoadingState?: boolean;
  showToolbar?: boolean;
  reportName?: string;
}

// Global state for concurrent load management
let globalActiveLoads = 0;
const loadQueue: Array<{ reportId: string; callback: () => void }> = [];

const processLoadQueue = () => {
  if (loadQueue.length > 0 && globalActiveLoads < 3) {
    const next = loadQueue.shift();
    if (next) {
      next.callback();
    }
  }
};

/**
 * Enhanced PowerBI Embed - OPTIMIZED DETACHED DOM SOLUTION
 *
 * This component creates a PowerBI embed container that is COMPLETELY SEPARATE
 * from React's virtual DOM with advanced optimization features.
 *
 * Features:
 * - Complete DOM detachment (no React/PowerBI conflicts)
 * - Priority-based loading (high, normal, low)
 * - Lazy loading with intersection observer
 * - Concurrent load management
 * - Resource optimization options
 */
export const EmbeddedPowerBIContainer: React.FC<
  EmbeddedPowerBIContainerProps
> = ({
  reportId,
  embedUrl,
  accessToken,
  height = 500,
  onLoaded,
  onError,
  priority = "normal",
  lazyLoad = false,
  maxConcurrentLoads = 3,
  resourceOptimization = {},
  className = "",
  showLoadingState = true,
  showToolbar = false, // Disable custom toolbar to avoid duplication with Power BI native toolbar
  reportName = "PowerBI Report",
}) => {
  // React container - only holds the detached PowerBI element
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Detached PowerBI container - created outside React's DOM tree
  const detachedContainerRef = useRef<HTMLDivElement | null>(null);
  const reportRef = useRef<Report | null>(null);
  const serviceRef = useRef<service.Service | null>(null);
  const instanceId = useRef(
    `enhanced-powerbi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [shouldLoad, setShouldLoad] = useState(
    priority === "high" || !lazyLoad
  );
  const [isVisible, setIsVisible] = useState(!lazyLoad);

  // Use refs to avoid recreating embedReport when callbacks change
  const onLoadedRef = useRef(onLoaded);
  const onErrorRef = useRef(onError);
  const isEmbeddingRef = useRef(false);
  const hasEmbeddedRef = useRef(false);

  // Update refs when callbacks change without triggering re-embed
  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initialize PowerBI service - use singleton or individual instance
  useEffect(() => {
    if (!serviceRef.current) {
      if (powerBIService.isSingletonModeEnabled()) {
        serviceRef.current = powerBIService.getServiceInstance();
        console.log("🔧 Enhanced PowerBI service initialized using singleton");
      } else {
        serviceRef.current = powerBIService.createNewServiceInstance();
        console.log("🔧 Enhanced PowerBI service initialized using individual instance");
      }
    }
  }, []);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (!lazyLoad || shouldLoad) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Check priority and concurrent limits
            if (priority === "high" || globalActiveLoads < maxConcurrentLoads) {
              setShouldLoad(true);
              console.log(
                `🚀 Report ${reportId} starting load (${priority} priority)`
              );
            } else {
              // Add to queue for normal/low priority
              loadQueue.push({
                reportId,
                callback: () => setShouldLoad(true),
              });
              console.log(
                `📋 Report ${reportId} queued (${globalActiveLoads}/${maxConcurrentLoads} active)`
              );
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => observer.disconnect();
  }, [lazyLoad, shouldLoad, reportId, maxConcurrentLoads, priority]);

  // Complete cleanup
  const cleanup = useCallback(() => {
    console.log("🧹 Starting enhanced cleanup for:", instanceId.current);

    try {
      // Unregister from singleton service (only in singleton mode)
      if (powerBIService.isSingletonModeEnabled()) {
        powerBIService.unregisterEmbedInstance(instanceId.current);
      }

      if (reportRef.current) {
        reportRef.current.off("loaded");
        reportRef.current.off("error");
        reportRef.current = null;
      }

      if (detachedContainerRef.current) {
        if (detachedContainerRef.current.parentNode) {
          detachedContainerRef.current.parentNode.removeChild(
            detachedContainerRef.current
          );
        }
        detachedContainerRef.current.innerHTML = "";
        detachedContainerRef.current = null;
      }

      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = "";
      }

      // Update global load count without dependency on isLoading state
      globalActiveLoads = Math.max(0, globalActiveLoads - 1);
      processLoadQueue();
    } catch (error) {
      console.warn("⚠️ Error during enhanced cleanup:", error);
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Enhanced embed function with optimizations
  const embedReport = useCallback(async () => {
    if (!wrapperRef.current || !reportId || !embedUrl || !accessToken) {
      const missingParams = [];
      if (!reportId) missingParams.push('reportId');
      if (!embedUrl) missingParams.push('embedUrl');
      if (!accessToken) missingParams.push('accessToken');
      
      const errorMsg = `Missing required parameters: ${missingParams.join(', ')}`;
      console.error("❌ Embed validation failed:", errorMsg);
      setHasError(errorMsg);
      return;
    }

    // Prevent multiple simultaneous embeds
    if (isEmbeddingRef.current) {
      console.log("🔄 Embedding already in progress, skipping...");
      return;
    }

    const powerbiService = serviceRef.current;
    if (!powerbiService) {
      console.error("❌ PowerBI service not initialized");
      return;
    }

    try {
      isEmbeddingRef.current = true;
      setIsLoading(true);
      setHasError(null);

      // Clear any existing embed directly
      if (reportRef.current) {
        reportRef.current.off("loaded");
        reportRef.current.off("error");
        reportRef.current = null;
      }

      if (detachedContainerRef.current) {
        if (detachedContainerRef.current.parentNode) {
          detachedContainerRef.current.parentNode.removeChild(
            detachedContainerRef.current
          );
        }
        detachedContainerRef.current.innerHTML = "";
        detachedContainerRef.current = null;
      }

      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = "";
      }

      // Update global load count
      globalActiveLoads++;

      console.log(
        `🚀 Starting enhanced PowerBI embedding: ${reportId} (${priority} priority)`
      );

      const detachedContainer = document.createElement("div");
      detachedContainer.id = `powerbi-enhanced-${instanceId.current}`;
      detachedContainer.style.width = "100%";
      detachedContainer.style.height =
        typeof height === "number" ? `${height}px` : height.toString();
      detachedContainer.style.border = "none";
      detachedContainer.style.margin = "0";
      detachedContainer.style.padding = "0";

      detachedContainer.setAttribute("data-powerbi-enhanced", "true");
      detachedContainer.setAttribute("data-priority", priority);
      detachedContainer.setAttribute("data-report-id", reportId); // Add report ID for fullscreen fallback
      detachedContainerRef.current = detachedContainer;

      // Enhanced configuration with optimizations
      const config: IReportEmbedConfiguration = {
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
            actionBar: { visible: true }, // Enable the built-in action bar
          },
          // Apply resource optimizations
          ...(resourceOptimization.disableAnimations && {
            animationsEnabled: false,
          }),
        },
      };

      // Apply priority-based settings
      if (priority === "low") {
        config.settings = {
          ...config.settings,
          layoutType: 0, // Custom layout for faster loading
        };
      }

      // Debug logging for configuration
      console.log(`🔧 Embed config for ${reportId}:`, {
        ...config,
        accessToken: config.accessToken ? `${config.accessToken.substring(0, 20)}...` : 'null'
      });

      const report = powerbiService.embed(detachedContainer, config) as Report;
      reportRef.current = report;

      report.on("loaded", () => {
        console.log(`✅ Enhanced report loaded: ${reportId} (${priority})`);
        setIsLoading(false);
        isEmbeddingRef.current = false;
        globalActiveLoads = Math.max(0, globalActiveLoads - 1);
        processLoadQueue(); // Process any queued loads

        // Register the report instance with the singleton service for metrics tracking (only in singleton mode)
        if (powerBIService.isSingletonModeEnabled()) {
          powerBIService.registerEmbedInstance(
            instanceId.current,
            'report',
            report,
            detachedContainer,
            config
          );
        }

        // Store report instance globally for control operations
        (window as any)[`powerbiReport_${reportId}`] = report;

        onLoadedRef.current?.(report);
      });

      report.on("error", (event: any) => {
        const parsedError = powerBIErrorHandler.parseError(event, reportId);
        const userFriendlyMessage = powerBIErrorHandler.getUserFriendlyMessage(parsedError);
        
        console.error(`❌ Enhanced PowerBI error for ${reportId}:`, parsedError);
        
        // Check if this error should be retried automatically
        if (powerBIErrorHandler.shouldRetry(parsedError, reportId)) {
          console.log(`🔄 Auto-retry available for ${parsedError.code} on ${reportId}`);
          
          // For QueryUserError on duplicate reports, implement retry logic
          if (parsedError.code.includes('QueryUserError') && reportId.includes('duplicate')) {
            powerBIErrorHandler.executeRetry(parsedError, reportId, async () => {
              console.log(`🔄 Auto-retrying duplicate report ${reportId} after QueryUserError...`);
              
              // Clear the container and try to re-embed with a delay
              if (detachedContainerRef.current) {
                detachedContainerRef.current.innerHTML = '';
              }
              
              // Add extra delay for retries
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Retry the embed
              embedReport();
              return true;
            }).catch(retryError => {
              console.error(`❌ Auto-retry failed for ${reportId}:`, retryError);
              setHasError(userFriendlyMessage);
            });
          } else {
            setHasError(userFriendlyMessage);
          }
        } else {
          setHasError(userFriendlyMessage);
        }
        
        setIsLoading(false);
        isEmbeddingRef.current = false;
        globalActiveLoads = Math.max(0, globalActiveLoads - 1);
        processLoadQueue();
        onErrorRef.current?.(parsedError);
      });

      if (wrapperRef.current) {
        wrapperRef.current.appendChild(detachedContainer);
      }
    } catch (error: any) {
      const errorDetails = {
        message: error?.message || 'Unknown embedding error',
        stack: error?.stack,
        name: error?.name,
        reportId: reportId,
        embedUrl: embedUrl ? embedUrl.substring(0, 50) + '...' : 'null'
      };
      
      console.error("❌ Enhanced embedding failed:", errorDetails);
      
      let userFriendlyError = errorDetails.message || "Failed to embed report";
      if (error?.message?.includes('Invalid embed url') || error?.message?.includes('embed URL')) {
        userFriendlyError = "Invalid embed URL provided";
      } else if (error?.message?.includes('Token') || error?.message?.includes('token')) {
        userFriendlyError = "Access token issue - please check token validity";
      } else if (error?.message?.includes('Service') || error?.message?.includes('service')) {
        userFriendlyError = "PowerBI service initialization failed";
      }
      
      setHasError(userFriendlyError);
      setIsLoading(false);
      isEmbeddingRef.current = false;
      globalActiveLoads = Math.max(0, globalActiveLoads - 1);
      processLoadQueue();
      onErrorRef.current?.(errorDetails);
    }
  }, [reportId, embedUrl, accessToken, height, priority, resourceOptimization]);

  useEffect(() => {
    if (shouldLoad && reportId && embedUrl && accessToken) {
      embedReport();
    }
  }, [shouldLoad, reportId, embedUrl, accessToken]);

  const getPriorityColor = () => {
    switch (priority) {
      case "high":
        return "#FF5722";
      case "low":
        return "#FFC107";
      default:
        return "#4CAF50";
    }
  };

  return (
    <div className={`enhanced-powerbi-embed ${className} priority-${priority}`}>
      {/* PowerBI Toolbar */}
      {showToolbar && (
        <PowerBIToolbar
          report={reportRef.current}
          reportId={reportId}
          reportName={reportName}
          containerId={instanceId.current}
          onError={(error) => {
            setHasError(error);
            onErrorRef.current?.(error);
          }}
          onReportReload={() => {
            console.log('🔧 Reloading report due to user request...');
            cleanup();
            setHasError(null);
            // Force re-embed after cleanup
            setTimeout(() => {
              setShouldLoad(true);
              embedReport();
            }, 500);
          }}
        />
      )}

      {isLoading && showLoadingState && (
        <div className="enhanced-powerbi-loading">
          <div className="spinner"></div>
          <p>🔄 Loading report ({priority} priority)...</p>
        </div>
      )}

      {!shouldLoad && lazyLoad && showLoadingState && (
        <div className="enhanced-powerbi-lazy">
          <p>📋 Report queued for lazy loading...</p>
        </div>
      )}

      {hasError && (
        <div className="enhanced-powerbi-error">
          <p>❌ Error: {hasError}</p>
          <button onClick={embedReport}>🔄 Retry</button>
        </div>
      )}

      <div
        id={instanceId.current}
        ref={wrapperRef}
        className="enhanced-powerbi-wrapper"
        style={{
          width: "100%",
          height:
            typeof height === "number" ? `${height}px` : height.toString(),
          backgroundColor: "#f5f5f5",
          border: `2px solid ${getPriorityColor()}`,
          borderRadius: showToolbar ? "0 0 4px 4px" : "4px",
          borderTop: showToolbar ? "none" : `2px solid ${getPriorityColor()}`,
          position: "relative",
          overflow: "hidden",
        }}
        data-priority={priority}
      />
    </div>
  );
};
