// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Power BI Token Service
 * This service handles generating embed tokens for Power BI reports, dashboards, and tiles
 */

export interface EmbedTokenRequest {
    // Required: Report, Dashboard, or Tile ID
    reportId?: string;
    dashboardId?: string;
    tileId?: string;
    
    // Optional: Group/Workspace ID (if not provided, uses "My Workspace")
    groupId?: string;
    
    // Optional: Dataset ID (required for RLS scenarios)
    datasetId?: string;
    
    // Optional: Row Level Security (RLS) configuration
    identities?: Array<{
        username: string;
        roles?: string[];
        datasets?: string[];
    }>;
    
    // Optional: Effective identity for RLS
    effectiveIdentity?: {
        username: string;
        roles?: string[];
        datasets?: string[];
    };
    
    // Optional: Access level (View, Edit, Create)
    accessLevel?: 'View' | 'Edit' | 'Create';
    
    // Optional: Token expiration (max 60 minutes for embed tokens)
    lifetimeInMinutes?: number;
}

export interface EmbedTokenResponse {
    token: string;
    tokenId: string;
    expiration: string;
}

export class PowerBITokenService {
    private accessToken: string;
    private baseUrl = 'https://api.powerbi.com/v1.0/myorg';

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    /**
     * Generate embed token for a Power BI report using V2 API (supports DirectLake)
     * API Reference: https://learn.microsoft.com/en-us/rest/api/power-bi/embed-token/generate-token
     */
    async generateReportEmbedToken(request: EmbedTokenRequest): Promise<EmbedTokenResponse> {
        const { reportId, groupId, datasetId, identities, accessLevel = 'View', lifetimeInMinutes = 60 } = request;
        
        if (!reportId) {
            throw new Error('Report ID is required for report embed token generation');
        }

        // Use V2 API endpoint for DirectLake support
        const url = `${this.baseUrl}/GenerateToken`;

        const body: any = {
            accessLevel,
            lifetimeInMinutes,
            reports: [{
                id: reportId,
                groupId: groupId || undefined
            }]
        };

        // Add datasets array if datasetId is provided (required for DirectLake)
        if (datasetId) {
            body.datasets = [{
                id: datasetId,
                groupId: groupId || undefined
            }];
        }

        // Add identities for Row Level Security
        if (identities && identities.length > 0) {
            body.identities = identities;
        }

        return this.makeTokenRequest(url, body);
    }

    /**
     * Generate embed token for a Power BI report using V1 API (legacy method)
     * Note: This doesn't support DirectLake datasets
     */
    async generateReportEmbedTokenV1(request: EmbedTokenRequest): Promise<EmbedTokenResponse> {
        const { reportId, groupId, datasetId, identities, accessLevel = 'View', lifetimeInMinutes = 60 } = request;
        
        if (!reportId) {
            throw new Error('Report ID is required for report embed token generation');
        }

        const url = groupId 
            ? `${this.baseUrl}/groups/${groupId}/reports/${reportId}/GenerateToken`
            : `${this.baseUrl}/reports/${reportId}/GenerateToken`;

        const body: any = {
            accessLevel,
            lifetimeInMinutes
        };

        // Add dataset ID if provided (required for RLS)
        if (datasetId) {
            body.datasetId = datasetId;
        }

        // Add identities for Row Level Security
        if (identities && identities.length > 0) {
            body.identities = identities;
        }

        return this.makeTokenRequest(url, body);
    }

    /**
     * Generate embed token for multiple reports (useful for embedding multiple reports with one token)
     */
    async generateMultipleReportsEmbedToken(
        reports: Array<{ reportId: string; datasetId?: string; groupId?: string }>,
        options: { accessLevel?: string; lifetimeInMinutes?: number; identities?: any[] } = {}
    ): Promise<EmbedTokenResponse> {
        const { accessLevel = 'View', lifetimeInMinutes = 60, identities } = options;

        const url = `${this.baseUrl}/GenerateToken`;

        const body: any = {
            accessLevel,
            lifetimeInMinutes,
            reports: reports.map(report => ({
                id: report.reportId,
                datasetId: report.datasetId,
                groupId: report.groupId
            }))
        };

        // Add identities for Row Level Security
        if (identities && identities.length > 0) {
            body.identities = identities;
        }

        return this.makeTokenRequest(url, body);
    }

