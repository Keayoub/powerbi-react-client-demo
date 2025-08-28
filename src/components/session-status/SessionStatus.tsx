// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './SessionStatus.css';

export const SessionStatus: React.FC = () => {
    const { isAuthenticated, user, powerBiToken, tokenExpiry, loading } = useAuth();

    if (loading) {
        return (
            <div className="session-status loading">
                <span className="status-indicator">⟳</span>
                <span>Checking session...</span>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="session-status not-authenticated">
                <span className="status-indicator">⚫</span>
                <span>Not signed in</span>
            </div>
        );
    }

    const getTokenTimeRemaining = (): string => {
        if (!tokenExpiry) return 'Unknown';
        
        const now = new Date();
        const timeLeft = tokenExpiry.getTime() - now.getTime();
        
        if (timeLeft <= 0) return 'Expired';
        
        const minutes = Math.floor(timeLeft / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m`;
    };

    return (
        <div className="session-status authenticated">
            <div className="user-info">
                <span className="status-indicator">🟢</span>
                <span className="user-name">{user?.name || user?.username || 'Signed In'}</span>
            </div>
            {powerBiToken && tokenExpiry && (
                <div className="token-info">
                    <span className="token-status">
                        Token expires in: {getTokenTimeRemaining()}
                    </span>
                </div>
            )}
        </div>
    );
};
