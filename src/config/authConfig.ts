// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { Configuration, PopupRequest } from '@azure/msal-browser';

// MSAL Configuration
export const msalConfig: Configuration = {
    auth: {
        clientId: process.env.REACT_APP_AZURE_CLIENT_ID || '<Your Client ID>', // Your Client ID
        authority: process.env.REACT_APP_AZURE_AUTHORITY || 'https://login.microsoftonline.com/<Your Tanent ID>', // Your specific tenant
        redirectUri: process.env.REACT_APP_REDIRECT_URI || 'https://localhost:9000', // Updated to match current port
        navigateToLoginRequestUrl: false
    },
    cache: {
        cacheLocation: 'sessionStorage', // Use sessionStorage for better session persistence across tabs
        storeAuthStateInCookie: true, // Enable cookie storage for better browser compatibility
        secureCookies: true, // Use secure cookies for HTTPS environments
        claimsBasedCachingEnabled: true // Enable claims-based caching for better performance
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case 1: // Error
                        console.error(message);
                        break;
                    case 2: // Warning
                        console.warn(message);
                        break;
                    case 3: // Info
                        console.info(message);
                        break;
                    case 4: // Verbose
                        console.debug(message);
                        break;
                    default:
                        console.log(message);
                        break;
                }
            }
        }
    }
};

// Power BI scopes - these are the permissions we need for Power BI API access
export const powerBiLoginRequest: PopupRequest = {
    scopes: [
        'https://analysis.windows.net/powerbi/api/Dataset.Read.All',
        'https://analysis.windows.net/powerbi/api/Report.Read.All',
        'https://analysis.windows.net/powerbi/api/Workspace.Read.All',
        'https://analysis.windows.net/powerbi/api/Content.Create', // For edit scenarios
        'https://analysis.windows.net/powerbi/api/Metadata.View_Any'
    ],
    prompt: 'select_account'
};

// Scopes for silent token acquisition
export const powerBiTokenRequest = {
    scopes: [
        'https://analysis.windows.net/powerbi/api/Dataset.Read.All',
        'https://analysis.windows.net/powerbi/api/Report.Read.All',
        'https://analysis.windows.net/powerbi/api/Workspace.Read.All',
        'https://analysis.windows.net/powerbi/api/Content.Create',
        'https://analysis.windows.net/powerbi/api/Metadata.View_Any'
    ],
    forceRefresh: false // Set to "true" to skip a cached token and go to the server to get a new token
};

// Basic Azure AD scopes for user profile
export const profileLoginRequest: PopupRequest = {
    scopes: ['openid', 'profile', 'User.Read'],
    prompt: 'select_account'
};
