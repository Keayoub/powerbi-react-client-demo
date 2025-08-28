// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
    PublicClientApplication, 
    EventType, 
    AuthenticationResult,
    AccountInfo,
    SilentRequest
} from '@azure/msal-browser';
import { msalConfig, powerBiTokenRequest } from '../config/authConfig';

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
msalInstance.initialize().then(() => {
    // Optional: Handle the response from redirect flow
    msalInstance.handleRedirectPromise().then((response) => {
        if (response) {
            console.log('Authentication successful:', response);
        }
    }).catch((error) => {
        console.error('Authentication error:', error);
    });
});

// Add event listener for login success
msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as AuthenticationResult;
        const account = payload.account;
        msalInstance.setActiveAccount(account);
    }
});

// Authentication context interface
interface AuthContextType {
    isAuthenticated: boolean;
    user: AccountInfo | null;
    loading: boolean;
    powerBiToken: string | null;
    tokenExpiry: Date | null;
    login: () => Promise<void>;
    logout: () => void;
    acquirePowerBiToken: () => Promise<string>;
    error: string | null;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Auth Provider component
interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AccountInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [powerBiToken, setPowerBiToken] = useState<string | null>(null);
    const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Auto-refresh token before expiry
    useEffect(() => {
        if (!powerBiToken || !tokenExpiry) return;

        const timeUntilExpiry = tokenExpiry.getTime() - Date.now();
        const refreshTime = Math.max(timeUntilExpiry - 300000, 0); // Refresh 5 minutes before expiry

        const refreshTimer = setTimeout(async () => {
            try {
                console.log('Auto-refreshing Power BI token...');
                await acquirePowerBiTokenSilently();
            } catch (error) {
                console.warn('Auto token refresh failed:', error);
            }
        }, refreshTime);

        return () => clearTimeout(refreshTimer);
    }, [powerBiToken, tokenExpiry]);

    // Check authentication status on mount and handle page refresh
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                setLoading(true);
                
                // Handle redirect promise first (for page refreshes after login)
                const redirectResponse = await msalInstance.handleRedirectPromise();
                if (redirectResponse) {
                    console.log('Redirect authentication successful:', redirectResponse);
                    setUser(redirectResponse.account);
                    setIsAuthenticated(true);
                    msalInstance.setActiveAccount(redirectResponse.account);
                }

                // Check for existing accounts (session persistence)
                const accounts = msalInstance.getAllAccounts();
                if (accounts.length > 0) {
                    const account = accounts[0];
                    msalInstance.setActiveAccount(account);
                    setUser(account);
                    setIsAuthenticated(true);
                    
                    // Try to get a Power BI token silently
                    try {
                        await acquirePowerBiTokenSilently();
                    } catch (tokenError) {
                        console.warn('Could not acquire Power BI token silently on startup:', tokenError);
                    }
                } else if (!redirectResponse) {
                    // No accounts found and no redirect response
                    console.log('No authenticated accounts found');
                    setIsAuthenticated(false);
                    setUser(null);
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
                setError('Failed to check authentication status');
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuthStatus();
    }, []);

    // Handle visibility change to refresh tokens when user returns to tab
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isAuthenticated && powerBiToken) {
                // Check if token needs refresh when user returns to the tab
                if (tokenExpiry) {
                    const timeUntilExpiry = tokenExpiry.getTime() - Date.now();
                    if (timeUntilExpiry < 600000) { // Less than 10 minutes left
                        try {
                            console.log('Refreshing token on tab focus...');
                            await acquirePowerBiTokenSilently();
                        } catch (error) {
                            console.warn('Token refresh on focus failed:', error);
                        }
                    }
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isAuthenticated, powerBiToken, tokenExpiry]);

    // Login function with improved session persistence
    const login = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            // Use loginRedirect for better session persistence
            await msalInstance.loginRedirect({
                scopes: ['openid', 'profile', 'User.Read'],
                prompt: 'select_account'
            });

            // The actual authentication handling will happen in the useEffect 
            // when handleRedirectPromise resolves
        } catch (error) {
            console.error('Login error:', error);
            setError(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setLoading(false);
        }
    };

    // Logout function with session cleanup
    const logout = (): void => {
        setLoading(true);
        setError(null);
        
        try {
            // Clear local state immediately
            setIsAuthenticated(false);
            setUser(null);
            setPowerBiToken(null);
            setTokenExpiry(null);

            // Use logoutRedirect for complete session cleanup
            msalInstance.logoutRedirect({
                postLogoutRedirectUri: window.location.origin
            });
        } catch (error) {
            console.error('Logout error:', error);
            setError(`Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setLoading(false);
        }
    };

    // Acquire Power BI token silently
    const acquirePowerBiTokenSilently = async (): Promise<string> => {
        try {
            const account = msalInstance.getActiveAccount();
            if (!account) {
                throw new Error('No active account found');
            }

            const silentRequest: SilentRequest = {
                ...powerBiTokenRequest,
                account: account
            };

            const response = await msalInstance.acquireTokenSilent(silentRequest);
            
            if (response.accessToken) {
                setPowerBiToken(response.accessToken);
                setTokenExpiry(response.expiresOn || null);
                setError(null);
                return response.accessToken;
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            console.error('Silent token acquisition failed:', error);
            
            // If silent fails, try interactive
            return await acquirePowerBiTokenInteractive();
        }
    };

    // Acquire Power BI token interactively
    const acquirePowerBiTokenInteractive = async (): Promise<string> => {
        try {
            const response = await msalInstance.acquireTokenPopup(powerBiTokenRequest);
            
            if (response.accessToken) {
                setPowerBiToken(response.accessToken);
                setTokenExpiry(response.expiresOn || null);
                setError(null);
                return response.accessToken;
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            const errorMessage = `Failed to acquire Power BI token: ${error instanceof Error ? error.message : 'Unknown error'}`;
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    };

    // Public function to acquire Power BI token
    const acquirePowerBiToken = async (): Promise<string> => {
        try {
            setError(null);
            
            // Check if current token is still valid (has at least 5 minutes left)
            if (powerBiToken && tokenExpiry) {
                const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
                if (tokenExpiry > fiveMinutesFromNow) {
                    return powerBiToken;
                }
            }

            // Try silent first, then interactive if needed
            return await acquirePowerBiTokenSilently();
        } catch (error) {
            console.error('Error acquiring Power BI token:', error);
            throw error;
        }
    };

    const contextValue: AuthContextType = {
        isAuthenticated,
        user,
        loading,
        powerBiToken,
        tokenExpiry,
        login,
        logout,
        acquirePowerBiToken,
        error
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
