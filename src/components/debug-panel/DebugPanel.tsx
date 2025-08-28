// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PowerBIWorkspaceService } from '../../services/powerbi-workspace-service';
import './DebugPanel.css';

export const DebugPanel: React.FC = () => {
    const { powerBiToken, isAuthenticated } = useAuth();
    const [debugInfo, setDebugInfo] = useState<string>('');
    const [isVisible, setIsVisible] = useState(false);

    const testAPI = async () => {
        if (!powerBiToken) {
            setDebugInfo('❌ No Power BI token available');
            return;
        }

        setDebugInfo('🔄 Testing Power BI API...\n');
        
        try {
            const service = new PowerBIWorkspaceService(powerBiToken);
            
            // Test workspace access
            setDebugInfo(prev => prev + '📁 Testing workspace access...\n');
            const workspaces = await service.getWorkspaces();
            setDebugInfo(prev => prev + `✅ Found ${workspaces.length} workspaces\n`);
            
            if (workspaces.length > 0) {
                const firstWorkspace = workspaces[0];
                setDebugInfo(prev => prev + `📊 Testing datasets in workspace: ${firstWorkspace.name}\n`);
                
                try {
                    const datasets = await service.getDatasets(firstWorkspace.id);
                    setDebugInfo(prev => prev + `✅ Found ${datasets.length} datasets\n`);
                    
                    if (datasets.length > 0) {
                        const firstDataset = datasets[0];
                        const isDirectLake = firstDataset.targetStorageMode?.toLowerCase().includes('directlake');
                        setDebugInfo(prev => prev + `📋 Testing reports for dataset: ${firstDataset.name}\n`);
                        setDebugInfo(prev => prev + `🏗️ Dataset storage mode: ${firstDataset.targetStorageMode} ${isDirectLake ? '(DirectLake - requires V2 API)' : ''}\n`);
                        
                        try {
                            const reports = await service.getReports(firstWorkspace.id);
                            const datasetReports = reports.filter(r => r.datasetId === firstDataset.id);
                            setDebugInfo(prev => prev + `✅ Found ${datasetReports.length} reports for this dataset\n`);
                            
                            if (datasetReports.length > 0) {
                                const firstReport = datasetReports[0];
                                setDebugInfo(prev => prev + `🔑 Testing embed token for report: ${firstReport.name}\n`);
                                setDebugInfo(prev => prev + `🔧 Will use ${isDirectLake ? 'V2' : 'V1'} API for this dataset type\n`);
                                
                                try {
                                    const token = await service.generateEmbedToken(
                                        firstReport.id,
                                        [firstDataset.id],
                                        firstWorkspace.id
                                    );
                                    setDebugInfo(prev => prev + `✅ Embed token generated successfully! Length: ${token.length}\n`);
                                } catch (tokenError) {
                                    setDebugInfo(prev => prev + `❌ Embed token failed: ${tokenError}\n`);
                                }
                            } else {
                                setDebugInfo(prev => prev + `⚠️ No reports found for dataset ${firstDataset.name}\n`);
                            }
                        } catch (reportError) {
                            setDebugInfo(prev => prev + `❌ Reports fetch failed: ${reportError}\n`);
                        }
                    } else {
                        setDebugInfo(prev => prev + `⚠️ No datasets found in workspace ${firstWorkspace.name}\n`);
                    }
                } catch (datasetError) {
                    setDebugInfo(prev => prev + `❌ Datasets fetch failed: ${datasetError}\n`);
                }
            } else {
                setDebugInfo(prev => prev + '⚠️ No workspaces accessible\n');
            }
            
            setDebugInfo(prev => prev + '\n🔍 Debug completed');
        } catch (error) {
            setDebugInfo(prev => prev + `❌ API test failed: ${error}\n`);
        }
    };

    const copyDebugInfo = () => {
        navigator.clipboard.writeText(debugInfo);
        alert('Debug info copied to clipboard!');
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="debug-panel">
            <button 
                onClick={() => setIsVisible(!isVisible)}
                className="debug-toggle"
                title="Toggle debug panel"
            >
                🐛 {isVisible ? 'Hide' : 'Show'} Debug
            </button>
            
            {isVisible && (
                <div className="debug-content">
                    <div className="debug-header">
                        <h3>🐛 Power BI API Debug Panel</h3>
                        <div className="debug-actions">
                            <button onClick={testAPI} className="test-button">
                                🧪 Test API
                            </button>
                            <button onClick={copyDebugInfo} className="copy-button">
                                📋 Copy
                            </button>
                            <button onClick={() => setDebugInfo('')} className="clear-button">
                                🗑️ Clear
                            </button>
                        </div>
                    </div>
                    
                    <div className="debug-output">
                        <pre>{debugInfo || 'Click "Test API" to run diagnostics...'}</pre>
                    </div>
                    
                    <div className="debug-info">
                        <h4>🔍 Current State:</h4>
                        <ul>
                            <li>Authentication: {isAuthenticated ? '✅ Yes' : '❌ No'}</li>
                            <li>Token Available: {powerBiToken ? '✅ Yes' : '❌ No'}</li>
                            <li>Token Length: {powerBiToken ? powerBiToken.length : 'N/A'}</li>
                            <li>Token Preview: {powerBiToken ? `${powerBiToken.substring(0, 20)}...` : 'N/A'}</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
