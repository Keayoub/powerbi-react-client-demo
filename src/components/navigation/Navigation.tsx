// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../features/ThemeToggle';
import { UsageAnalytics } from '../features/UsageAnalytics';
import './Navigation.css';

export const Navigation: React.FC = () => {
    const { logout, isAuthenticated } = useAuth();
    const location = useLocation();
    const [showAnalytics, setShowAnalytics] = useState(false);

    const handleLogout = () => {
        logout();
    };

    const navItems = [
        { path: '/configuration', label: '⚙️ Configuration', icon: '⚙️' },
        { path: '/reports', label: '📊 Report Viewer', icon: '📊' }
    ];

    return (
        <>
            <nav className="main-navigation">
                <div className="nav-brand">
                    <h2>🔋 Power BI Multi-Report Viewer</h2>
                </div>
                
                <div className="nav-links">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </div>

                <div className="nav-actions">
                    <button
                        onClick={() => setShowAnalytics(true)}
                        className="analytics-button"
                        title="View usage analytics"
                    >
                        📈 Analytics
                    </button>
                    <ThemeToggle className="compact" />
                    <span className="user-status">✅ Authenticated</span>
                    <button onClick={handleLogout} className="logout-button">
                        🚪 Logout
                    </button>
                </div>
            </nav>
            
            {/* Usage Analytics Modal */}
            <UsageAnalytics
                isVisible={showAnalytics}
                onClose={() => setShowAnalytics(false)}
            />
        </>
    );
};
