/**
 * Bundle Optimization and Component Management
 * Provides loading fallbacks and error boundaries for PowerBI components
 */

import React from 'react';
import { OptimizedEmbeddedPowerBIContainer } from './OptimizedEmbeddedPowerBIContainer';
import { VirtualScrollContainer } from './VirtualScrollContainer';

// Simple error boundary class component
class PowerBIErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PowerBI Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          retry={() => this.setState({ hasError: false, error: null })} 
        />
      );
    }

    return this.props.children;
  }
}

// Loading fallback component
const PowerBILoadingFallback: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '4px'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div 
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #e3e3e3',
          borderTop: '3px solid #0078d4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 10px'
        }}
      />
      <p style={{ margin: 0, color: '#666' }}>Loading PowerBI Report...</p>
    </div>
  </div>
);

// Error fallback component
const PowerBIErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ 
  error, 
  retry 
}) => (
  <div style={{
    padding: '20px',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '4px',
    textAlign: 'center'
  }}>
    <h3 style={{ color: '#e53e3e', margin: '0 0 10px' }}>Failed to Load PowerBI Component</h3>
    <p style={{ color: '#666', margin: '0 0 15px' }}>{error.message}</p>
    <button 
      onClick={retry}
      style={{
        background: '#0078d4',
        color: 'white',
        border: 'none',
        padding: '8px 16px',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
    >
      Try Again
    </button>
  </div>
);

// Enhanced wrapper for Optimized Embedded PowerBI Container
export const EnhancedPowerBIContainer: React.FC<any> = (props) => (
  <PowerBIErrorBoundary fallback={PowerBIErrorFallback}>
    <OptimizedEmbeddedPowerBIContainer {...props} />
  </PowerBIErrorBoundary>
);

// Enhanced wrapper for Virtual Scroll Container
export const EnhancedVirtualPowerBIContainer: React.FC<any> = (props) => (
  <PowerBIErrorBoundary fallback={PowerBIErrorFallback}>
    <VirtualScrollContainer {...props} />
  </PowerBIErrorBoundary>
);

// Performance optimization utilities
export const PowerBIOptimizationUtils = {
  // Check if component should be loaded based on viewport
  isInViewport: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  // Debounce function for performance
  debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(null, args), wait);
    }) as T;
  },

  // Throttle function for scroll events
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  },

  // Preconnect to PowerBI domains for faster loading
  preconnectToPowerBI: (): void => {
    const domains = [
      'https://app.powerbi.com',
      'https://analysis.windows.net',
      'https://login.microsoftonline.com'
    ];

    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      document.head.appendChild(link);
    });
  },

  // Resource hints for better performance
  addResourceHints: (): void => {
    // DNS prefetch for faster domain resolution
    const dnsPrefetch = document.createElement('link');
    dnsPrefetch.rel = 'dns-prefetch';
    dnsPrefetch.href = '//app.powerbi.com';
    document.head.appendChild(dnsPrefetch);

    // Preload critical PowerBI CSS (if available)
    const preloadCSS = document.createElement('link');
    preloadCSS.rel = 'preload';
    preloadCSS.as = 'style';
    preloadCSS.href = 'https://app.powerbi.com/13.0.18018.122/styles/powerbi.css';
    document.head.appendChild(preloadCSS);
  }
};

// CSS for loading spinner animation
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject styles if not already present
if (!document.querySelector('#powerbi-optimization-styles')) {
  const style = document.createElement('style');
  style.id = 'powerbi-optimization-styles';
  style.textContent = spinKeyframes;
  document.head.appendChild(style);

  // Initialize resource hints
  PowerBIOptimizationUtils.preconnectToPowerBI();
  PowerBIOptimizationUtils.addResourceHints();
}
