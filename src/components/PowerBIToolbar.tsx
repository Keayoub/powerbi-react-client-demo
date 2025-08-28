// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useEffect } from 'react';
import { Report } from 'powerbi-client';
import { powerBIErrorHandler, PowerBIError } from '../services/PowerBIErrorHandler';
import { powerBIAuthService } from '../services/PowerBIAuthService';
import './PowerBIToolbar.css';

interface PowerBIToolbarProps {
  report: Report | null;
  reportId: string;
  reportName: string;
  containerId: string;
  onError?: (error: string) => void;
  onReportReload?: () => void;
}

export const PowerBIToolbar: React.FC<PowerBIToolbarProps> = ({
  report,
  reportId,
  reportName,
  containerId,
  onError,
  onReportReload
}) => {
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [availableBookmarks, setAvailableBookmarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<PowerBIError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Load bookmarks when report changes
  useEffect(() => {
    if (report) {
      loadBookmarks();
    } else {
      setAvailableBookmarks([]);
      setShowBookmarks(false);
    }
  }, [report]);

  // Clear retry history when report changes
  useEffect(() => {
    if (reportId) {
      powerBIErrorHandler.clearRetryHistory(reportId);
      setLastError(null);
      setRetryCount(0);
    }
  }, [reportId]);

  // Close bookmark dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBookmarks && !event.target) {
        setShowBookmarks(false);
      }
    };

    if (showBookmarks) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showBookmarks]);

  // Handle errors with retry mechanism
  const handleError = async (error: any, context: string) => {
    const parsedError = powerBIErrorHandler.parseError(error, reportId);
    setLastError(parsedError);
    
    const userMessage = powerBIErrorHandler.getUserFriendlyMessage(parsedError);
    console.error(`❌ ${context} error:`, parsedError);
    
    // Update retry count from error handler
    const retryStatus = powerBIErrorHandler.getRetryStatus(reportId);
    const totalRetries = Object.values(retryStatus).reduce((sum, count) => sum + count, 0);
    setRetryCount(totalRetries);
    
    // Auto-hide bookmark dropdown on error
    setShowBookmarks(false);
    
    onError?.(userMessage);
  };

  // Enhanced retry function with better error handling
  const handleRetry = async () => {
    if (!lastError || !powerBIErrorHandler.shouldRetry(lastError, reportId)) {
      onError?.('Cannot retry this error or maximum retry attempts reached.');
      return;
    }

    setIsRetrying(true);
    setIsLoading(true);
    setShowBookmarks(false); // Close dropdowns during retry

    try {
      const result = await powerBIErrorHandler.executeRetry(
        lastError,
        reportId,
        async () => {
          // Clear error state first
          setLastError(null);
          onError?.(null as any);
          
          // Attempt to reload the report based on error type
          if (lastError.code.includes('TokenExpired')) {
            // For token errors, trigger a full reload
            console.log('🔄 Retrying with token refresh...');
            onReportReload?.();
            return true;
          } else if (lastError.code.includes('QueryUserError')) {
            // For query errors, try refreshing first, then reload if that fails
            console.log('🔄 Retrying QueryUserError with refresh...');
            if (report) {
              try {
                await report.refresh();
                return true;
              } catch (refreshError) {
                console.log('🔄 Refresh failed, trying full reload...');
                onReportReload?.();
                return true;
              }
            } else {
              onReportReload?.();
              return true;
            }
          } else {
            // For other errors, trigger reload
            console.log('🔄 Retrying with report reload...');
            onReportReload?.();
            return true;
          }
        }
      );

      if (result) {
        setLastError(null);
        setRetryCount(0);
        onError?.(null as any); // Clear error
        console.log('✅ Retry successful');
      } else {
        onError?.('Retry failed. Please try refreshing the page manually.');
      }
    } catch (retryError) {
      console.error('❌ Retry operation failed:', retryError);
      onError?.('Retry failed. Please try refreshing the page manually.');
    } finally {
      setIsRetrying(false);
      setIsLoading(false);
    }
  };

  const loadBookmarks = async () => {
    if (!report) return;
    
    try {
      const bookmarks = await report.bookmarksManager.getBookmarks();
      setAvailableBookmarks(bookmarks || []);
    } catch (error) {
      console.warn('Failed to load bookmarks:', error);
      await handleError(error, 'Load Bookmarks');
      setAvailableBookmarks([]);
    }
  };

  const handleFullscreen = async () => {
    if (!report) return;

    try {
      // Use Power BI's native fullscreen functionality instead of browser fullscreen
      await report.fullscreen();
      console.log('✅ Power BI report entered fullscreen mode');
    } catch (error) {
      console.error('Fullscreen error:', error);
      await handleError(error, 'Fullscreen Toggle');
    }
  };

  const handlePrint = async () => {
    if (!report) return;

    try {
      setIsLoading(true);
      await report.print();
    } catch (error) {
      console.error('Print error:', error);
      await handleError(error, 'Print Report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!report) return;

    try {
      setIsLoading(true);
      setShowBookmarks(false); // Close any open dropdowns
      
      // Clear any existing errors before refresh
      setLastError(null);
      onError?.(null as any);
      
      await report.refresh();
      
      setTimeout(() => loadBookmarks(), 1000);
    } catch (error) {
      console.error('Refresh error:', error);
      await handleError(error, 'Refresh Report');
      
      // If refresh fails, try a full reload as fallback
      if (onReportReload) {
        console.log('🔄 Refresh failed, attempting full reload...');
        setTimeout(() => {
          onReportReload();
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReload = async () => {
    if (!report) return;

    try {
      setIsLoading(true);
      await report.reload();
      
      setTimeout(() => loadBookmarks(), 1000);
    } catch (error) {
      console.error('Reload error:', error);
      await handleError(error, 'Reload Report');
      
      if (onReportReload) {
        onReportReload();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectBookmark = async (bookmark: any) => {
    if (!report) return;

    try {
      setIsLoading(true);
      await report.bookmarksManager.apply(bookmark.name);
      setShowBookmarks(false);
    } catch (error) {
      console.error('Bookmark selection error:', error);
      await handleError(error, 'Apply Bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="powerbi-toolbar-simple">
      <div className="toolbar-info">
        <span className="report-name">{reportName}</span>
        {retryCount > 0 && (
          <span style={{ color: '#ffa500', fontSize: '11px' }}>
            (Retries: {retryCount})
          </span>
        )}
      </div>

      <div className="toolbar-actions">
        <button
          className="toolbar-btn"
          onClick={handleFullscreen}
          disabled={isLoading || !report}
          title="Enter Fullscreen"
        >
          ⛶ <span>Full</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={handlePrint}
          disabled={isLoading || !report}
          title="Print Report"
        >
          🖨️ <span>Print</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={handleRefresh}
          disabled={isLoading || !report}
          title="Refresh Report"
        >
          {isLoading ? <span className="loading-simple">🔄</span> : '🔄'}
          <span>Refresh</span>
        </button>

        {lastError && powerBIErrorHandler.shouldRetry(lastError, reportId) && (
          <button
            className="toolbar-btn"
            onClick={handleRetry}
            disabled={isRetrying}
            title="Retry Last Operation"
            style={{ background: '#e53e3e', borderColor: '#c53030' }}
          >
            {isRetrying ? <span className="loading-simple">🔄</span> : '🔄'}
            <span>Retry</span>
          </button>
        )}

        <div className="bookmark-section">
          <button
            className="toolbar-btn"
            onClick={() => {
              // Don't open bookmarks if there's an error
              if (lastError) {
                console.log('Cannot open bookmarks while there is an error');
                return;
              }
              setShowBookmarks(!showBookmarks);
            }}
            disabled={isLoading || !report || !!lastError}
            title="Select Bookmark"
          >
            🔖 <span>Bookmarks</span>
            {availableBookmarks.length > 0 && (
              <span style={{ marginLeft: '4px', background: '#e53e3e', color: 'white', fontSize: '10px', padding: '1px 4px', borderRadius: '8px' }}>
                {availableBookmarks.length}
              </span>
            )}
          </button>

          {showBookmarks && !lastError && (
            <div className="bookmark-dropdown-simple">
              {availableBookmarks.length > 0 ? (
                availableBookmarks.map((bookmark, index) => (
                  <button
                    key={index}
                    className="bookmark-item-simple"
                    onClick={() => selectBookmark(bookmark)}
                    disabled={isLoading}
                  >
                    {bookmark.displayName || bookmark.name}
                  </button>
                ))
              ) : (
                <div style={{ padding: '12px', textAlign: 'center', color: '#718096' }}>
                  No bookmarks available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
