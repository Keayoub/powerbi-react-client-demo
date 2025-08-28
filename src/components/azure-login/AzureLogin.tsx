// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React from 'react';
import { useAuth } from '../../context/AuthContext';

const AzureLogin: React.FC = () => {
    const { 
        isAuthenticated, 
        user, 
        loading, 
        powerBiToken, 
        tokenExpiry, 
        login, 
        logout, 
        acquirePowerBiToken, 
        error 
    } = useAuth();

    const handleLogin = async () => {
        try {
            await login();
        } catch (error) {
            console.error('Login failed:', error);
        }
    };

    const handleGetPowerBiToken = async () => {
        try {
            const token = await acquirePowerBiToken();
            console.log('Power BI Token acquired:', token);
        } catch (error) {
            console.error('Failed to get Power BI token:', error);
        }
    };

    const formatTokenExpiry = (expiry: Date | null): string => {
        if (!expiry) return 'Unknown';
        return expiry.toLocaleString();
    };

    const isTokenExpiringSoon = (expiry: Date | null): boolean => {
        if (!expiry) return true;
        const tenMinutesFromNow = new Date(Date.now() + 10 * 60 * 1000);
        return expiry <= tenMinutesFromNow;
    };

    if (loading) {
        return (
            <div style={{ 
                padding: '20px', 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                margin: '20px 0',
                textAlign: 'center'
            }}>
                <p>🔄 Loading authentication status...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div style={{ 
                padding: '20px', 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                margin: '20px 0',
                backgroundColor: '#f8f9fa'
            }}>
                <h3>🔐 Azure AD Authentication</h3>
                <p>Sign in with your Azure AD account to automatically get Power BI tokens</p>
                
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#0078d4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginTop: '10px'
                    }}
                >
                    {loading ? '🔄 Signing in...' : '🚀 Sign in with Microsoft'}
                </button>

                {error && (
                    <div style={{ 
                        marginTop: '15px', 
                        padding: '10px', 
                        backgroundColor: '#ffebee', 
                        border: '1px solid #f44336', 
                        borderRadius: '4px' 
                    }}>
                        <strong style={{ color: '#d32f2f' }}>Error:</strong> {error}
                    </div>
                )}

                <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                    <p><strong>What this does:</strong></p>
                    <ul style={{ textAlign: 'left', paddingLeft: '20px' }}>
                        <li>Signs you in with your Azure AD/Microsoft 365 account</li>
                        <li>Automatically gets Power BI access tokens</li>
                        <li>Eliminates the need to manually copy/paste tokens</li>
                        <li>Handles token refresh automatically</li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '8px', 
            margin: '20px 0',
            backgroundColor: '#e8f5e8'
        }}>
            <h3>✅ Signed in with Azure AD</h3>
            
            <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                <div>
                    <strong>👤 User:</strong> {user?.name || user?.username || 'Unknown'}
                </div>
                <div>
                    <strong>📧 Email:</strong> {user?.username || 'Unknown'}
                </div>
                <div>
                    <strong>🏢 Tenant:</strong> {user?.tenantId || 'Unknown'}
                </div>
            </div>

            <div style={{ 
                padding: '15px', 
                backgroundColor: powerBiToken ? '#d4edda' : '#fff3cd', 
                border: `1px solid ${powerBiToken ? '#c3e6cb' : '#ffeaa7'}`, 
                borderRadius: '4px',
                marginBottom: '15px'
            }}>
                <h4>🔑 Power BI Token Status</h4>
                {powerBiToken ? (
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>Status:</strong> 
                            <span style={{ 
                                color: isTokenExpiringSoon(tokenExpiry) ? '#d32f2f' : '#28a745',
                                marginLeft: '8px'
                            }}>
                                {isTokenExpiringSoon(tokenExpiry) ? '⚠️ Expiring Soon' : '✅ Valid'}
                            </span>
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>Expires:</strong> {formatTokenExpiry(tokenExpiry)}
                        </div>
                        <div style={{ marginBottom: '10px' }}>
                            <strong>Token Length:</strong> {powerBiToken.length} characters
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                onClick={handleGetPowerBiToken}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔄 Refresh Token
                            </button>
                            <button
                                onClick={() => navigator.clipboard.writeText(powerBiToken)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                📋 Copy Token
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p>No Power BI token available</p>
                        <button
                            onClick={handleGetPowerBiToken}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#ffc107',
                                color: 'black',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            🔑 Get Power BI Token
                        </button>
                    </>
                )}
            </div>

            {error && (
                <div style={{ 
                    marginBottom: '15px', 
                    padding: '10px', 
                    backgroundColor: '#ffebee', 
                    border: '1px solid #f44336', 
                    borderRadius: '4px' 
                }}>
                    <strong style={{ color: '#d32f2f' }}>Error:</strong> {error}
                </div>
            )}

            <button
                onClick={logout}
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                🚪 Sign Out
            </button>

            <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
                <p><strong>💡 Tip:</strong> Your Power BI token is automatically used in the token generator below!</p>
            </div>
        </div>
    );
};

export default AzureLogin;
