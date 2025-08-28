/**
 * Enhanced Error Diagnostic Component
 * Provides detailed error information and recovery suggestions
 */

import React, { useState, useEffect } from 'react';
import './ErrorDiagnostic.css';

interface ErrorDetails {
  id: string;
  type: string;
  message: string;
  reportId?: string;
  timestamp: Date;
  stack?: string;
  recoveryActions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ErrorDiagnosticProps {
  onRetryAll?: () => void;
  onClearErrors?: () => void;
}

export const ErrorDiagnostic: React.FC<ErrorDiagnosticProps> = ({
  onRetryAll,
  onClearErrors
}) => {
  const [errors, setErrors] = useState<ErrorDetails[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  // Listen for PowerBI errors from global error tracking
  useEffect(() => {
    const handleStorageChange = () => {
      const errorData = localStorage.getItem('powerBIErrors');
      if (errorData) {
        try {
          const parsedErrors = JSON.parse(errorData);
          setErrors(parsedErrors);
        } catch (e) {
          console.error('Failed to parse error data:', e);
        }
      }
    };

    // Initial load
    handleStorageChange();

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for immediate updates
    const handleErrorUpdate = () => handleStorageChange();
    window.addEventListener('powerBIErrorUpdate', handleErrorUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('powerBIErrorUpdate', handleErrorUpdate);
    };
  }, []);

  // Auto-retry mechanism
  useEffect(() => {
    if (!autoRetryEnabled || errors.length === 0) return;

    const retryTimer = setTimeout(() => {
      const criticalErrors = errors.filter(e => e.severity === 'critical');
      if (criticalErrors.length > 0) {
        handleRetryError(criticalErrors[0]);
      }
    }, 5000); // Retry after 5 seconds

    return () => clearTimeout(retryTimer);
  }, [errors, autoRetryEnabled]);

  // Retry specific error
  const handleRetryError = (error: ErrorDetails) => {
    console.log(`🔄 Retrying error: ${error.id}`);
    
    // Remove this error from the list temporarily
    const updatedErrors = errors.filter(e => e.id !== error.id);
    setErrors(updatedErrors);
    updateErrorStorage(updatedErrors);

    // Trigger specific recovery actions
    if (error.reportId) {
      // Trigger report reload
      const event = new CustomEvent('retryReport', { 
        detail: { reportId: error.reportId } 
      });
      window.dispatchEvent(event);
    }
  };

  // Clear specific error
  const handleClearError = (errorId: string) => {
    const updatedErrors = errors.filter(e => e.id !== errorId);
    setErrors(updatedErrors);
    updateErrorStorage(updatedErrors);
  };

  // Clear all errors
  const handleClearAll = () => {
    setErrors([]);
    localStorage.removeItem('powerBIErrors');
    onClearErrors?.();
  };

  // Update error storage
  const updateErrorStorage = (errorList: ErrorDetails[]) => {
    localStorage.setItem('powerBIErrors', JSON.stringify(errorList));
    const event = new Event('powerBIErrorUpdate');
    window.dispatchEvent(event);
  };

  // Get severity color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📝';
    }
  };

  if (errors.length === 0) {
    return null; // Don't render if no errors
  }

  return (
    <div className={`error-diagnostic ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Error Summary Bar */}
      <div className="error-summary-bar">
        <div className="error-summary">
          <span className="error-icon">🚨</span>
          <span className="error-count">{errors.length} Error{errors.length !== 1 ? 's' : ''}</span>
          <span className="error-types">
            {errors.filter(e => e.severity === 'critical').length > 0 && 
              <span className="critical-badge">Critical</span>
            }
            {errors.filter(e => e.severity === 'high').length > 0 && 
              <span className="high-badge">High</span>
            }
          </span>
        </div>
        
        <div className="error-controls">
          <button
            className="auto-retry-toggle"
            onClick={() => setAutoRetryEnabled(!autoRetryEnabled)}
            title={`Auto-retry: ${autoRetryEnabled ? 'ON' : 'OFF'}`}
          >
            {autoRetryEnabled ? '🔄' : '⏸️'}
          </button>
          <button
            className="clear-all-button"
            onClick={handleClearAll}
            title="Clear All Errors"
          >
            🗑️
          </button>
          <button
            className="expand-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand Details'}
          >
            {isExpanded ? '🔽' : '🔼'}
          </button>
        </div>
      </div>

      {/* Detailed Error List */}
      {isExpanded && (
        <div className="error-details">
          <div className="error-header">
            <h4>🔍 Error Diagnostics</h4>
            <div className="header-actions">
              <button onClick={onRetryAll} className="retry-all-button">
                🔄 Retry All
              </button>
            </div>
          </div>

          <div className="error-list">
            {errors.map((error) => (
              <div key={error.id} className={`error-item severity-${error.severity}`}>
                <div className="error-item-header">
                  <span className="severity-icon">{getSeverityIcon(error.severity)}</span>
                  <span className="error-type">{error.type}</span>
                  <span className="error-time">{error.timestamp.toLocaleTimeString()}</span>
                  <div className="error-item-actions">
                    <button
                      onClick={() => handleRetryError(error)}
                      className="retry-button"
                      title="Retry this error"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => handleClearError(error.id)}
                      className="clear-button"
                      title="Clear this error"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="error-message">{error.message}</div>
                
                {error.reportId && (
                  <div className="error-context">
                    <strong>Report ID:</strong> {error.reportId}
                  </div>
                )}

                {error.recoveryActions.length > 0 && (
                  <div className="recovery-actions">
                    <strong>Suggested Actions:</strong>
                    <ul>
                      {error.recoveryActions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {error.stack && (
                  <details className="error-stack">
                    <summary>Technical Details</summary>
                    <pre>{error.stack}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Global function to add errors
declare global {
  interface Window {
    addPowerBIError: (error: Omit<ErrorDetails, 'id' | 'timestamp'>) => void;
    clearPowerBIErrors: () => void;
  }
}

// Initialize global error tracking
window.addPowerBIError = (errorData: Omit<ErrorDetails, 'id' | 'timestamp'>) => {
  const error: ErrorDetails = {
    ...errorData,
    id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date()
  };

  const existing = JSON.parse(localStorage.getItem('powerBIErrors') || '[]');
  const updated = [...existing, error];
  
  // Keep only last 20 errors
  const limited = updated.slice(-20);
  
  localStorage.setItem('powerBIErrors', JSON.stringify(limited));
  
  const event = new Event('powerBIErrorUpdate');
  window.dispatchEvent(event);
};

window.clearPowerBIErrors = () => {
  localStorage.removeItem('powerBIErrors');
  const event = new Event('powerBIErrorUpdate');
  window.dispatchEvent(event);
};
