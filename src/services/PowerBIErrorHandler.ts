/**
 * Enhanced PowerBI Error Handler with Retry Mechanism
 * Handles token expiration, rate limiting, and query errors
 */

import { powerBIAuthService } from './PowerBIAuthService';

export interface PowerBIError {
  code: string;
  message: string;
  reportId?: string;
  timestamp: Date;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export class PowerBIErrorHandler {
  private static instance: PowerBIErrorHandler;
  private retryAttempts: Map<string, number> = new Map();
  private lastErrorTimes: Map<string, Date> = new Map();
  private rateLimitResetTime: Date | null = null;
  
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      'TokenExpired',
      'QueryUserError',
      'RateLimited',
      'TemporaryError',
      'NetworkError',
      'Timeout'
    ]
  };

  private constructor() {}

  static getInstance(): PowerBIErrorHandler {
    if (!PowerBIErrorHandler.instance) {
      PowerBIErrorHandler.instance = new PowerBIErrorHandler();
    }
    return PowerBIErrorHandler.instance;
  }

  /**
   * Parse PowerBI error from event
   */
  parseError(event: any, reportId?: string): PowerBIError {
    // Handle null/undefined events
    if (!event) {
      return {
        code: 'NULL_ERROR',
        message: 'No error information provided',
        reportId: reportId || 'unknown',
        timestamp: new Date(),
        retryable: false,
        severity: 'low'
      };
    }
    
    const errorCode = event?.detail?.errorCode || event?.errorCode || event?.code || 'UNKNOWN';
    const errorMessage = event?.detail?.message || event?.message || event?.toString?.() || 'Unknown PowerBI error';
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let retryable = false;

    // Categorize errors
    if (errorCode.includes('TokenExpired') || errorMessage.includes('token')) {
      severity = 'high';
      retryable = true;
    } else if (errorCode.includes('QueryUserError')) {
      severity = 'medium';
      retryable = true;
    } else if (errorCode.includes('RateLimited') || errorMessage.includes('rate')) {
      severity = 'medium';
      retryable = true;
    } else if (errorCode.includes('NotFound') || errorCode.includes('Unauthorized')) {
      severity = 'critical';
      retryable = false;
    } else if (errorCode.includes('NetworkError') || errorCode.includes('Timeout')) {
      severity = 'medium';
      retryable = true;
    }

    return {
      code: errorCode,
      message: errorMessage,
      reportId,
      timestamp: new Date(),
      retryable,
      severity
    };
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: PowerBIError): string {
    if (!error || !error.message) {
      return 'An unknown error occurred. Please try again.';
    }
    
    switch (true) {
      case error.code.includes('TokenExpired') || (error.message && error.message.includes('token')):
        return 'Your session has expired. Please refresh the page to continue.';
      
      case error.code.includes('QueryUserError'):
        return 'Power BI query error - this may be due to token expiration, rate limiting, or permissions issue. Try refreshing the page or reducing concurrent reports.';
      
      case error.code.includes('RateLimited') || (error.message && error.message.includes('rate')):
        return 'Too many requests. Please wait a moment before trying again.';
      
      case error.code.includes('NotFound'):
        return 'Report not found or you don\'t have permission to access it.';
      
      case error.code.includes('Unauthorized'):
        return 'You don\'t have permission to access this report.';
      
      case error.code.includes('NetworkError'):
        return 'Network connection error. Please check your internet connection.';
      
      case error.code.includes('Timeout'):
        return 'Request timed out. Please try again.';
      
      case error.code === 'NULL_ERROR':
        return 'A system error occurred. Please refresh the page.';
      
      default:
        return error.message || 'An error occurred while loading the Power BI report.';
    }
  }

  /**
   * Check if error should be retried
   */
  shouldRetry(error: PowerBIError, reportId: string): boolean {
    if (!error.retryable) {
      return false;
    }

    const attemptKey = `${reportId}_${error.code}`;
    const currentAttempts = this.retryAttempts.get(attemptKey) || 0;
    
    if (currentAttempts >= this.defaultRetryConfig.maxRetries) {
      return false;
    }

    // Rate limiting check
    if (error.code.includes('RateLimited') && this.rateLimitResetTime) {
      if (new Date() < this.rateLimitResetTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  getRetryDelay(error: PowerBIError, reportId: string): number {
    const attemptKey = `${reportId}_${error.code}`;
    const currentAttempts = this.retryAttempts.get(attemptKey) || 0;
    
    let delay = this.defaultRetryConfig.baseDelay * 
      Math.pow(this.defaultRetryConfig.backoffMultiplier, currentAttempts);
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000;
    
    // Cap at max delay
    delay = Math.min(delay, this.defaultRetryConfig.maxDelay);
    
    // Special handling for different error types
    if (error.code.includes('QueryUserError')) {
      delay = Math.max(delay, 3000); // Minimum 3 seconds for query errors
    } else if (error.code.includes('RateLimited')) {
      delay = Math.max(delay, 10000); // Minimum 10 seconds for rate limiting
    }
    
    return Math.round(delay);
  }

  /**
   * Execute retry with proper handling
   */
  async executeRetry<T>(
    error: PowerBIError,
    reportId: string,
    retryFunction: () => Promise<T>
  ): Promise<T | null> {
    if (!this.shouldRetry(error, reportId)) {
      console.log(`❌ Cannot retry ${error.code} for ${reportId}: max attempts reached or not retryable`);
      return null;
    }

    const attemptKey = `${reportId}_${error.code}`;
    const currentAttempts = this.retryAttempts.get(attemptKey) || 0;
    this.retryAttempts.set(attemptKey, currentAttempts + 1);

    const delay = this.getRetryDelay(error, reportId);
    
    console.log(`🔄 Retrying ${error.code} for ${reportId} (attempt ${currentAttempts + 1}/${this.defaultRetryConfig.maxRetries}) after ${delay}ms`);

    // Handle token refresh for token-related errors
    if (error.code.includes('TokenExpired')) {
      try {
        await powerBIAuthService.refreshToken();
        console.log('🔑 Token refreshed before retry');
      } catch (tokenError) {
        console.error('❌ Failed to refresh token:', tokenError);
        return null;
      }
    }

    // Wait for the calculated delay
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const result = await retryFunction();
      
      // Clear retry count on success
      this.retryAttempts.delete(attemptKey);
      console.log(`✅ Retry successful for ${reportId}`);
      
      return result;
    } catch (retryError) {
      console.error(`❌ Retry failed for ${reportId}:`, retryError);
      
      // If this was the last attempt, clear the counter
      if (currentAttempts + 1 >= this.defaultRetryConfig.maxRetries) {
        this.retryAttempts.delete(attemptKey);
      }
      
      throw retryError;
    }
  }

  /**
   * Handle rate limiting
   */
  handleRateLimit(resetTimeSeconds?: number): void {
    if (resetTimeSeconds) {
      this.rateLimitResetTime = new Date(Date.now() + resetTimeSeconds * 1000);
    } else {
      // Default to 60 seconds if no reset time provided
      this.rateLimitResetTime = new Date(Date.now() + 60000);
    }
    
    console.log(`⏰ Rate limit in effect until ${this.rateLimitResetTime}`);
  }

  /**
   * Clear retry history for a report
   */
  clearRetryHistory(reportId: string): void {
    const keysToDelete = Array.from(this.retryAttempts.keys())
      .filter(key => key.startsWith(reportId));
    
    keysToDelete.forEach(key => this.retryAttempts.delete(key));
    this.lastErrorTimes.delete(reportId);
  }

  /**
   * Get retry status for a report
   */
  getRetryStatus(reportId: string): { [errorCode: string]: number } {
    const status: { [errorCode: string]: number } = {};
    
    Array.from(this.retryAttempts.entries())
      .filter(([key]) => key.startsWith(reportId))
      .forEach(([key, attempts]) => {
        const errorCode = key.split('_')[1];
        status[errorCode] = attempts;
      });
    
    return status;
  }

  /**
   * Check if we're currently in a rate limit period
   */
  isRateLimited(): boolean {
    return this.rateLimitResetTime ? new Date() < this.rateLimitResetTime : false;
  }
}

export const powerBIErrorHandler = PowerBIErrorHandler.getInstance();
