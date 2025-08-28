/**
 * Virtual Scrolling Container for Multiple PowerBI Reports
 * Only renders visible reports to improve performance
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { OptimizedEmbeddedPowerBIContainer } from './OptimizedEmbeddedPowerBIContainer';

interface VirtualReport {
  id: string;
  reportId: string;
  embedUrl: string;
  accessToken: string;
  reportName: string;
  height?: number;
  priority?: "high" | "normal" | "low";
}

interface VirtualScrollContainerProps {
  reports: VirtualReport[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  enableCaching?: boolean;
  enablePreloading?: boolean;
  onReportLoad?: (reportId: string) => void;
  onReportError?: (reportId: string, error: any) => void;
}

export const VirtualScrollContainer: React.FC<VirtualScrollContainerProps> = ({
  reports,
  itemHeight,
  containerHeight,
  overscan = 2,
  enableCaching = true,
  enablePreloading = true,
  onReportLoad,
  onReportError
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      reports.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(reports.length - 1, endIndex + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, reports.length, overscan]);

  // Get visible reports
  const visibleReports = useMemo(() => {
    return reports.slice(visibleRange.start, visibleRange.end + 1);
  }, [reports, visibleRange]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  // Optimized scroll handler with throttling
  const throttledHandleScroll = useCallback(
    throttle(handleScroll, 16), // 60fps
    [handleScroll]
  );

  return (
    <div
      ref={scrollElementRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={throttledHandleScroll}
    >
      {/* Spacer for total height */}
      <div style={{ height: reports.length * itemHeight, position: 'relative' }}>
        {visibleReports.map((report, index) => {
          const actualIndex = visibleRange.start + index;
          const top = actualIndex * itemHeight;

          return (
            <div
              key={report.id}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
                height: itemHeight,
                padding: '10px'
              }}
            >
              <OptimizedEmbeddedPowerBIContainer
                reportId={report.reportId}
                embedUrl={report.embedUrl}
                accessToken={report.accessToken}
                height={itemHeight - 20} // Account for padding
                reportName={report.reportName}
                priority={report.priority || "normal"}
                lazyLoad={true}
                enableCaching={enableCaching}
                enablePreloading={enablePreloading}
                showToolbar={true}
                onLoaded={() => onReportLoad?.(report.reportId)}
                onError={(error) => onReportError?.(report.reportId, error)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
