// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState, useCallback, useEffect } from 'react';
import { PowerBITokenService, EmbedTokenRequest, EmbedTokenResponse } from '../../services/powerbi-token-service';

interface TokenGeneratorProps {
    onTokenGenerated?: (token: string, embedUrl: string) => void;
    initialAccessToken?: string;
}

export const PowerBITokenGenerator: React.FC<TokenGeneratorProps> = ({ onTokenGenerated, initialAccessToken = '' }) => {
    const [accessToken, setAccessToken] = useState<string>(initialAccessToken);
    const [reportId, setReportId] = useState<string>('');
    const [workspaceId, setWorkspaceId] = useState<string>('');
    const [datasetId, setDatasetId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [roles, setRoles] = useState<string>('');
    const [accessLevel, setAccessLevel] = useState<'View' | 'Edit' | 'Create'>('View');
    const [lifetimeInMinutes, setLifetimeInMinutes] = useState<number>(60);
    const [useRLS, setUseRLS] = useState<boolean>(false);
    
    const [embedToken, setEmbedToken] = useState<string>('');
    const [embedUrl, setEmbedUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    // Update access token when initialAccessToken changes
    useEffect(() => {
        if (initialAccessToken && initialAccessToken !== accessToken) {
            setAccessToken(initialAccessToken);
        }
    }, [initialAccessToken, accessToken]);

    const generateToken = useCallback(async () => {
        if (!accessToken || !reportId) {
            setError('Access Token and Report ID are required');
            return;
        }

        // Show warning if Dataset ID is missing (recommended for DirectLake)
        if (!datasetId) {
            const confirmed = window.confirm(
                '⚠️ Dataset ID is not provided.\n\n' +
                'This is required for:\n' +
                '• DirectLake datasets (Fabric/Premium)\n' +
                '• Row Level Security (RLS)\n\n' +
                'Do you want to continue without Dataset ID?\n\n' +
                'Note: If you get a DirectLake error, please provide the Dataset ID.'
            );
            if (!confirmed) {
                return;
            }
        }

        setLoading(true);
        setError('');

        try {
            const tokenService = new PowerBITokenService(accessToken);
            
            const request: EmbedTokenRequest = {
                reportId,
                groupId: workspaceId || undefined,
                datasetId: datasetId || undefined,
                accessLevel,
                lifetimeInMinutes
            };

            // Add RLS configuration if enabled
            if (useRLS && username) {
                if (!datasetId) {
                    setError('Dataset ID is required when using Row Level Security (RLS)');
                    setLoading(false);
                    return;
                }
                request.identities = [{
                    username,
                    roles: roles ? roles.split(',').map(r => r.trim()) : undefined,
                    datasets: [datasetId]
                }];
            }

            const response: EmbedTokenResponse = await tokenService.generateReportEmbedToken(request);
            
            // Generate embed URL
            const baseEmbedUrl = workspaceId 
                ? `https://app.powerbi.com/reportEmbed?reportId=${reportId}&groupId=${workspaceId}`
                : `https://app.powerbi.com/reportEmbed?reportId=${reportId}`;

            setEmbedToken(response.token);
            setEmbedUrl(baseEmbedUrl);

            // Notify parent component
            if (onTokenGenerated) {
                onTokenGenerated(response.token, baseEmbedUrl);
            }

            console.log('Token generated successfully:', {
                token: response.token,
                tokenId: response.tokenId,
                expiration: response.expiration,
                embedUrl: baseEmbedUrl
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            
            // Provide specific guidance for DirectLake errors
            if (errorMessage.includes('DirectLake dataset is not supported with V1 embed token')) {
                setError(
                    '❌ DirectLake Error: This dataset requires the Dataset ID. ' +
                    'Please provide the Dataset ID above and try again. ' +
                    'DirectLake datasets are commonly used in Microsoft Fabric and Premium workspaces.'
                );
            } else {
                setError(errorMessage);
            }
            
            console.error('Token generation failed:', err);
        } finally {
            setLoading(false);
        }
    }, [accessToken, reportId, workspaceId, datasetId, username, roles, accessLevel, lifetimeInMinutes, useRLS, onTokenGenerated]);

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            alert('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    return (
        <div className="token-generator" style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '20px 0' }}>
            <h3>Power BI Embed Token Generator</h3>
            
            <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                <div>
                    <label htmlFor="accessToken">
                        <strong>Azure AD Access Token*:</strong>
                        {initialAccessToken && (
                            <span style={{ color: '#28a745', fontSize: '12px', marginLeft: '8px' }}>
                                ✅ Auto-populated from Azure login
                            </span>
                        )}
                    </label>
                    <input
                        id="accessToken"
                        type="password"
                        value={accessToken}
                        onChange={(e) => setAccessToken(e.target.value)}
                        placeholder={initialAccessToken ? "Token auto-populated from Azure login" : "Enter your Azure AD access token"}
                        style={{ 
                            width: '100%', 
                            padding: '8px', 
                            marginTop: '4px',
                            backgroundColor: initialAccessToken ? '#f0f8f0' : 'white',
                            border: initialAccessToken ? '2px solid #28a745' : '1px solid #ccc'
                        }}
                    />
                    <small style={{ color: '#666' }}>
                        {initialAccessToken 
                            ? "🎉 Token automatically obtained from your Azure AD login above!"
                            : "Obtain this from Azure AD authentication (MSAL, etc.) or sign in above"
                        }
                    </small>
                </div>

                <div>
                    <label htmlFor="reportId">
                        <strong>Report ID*:</strong>
                    </label>
                    <input
                        id="reportId"
                        type="text"
                        value={reportId}
                        onChange={(e) => setReportId(e.target.value)}
                        placeholder="e.g., 12345678-1234-1234-1234-123456789012"
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </div>

                <div>
                    <label htmlFor="workspaceId">
                        <strong>Workspace ID:</strong>
                    </label>
                    <input
                        id="workspaceId"
                        type="text"
                        value={workspaceId}
                        onChange={(e) => setWorkspaceId(e.target.value)}
                        placeholder="Leave empty for 'My Workspace'"
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                </div>

                <div>
                    <label htmlFor="datasetId">
                        <strong>Dataset ID*:</strong>
                        <span style={{ color: '#d32f2f', fontSize: '12px', marginLeft: '8px' }}>
                            (Required for DirectLake datasets)
                        </span>
                    </label>
                    <input
                        id="datasetId"
                        type="text"
                        value={datasetId}
                        onChange={(e) => setDatasetId(e.target.value)}
                        placeholder="Required for DirectLake and RLS scenarios"
                        style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                    />
                    <small style={{ color: '#666' }}>
                        Find this in Power BI Service → Dataset Settings → Dataset ID
                    </small>
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                        <label htmlFor="accessLevel">
                            <strong>Access Level:</strong>
                        </label>
                        <select
                            id="accessLevel"
                            value={accessLevel}
                            onChange={(e) => setAccessLevel(e.target.value as 'View' | 'Edit' | 'Create')}
                            style={{ padding: '8px', marginTop: '4px' }}
                        >
                            <option value="View">View</option>
                            <option value="Edit">Edit</option>
                            <option value="Create">Create</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="lifetime">
                            <strong>Token Lifetime (minutes):</strong>
                        </label>
                        <input
                            id="lifetime"
                            type="number"
                            min="1"
                            max="60"
                            value={lifetimeInMinutes}
                            onChange={(e) => setLifetimeInMinutes(parseInt(e.target.value))}
                            style={{ padding: '8px', marginTop: '4px', width: '80px' }}
                        />
                    </div>
                </div>

                {/* Row Level Security Section */}
                <div style={{ border: '1px solid #eee', padding: '15px', borderRadius: '4px' }}>
                    <div>
                        <label>
                            <input
                                type="checkbox"
                                checked={useRLS}
                                onChange={(e) => setUseRLS(e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            <strong>Enable Row Level Security (RLS)</strong>
                        </label>
                    </div>

                    {useRLS && (
                        <div style={{ marginTop: '10px', display: 'grid', gap: '10px' }}>
                            <div>
                                <label htmlFor="username">
                                    <strong>Username:</strong>
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="e.g., user@company.com"
                                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                />
                            </div>

                            <div>
                                <label htmlFor="roles">
                                    <strong>Roles (comma-separated):</strong>
                                </label>
                                <input
                                    id="roles"
                                    type="text"
                                    value={roles}
                                    onChange={(e) => setRoles(e.target.value)}
                                    placeholder="e.g., SalesRole, ManagerRole"
                                    style={{ width: '100%', padding: '8px', marginTop: '4px' }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={generateToken}
                disabled={loading || !accessToken || !reportId}
                style={{
                    padding: '12px 24px',
                    backgroundColor: loading ? '#ccc' : '#0078d4',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                }}
            >
                {loading ? 'Generating Token...' : 'Generate Embed Token'}
            </button>

            {error && (
                <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#ffebee', border: '1px solid #f44336', borderRadius: '4px' }}>
                    <strong style={{ color: '#d32f2f' }}>Error:</strong> {error}
                </div>
            )}

            {embedToken && (
                <div style={{ marginTop: '20px' }}>
                    <h4>Generated Token:</h4>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label><strong>Embed Token:</strong></label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <textarea
                                readOnly
                                value={embedToken}
                                style={{ flex: 1, padding: '8px', minHeight: '80px', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                            <button
                                onClick={() => copyToClipboard(embedToken)}
                                style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                                Copy Token
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label><strong>Embed URL:</strong></label>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <input
                                readOnly
                                value={embedUrl}
                                style={{ flex: 1, padding: '8px', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                            <button
                                onClick={() => copyToClipboard(embedUrl)}
                                style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
                            >
                                Copy URL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <h4>📊 DirectLake Dataset Support</h4>
                <div style={{ padding: '10px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '4px', marginBottom: '15px' }}>
                    <strong>💡 Important:</strong> If you're getting a "DirectLake dataset is not supported with V1 embed token" error:
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        <li>Make sure to provide the <strong>Dataset ID</strong> above</li>
                        <li>This component now uses the V2 API which supports DirectLake datasets</li>
                        <li>DirectLake is used with Fabric and Premium workspaces</li>
                    </ul>
                </div>
                
                <h4>How to get the required values:</h4>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                    <li><strong>Access Token:</strong> Obtain from Azure AD using MSAL.js or your authentication provider</li>
                    <li><strong>Report ID:</strong> Found in Power BI Service URL or via Power BI REST API</li>
                    <li><strong>Workspace ID:</strong> Found in Power BI Service URL or via Power BI REST API</li>
                    <li><strong>Dataset ID:</strong> Found in Power BI Service → Dataset Settings → Dataset ID</li>
                </ul>
                
                <h4>API Documentation:</h4>
                <p>
                    <a 
                        href="https://learn.microsoft.com/en-us/rest/api/power-bi/embed-token/generate-token" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#0078d4', textDecoration: 'none' }}
                    >
                        📖 Power BI Generate Token API Reference
                    </a>
                </p>
            </div>
        </div>
    );
};

export default PowerBITokenGenerator;
