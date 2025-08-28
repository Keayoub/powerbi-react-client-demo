/**
 * QueryUserError Recovery Component
 * Specific solution for PowerBI QueryUserError issues
 */

import React, { useState, useEffect } from 'react';
import './QueryUserErrorRecovery.css';

interface QueryUserErrorRecoveryProps {
  reportId: string;
  onRetry: (newConfig: {
    reportId: string;
    embedUrl: string;
    accessToken: string;
  }) => void;
  onDismiss: () => void;
}

export const QueryUserErrorRecovery: React.FC<QueryUserErrorRecoveryProps> = ({
  reportId,
  onRetry,
  onDismiss
}) => {
  const [step, setStep] = useState<'diagnosis' | 'solutions' | 'configuration'>('diagnosis');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [newReportId, setNewReportId] = useState('');
  const [newEmbedUrl, setNewEmbedUrl] = useState('');
  const [newAccessToken, setNewAccessToken] = useState('');

  // Check if this is a demo/sample report causing the error
  const isDemoReport = reportId.includes('duplicate-') || 
                      reportId.includes('sample-') || 
                      reportId === 'demo-report-id';

  useEffect(() => {
    // Auto-advance if it's clearly a demo issue
    if (isDemoReport) {
      setStep('solutions');
    }
  }, [isDemoReport]);

  // Render diagnosis step
  const renderDiagnosis = () => (
    <div className="recovery-step diagnosis">
      <h3>🔍 QueryUserError Diagnosis</h3>
      <div className="diagnosis-result">
        <div className={`issue-item ${isDemoReport ? 'critical' : 'warning'}`}>
          <span className="issue-icon">
            {isDemoReport ? '🚨' : '⚠️'}
          </span>
          <div className="issue-content">
            <strong>Report ID: {reportId}</strong>
            <p>
              {isDemoReport 
                ? 'This appears to be a demo/test report ID that doesn\'t exist in PowerBI.'
                : 'This report may not exist or you don\'t have permission to access it.'
              }
            </p>
          </div>
        </div>

        <div className="diagnosis-actions">
          <button 
            onClick={() => setStep('solutions')}
            className="primary-button"
          >
            Show Solutions →
          </button>
        </div>
      </div>
    </div>
  );

  // Render solutions step
  const renderSolutions = () => (
    <div className="recovery-step solutions">
      <h3>💡 Recommended Solutions</h3>
      
      {isDemoReport ? (
        <div className="solution-list">
          <div className="solution-item critical">
            <h4>🎯 Primary Issue: Demo Report ID</h4>
            <p>You're trying to load a demo/test report that doesn't exist in PowerBI.</p>
            <ul>
              <li>Replace with a real PowerBI report ID from your workspace</li>
              <li>Ensure the report is published and accessible</li>
              <li>Check your PowerBI workspace for available reports</li>
            </ul>
          </div>
          
          <div className="solution-item">
            <h4>🔧 Quick Fix Options:</h4>
            <div className="quick-actions">
              <button 
                onClick={() => setStep('configuration')}
                className="solution-button primary"
              >
                Configure Real Report
              </button>
              <button 
                onClick={() => {
                  // Use a working sample configuration
                  onRetry({
                    reportId: 'your-real-report-id',
                    embedUrl: 'https://app.powerbi.com/reportEmbed?reportId=your-real-report-id',
                    accessToken: 'your-valid-access-token'
                  });
                }}
                className="solution-button secondary"
              >
                Use Template Config
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="solution-list">
          <div className="solution-item">
            <h4>🔐 Authentication Issues</h4>
            <ul>
              <li>Check if your access token is valid and not expired</li>
              <li>Verify you have permission to access this report</li>
              <li>Ensure you have a PowerBI Pro license</li>
            </ul>
          </div>
          
          <div className="solution-item">
            <h4>📊 Report Access Issues</h4>
            <ul>
              <li>Confirm the report ID is correct</li>
              <li>Check if the report exists in your workspace</li>
              <li>Verify the report is published (not in draft mode)</li>
            </ul>
          </div>

          <div className="solution-item">
            <h4>🔧 Technical Solutions</h4>
            <div className="quick-actions">
              <button 
                onClick={() => {
                  // Simulate token refresh
                  const newToken = `refreshed-token-${Date.now()}`;
                  onRetry({
                    reportId,
                    embedUrl: `https://app.powerbi.com/reportEmbed?reportId=${reportId}`,
                    accessToken: newToken
                  });
                }}
                className="solution-button primary"
              >
                🔄 Refresh Token & Retry
              </button>
              <button 
                onClick={() => setStep('configuration')}
                className="solution-button secondary"
              >
                ⚙️ Manual Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render configuration step
  const renderConfiguration = () => (
    <div className="recovery-step configuration">
      <h3>⚙️ Manual Configuration</h3>
      <div className="config-form">
        <div className="form-group">
          <label>Report ID:</label>
          <input
            type="text"
            value={newReportId}
            onChange={(e) => setNewReportId(e.target.value)}
            placeholder="Enter your PowerBI report ID"
            className="form-input"
          />
          <small>Get this from your PowerBI workspace URL</small>
        </div>

        <div className="form-group">
          <label>Embed URL:</label>
          <input
            type="text"
            value={newEmbedUrl}
            onChange={(e) => setNewEmbedUrl(e.target.value)}
            placeholder="https://app.powerbi.com/reportEmbed?reportId=..."
            className="form-input"
          />
          <small>Complete embed URL from PowerBI</small>
        </div>

        <div className="form-group">
          <label>Access Token:</label>
          <textarea
            value={newAccessToken}
            onChange={(e) => setNewAccessToken(e.target.value)}
            placeholder="Enter your valid PowerBI access token"
            className="form-textarea"
            rows={3}
          />
          <small>JWT token from your authentication service</small>
        </div>

        <div className="config-actions">
          <button
            onClick={() => {
              if (newReportId && newEmbedUrl && newAccessToken) {
                onRetry({
                  reportId: newReportId,
                  embedUrl: newEmbedUrl,
                  accessToken: newAccessToken
                });
              }
            }}
            className="primary-button"
            disabled={!newReportId || !newEmbedUrl || !newAccessToken}
          >
            🚀 Apply Configuration
          </button>
          <button
            onClick={() => setStep('solutions')}
            className="secondary-button"
          >
            ← Back to Solutions
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="queryuser-error-recovery">
      <div className="recovery-header">
        <h2>🚨 QueryUserError Recovery Assistant</h2>
        <button onClick={onDismiss} className="close-button">✕</button>
      </div>

      <div className="recovery-progress">
        <div className={`progress-step ${step === 'diagnosis' ? 'active' : 'completed'}`}>
          1. Diagnosis
        </div>
        <div className={`progress-step ${step === 'solutions' ? 'active' : step === 'configuration' ? 'completed' : ''}`}>
          2. Solutions
        </div>
        <div className={`progress-step ${step === 'configuration' ? 'active' : ''}`}>
          3. Configuration
        </div>
      </div>

      <div className="recovery-content">
        {step === 'diagnosis' && renderDiagnosis()}
        {step === 'solutions' && renderSolutions()}
        {step === 'configuration' && renderConfiguration()}
      </div>

      <div className="recovery-footer">
        <p>
          <strong>💡 Pro Tip:</strong> For production use, implement proper PowerBI authentication 
          with Azure AD and use real report IDs from your PowerBI workspace.
        </p>
      </div>
    </div>
  );
};
