// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export interface PowerBIWorkspace {
    id: string;
    name: string;
    type: string;
    state: string;
    isReadOnly: boolean;
    isOnDedicatedCapacity: boolean;
}

export interface PowerBIDataset {
    id: string;
    name: string;
    webUrl: string;
    addRowsAPIEnabled: boolean;
    configuredBy: string;
    isRefreshable: boolean;
    isEffectiveIdentityRequired: boolean;
    isEffectiveIdentityRolesRequired: boolean;
    isOnPremGatewayRequired: boolean;
    targetStorageMode: string;
    actualStorage: string;
    createdDate: string;
    contentProviderType: string;
    createReportEmbedURL: string;
    qnaEmbedURL: string;
}

export interface PowerBIReport {
    id: string;
    reportType: string;
    name: string;
    webUrl: string;
    embedUrl: string;
    isFromPbix: boolean;
    isOwnedByMe: boolean;
    datasetId: string;
    datasetWorkspaceId: string;
    createdDateTime: string;
    modifiedDateTime: string;
    modifiedBy: string;
}

export interface PowerBIDashboard {
    id: string;
    displayName: string;
    isReadOnly: boolean;
    webUrl: string;
    embedUrl: string;
}

export interface PowerBITile {
    id: string;
    title: string;
    subTitle: string;
    reportId: string;
    datasetId: string;
    embedUrl: string;
    embedData: string;
    rowSpan: number;
    colSpan: number;
}

export class PowerBIWorkspaceService {
    private static instance: PowerBIWorkspaceService | null = null;
    private baseUrl = 'https://api.powerbi.com/v1.0/myorg';

    constructor(private accessToken: string) {}

    /**
     * Get singleton instance of the service
     */
    static getInstance(accessToken?: string): PowerBIWorkspaceService {
        if (!PowerBIWorkspaceService.instance && accessToken) {
            PowerBIWorkspaceService.instance = new PowerBIWorkspaceService(accessToken);
        }
        if (!PowerBIWorkspaceService.instance) {
            throw new Error('PowerBIWorkspaceService instance not initialized. Call getInstance with accessToken first.');
        }
        return PowerBIWorkspaceService.instance;
    }

    /**
     * Update access token for existing instance
     */
    updateAccessToken(accessToken: string): void {
        this.accessToken = accessToken;
    }