    /**
     * Generate embed token for a dashboard
     */
    async generateDashboardEmbedToken(request: EmbedTokenRequest): Promise<EmbedTokenResponse> {
        const { dashboardId, groupId, accessLevel = 'View', lifetimeInMinutes = 60 } = request;
        
        if (!dashboardId) {
            throw new Error('Dashboard ID is required for dashboard embed token generation');
        }

        const url = groupId 
            ? `${this.baseUrl}/groups/${groupId}/dashboards/${dashboardId}/GenerateToken`
            : `${this.baseUrl}/dashboards/${dashboardId}/GenerateToken`;

        const body = {
            accessLevel,
            lifetimeInMinutes
        };

        return this.makeTokenRequest(url, body);
    }

    /**
     * Generate embed token for a tile
     */
    async generateTileEmbedToken(request: EmbedTokenRequest): Promise<EmbedTokenResponse> {
        const { dashboardId, tileId, groupId, accessLevel = 'View', lifetimeInMinutes = 60 } = request;
        
        if (!dashboardId || !tileId) {
            throw new Error('Both Dashboard ID and Tile ID are required for tile embed token generation');
        }

        const url = groupId 
            ? `${this.baseUrl}/groups/${groupId}/dashboards/${dashboardId}/tiles/${tileId}/GenerateToken`
            : `${this.baseUrl}/dashboards/${dashboardId}/tiles/${tileId}/GenerateToken`;

        const body = {
            accessLevel,
            lifetimeInMinutes
        };

        return this.makeTokenRequest(url, body);
    }

    /**
     * Make the actual HTTP request to generate the token
     */
    private async makeTokenRequest(url: string, body: any): Promise<EmbedTokenResponse> {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate embed token: ${response.status} ${response.statusText}. ${errorText}`);
        }

        return response.json();
    }
}

/**
 * Example usage function showing how to use the token service
 */
export async function generateEmbedTokenExample(): Promise<void> {
    try {
        // You need to obtain an Azure AD access token first
        // This could come from MSAL, Azure AD, or your backend service
        const accessToken = 'YOUR_AZURE_AD_ACCESS_TOKEN';
        
        const tokenService = new PowerBITokenService(accessToken);

        // Example 1: Generate token for a single report (V2 API - supports DirectLake)
        const reportTokenResponse = await tokenService.generateReportEmbedToken({
            reportId: 'YOUR_REPORT_ID',
            groupId: 'YOUR_WORKSPACE_ID', // Optional: omit for "My Workspace"
            datasetId: 'YOUR_DATASET_ID', // Recommended for DirectLake datasets
            accessLevel: 'View',
            lifetimeInMinutes: 60
        });

        console.log('Report embed token (V2):', reportTokenResponse.token);

        // Example 2: Generate token with Row Level Security (works with DirectLake)
        const rlsTokenResponse = await tokenService.generateReportEmbedToken({
            reportId: 'YOUR_REPORT_ID',
            groupId: 'YOUR_WORKSPACE_ID',
            datasetId: 'YOUR_DATASET_ID', // Required for RLS
            identities: [{
                username: 'user@company.com',
                roles: ['SalesRole', 'ManagerRole'],
                datasets: ['YOUR_DATASET_ID']
            }],
            accessLevel: 'View',
            lifetimeInMinutes: 60
        });

        console.log('RLS embed token (DirectLake compatible):', rlsTokenResponse.token);

        // Example 3: Generate token for multiple reports (V2 API)
        const multiReportToken = await tokenService.generateMultipleReportsEmbedToken(
            [
                { reportId: 'REPORT_ID_1', datasetId: 'DATASET_ID_1', groupId: 'WORKSPACE_ID' },
                { reportId: 'REPORT_ID_2', datasetId: 'DATASET_ID_2', groupId: 'WORKSPACE_ID' }
            ],
            {
                accessLevel: 'View',
                lifetimeInMinutes: 60
            }
        );

        console.log('Multi-report embed token:', multiReportToken.token);

        // Example 4: Use V1 API (only if you don't have DirectLake datasets)
        const v1TokenResponse = await tokenService.generateReportEmbedTokenV1({
            reportId: 'YOUR_REPORT_ID',
            groupId: 'YOUR_WORKSPACE_ID',
            accessLevel: 'View',
            lifetimeInMinutes: 60
        });

        console.log('V1 embed token (legacy):', v1TokenResponse.token);

    } catch (error) {
        console.error('Error generating embed token:', error);
        
        // Handle specific DirectLake error
        if (error instanceof Error && error.message.includes('DirectLake dataset is not supported with V1 embed token')) {
            console.error('💡 Solution: Your dataset uses DirectLake. Make sure to use the V2 API (generateReportEmbedToken) and provide the datasetId.');
        }
    }
}
