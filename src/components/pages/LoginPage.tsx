// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React from 'react';
import AzureLogin from '../azure-login/AzureLogin';
import { SessionStatus } from '../session-status/SessionStatus';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="logo-section">
                        <h1>🔋 Power BI Multi-Report Viewer</h1>
                        <p className="subtitle">
                            Enterprise-grade multi-report viewing platform with Azure AD authentication
                        </p>
                    </div>
                </div>

                <div className="login-content">
                    <div className="login-card">
                        <div className="card-header">
                            <h2>🔐 Sign In</h2>
                            <p>Authenticate with your Azure AD account to access Power BI workspaces</p>
                        </div>

                        <div className="auth-section">
                            <AzureLogin />
                            <SessionStatus />
                        </div>

                        <div className="features-preview">
                            <h3>What you'll get access to:</h3>
                            <div className="feature-grid">
                                <div className="feature-item">
                                    <span className="feature-icon">🌐</span>
                                    <div className="feature-content">
                                        <h4>Workspace Browser</h4>
                                        <p>Browse all your Power BI workspaces, datasets, and reports</p>
                                    </div>
                                </div>
                                
                                <div className="feature-item">
                                    <span className="feature-icon">📊</span>
                                    <div className="feature-content">
                                        <h4>Multi-Report Viewing</h4>
                                        <p>View multiple reports simultaneously with PowerBI Embed</p>
                                    </div>
                                </div>
                                
                                <div className="feature-item">
                                    <span className="feature-icon">🖼️</span>
                                    <div className="feature-content">
                                        <h4>Lightweight IFrame Mode</h4>
                                        <p>Handle 50+ reports with iframe-based viewing for performance</p>
                                    </div>
                                </div>
                                
                                <div className="feature-item">
                                    <span className="feature-icon">🎛️</span>
                                    <div className="feature-content">
                                        <h4>Flexible Layouts</h4>
                                        <p>Grid, tabs, masonry, and carousel layouts for optimal viewing</p>
                                    </div>
                                </div>
                                
                                <div className="feature-item">
                                    <span className="feature-icon">🔍</span>
                                    <div className="feature-content">
                                        <h4>Fullscreen Mode</h4>
                                        <p>Focus on individual reports with distraction-free fullscreen</p>
                                    </div>
                                </div>
                                
                                <div className="feature-item">
                                    <span className="feature-icon">⚡</span>
                                    <div className="feature-content">
                                        <h4>High Performance</h4>
                                        <p>Pagination, lazy loading, and optimized rendering</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="login-footer">
                    <div className="tech-stack">
                        <h4>Powered by:</h4>
                        <div className="tech-items">
                            <span className="tech-item">⚛️ React 18</span>
                            <span className="tech-item">🔐 Azure AD</span>
                            <span className="tech-item">📊 Power BI Embedded</span>
                            <span className="tech-item">🎨 TypeScript</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