    /**
     * Get all workspaces the user has access to
     */
    async getWorkspaces(): Promise<PowerBIWorkspace[]> {
        try {
            const response = await fetch(`${this.baseUrl}/groups`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch workspaces: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error fetching workspaces:', error);
            throw error;
        }
    }

    /**
     * Get all datasets in a specific workspace
     */
    async getDatasets(workspaceId?: string): Promise<PowerBIDataset[]> {
        try {
            const url = workspaceId 
                ? `${this.baseUrl}/groups/${workspaceId}/datasets`
                : `${this.baseUrl}/datasets`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch datasets: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error fetching datasets:', error);
            throw error;
        }
    }

    /**
     * Get all reports in a specific workspace
     */
    async getReports(workspaceId?: string): Promise<PowerBIReport[]> {
        try {
            const url = workspaceId 
                ? `${this.baseUrl}/groups/${workspaceId}/reports`
                : `${this.baseUrl}/reports`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch reports: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error fetching reports:', error);
            throw error;
        }
    }

    /**
     * Get reports associated with a specific dataset
     */
    async getReportsForDataset(datasetId: string, workspaceId?: string): Promise<PowerBIReport[]> {
        try {
            const allReports = await this.getReports(workspaceId);
            return allReports.filter(report => report.datasetId === datasetId);
        } catch (error) {
            console.error('Error fetching reports for dataset:', error);
            throw error;
        }
    }

    /**
     * Generate embed token for a specific report and dataset using V2 API (DirectLake compatible)
     */
    async generateEmbedToken(reportId: string, datasetIds: string[], workspaceId?: string): Promise<string> {
        try {
            console.log('Generating embed token with params:', {
                reportId,
                datasetIds,
                workspaceId
            });

            // For DirectLake datasets, we MUST use V2 API
            // Let's check if this is a DirectLake dataset first
            const datasets = await this.getDatasets(workspaceId);
            const targetDataset = datasets.find(ds => datasetIds.includes(ds.id));
            const isDirectLake = targetDataset?.targetStorageMode?.toLowerCase().includes('directlake');

            console.log('Dataset info:', {
                datasetName: targetDataset?.name,
                storageMode: targetDataset?.targetStorageMode,
                isDirectLake
            });

            // If it's DirectLake, skip V1 and go straight to V2
            let response: Response;
            let url: string;
            let requestBody: any;

            if (isDirectLake) {
                console.log('DirectLake dataset detected - using V2 API directly');
                
                url = 'https://api.powerbi.com/v2.0/myorg/GenerateToken';
                requestBody = {
                    datasets: datasetIds.map(id => ({ id })),
                    reports: [{ id: reportId }],
                    targetWorkspaces: workspaceId ? [{ id: workspaceId }] : undefined
                };

                console.log('V2 API request:', { url, requestBody });

                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
            } else {
                console.log('Non-DirectLake dataset - trying V1 API first');
                
                // Try V1 API first for non-DirectLake datasets
                url = workspaceId 
                    ? `${this.baseUrl}/groups/${workspaceId}/reports/${reportId}/GenerateToken`
                    : `${this.baseUrl}/reports/${reportId}/GenerateToken`;

                requestBody = {
                    datasets: datasetIds.map(id => ({ id })),
                    accessLevel: 'View'
                };

                console.log('V1 API request:', { url, requestBody });

                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });

                // If V1 fails, try V2 API as fallback
                if (!response.ok) {
                    console.log('V1 API failed, trying V2 API as fallback...');
                    
                    url = 'https://api.powerbi.com/v2.0/myorg/GenerateToken';
                    requestBody = {
                        datasets: datasetIds.map(id => ({ id })),
                        reports: [{ id: reportId }],
                        targetWorkspaces: workspaceId ? [{ id: workspaceId }] : undefined
                    };

                    console.log('V2 API fallback request:', { url, requestBody });

                    response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });
                }
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Embed token generation failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText,
                    url,
                    requestBody,
                    isDirectLake
                });
                throw new Error(`Failed to generate embed token: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            console.log('Embed token generated successfully for:', {
                datasetType: isDirectLake ? 'DirectLake' : 'Standard',
                apiUsed: url.includes('v2.0') ? 'V2' : 'V1'
            });
            return data.token;
        } catch (error) {
            console.error('Error generating embed token:', error);
            throw error;
        }
    }

    /**
     * Get all dashboards in a specific workspace
     */
    async getDashboards(workspaceId?: string): Promise<PowerBIDashboard[]> {
        try {
            const url = workspaceId 
                ? `${this.baseUrl}/groups/${workspaceId}/dashboards`
                : `${this.baseUrl}/dashboards`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch dashboards: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error fetching dashboards:', error);
            throw error;
        }
    }

    /**
     * Get all tiles for a specific dashboard
     */
    async getTiles(dashboardId: string, workspaceId?: string): Promise<PowerBITile[]> {
        try {
            const url = workspaceId 
                ? `${this.baseUrl}/groups/${workspaceId}/dashboards/${dashboardId}/tiles`
                : `${this.baseUrl}/dashboards/${dashboardId}/tiles`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch tiles: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.value || [];
        } catch (error) {
            console.error('Error fetching tiles:', error);
            throw error;
        }
    }

    /**
     * Generate embed token for dashboard
     */
    async generateDashboardEmbedToken(dashboardId: string, workspaceId?: string): Promise<string> {
        try {
            const url = workspaceId 
                ? `${this.baseUrl}/groups/${workspaceId}/dashboards/${dashboardId}/GenerateToken`
                : `${this.baseUrl}/dashboards/${dashboardId}/GenerateToken`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accessLevel: 'View'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate dashboard embed token: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Error generating dashboard embed token:', error);
            throw error;
        }
    }

    /**
     * Generate embed token for tile
     */
    async generateTileEmbedToken(dashboardId: string, tileId: string, workspaceId?: string): Promise<string> {
        try {
            const url = workspaceId 
                ? `${this.baseUrl}/groups/${workspaceId}/dashboards/${dashboardId}/tiles/${tileId}/GenerateToken`
                : `${this.baseUrl}/dashboards/${dashboardId}/tiles/${tileId}/GenerateToken`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accessLevel: 'View'
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate tile embed token: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return data.token;
        } catch (error) {
            console.error('Error generating tile embed token:', error);
            throw error;
        }
    }
}
