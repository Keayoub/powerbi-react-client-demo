/**
 * Service d'authentification Power BI pour gérer les tokens et la configuration
 * Résout les erreurs 404 et de génération de tokens
 */

import { models } from 'powerbi-client';

export interface PowerBIAuthConfig {
    clientId: string;
    redirectUri: string;
    authority: string;
    scopes: string[];
}

export interface PowerBITokenResponse {
    accessToken: string;
    expiresIn: number;
    tokenType: string;
    refreshToken?: string;
}

export interface PowerBIEmbedToken {
    token: string;
    tokenId: string;
    expiration: string;
}

export class PowerBIAuthService {
    private static instance: PowerBIAuthService;
    private config: PowerBIAuthConfig | null = null;
    private currentToken: string | null = null;
    private tokenExpiry: Date | null = null;
    private loggingEnabled = false;

    private constructor() {}

    /**
     * Obtient l'instance singleton
     */
    static getInstance(): PowerBIAuthService {
        if (!PowerBIAuthService.instance) {
            PowerBIAuthService.instance = new PowerBIAuthService();
        }
        return PowerBIAuthService.instance;
    }

    /**
     * Configure l'authentification
     */
    configure(config: PowerBIAuthConfig): void {
        this.config = config;
        if (this.loggingEnabled) {
            console.log('🔑 PowerBI Auth Service configured:', {
                clientId: config.clientId,
                authority: config.authority,
                scopes: config.scopes
            });
        }
    }

    /**
     * Active/désactive le logging
     */
    setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
    }

    /**
     * Vérifie si un token est valide
     */
    isTokenValid(): boolean {
        if (!this.currentToken || !this.tokenExpiry) {
            return false;
        }
        
        // Vérifier si le token expire dans les 5 prochaines minutes
        const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
        return this.tokenExpiry > fiveMinutesFromNow;
    }

    /**
     * Obtient le token d'accès actuel
     */
    getCurrentToken(): string | null {
        if (this.isTokenValid()) {
            return this.currentToken;
        }
        return null;
    }

    /**
     * Définit manuellement un token (pour les tests ou configuration manuelle)
     */
    setToken(token: string, expiresInSeconds: number = 3600): void {
        this.currentToken = token;
        this.tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000);
        
        if (this.loggingEnabled) {
            console.log('🔑 Token défini manuellement, expire à:', this.tokenExpiry);
        }
    }

    /**
     * Rafraîchit le token d'accès
     */
    async refreshToken(): Promise<string> {
        if (!this.config) {
            throw new Error('PowerBI Auth Service n\'est pas configuré');
        }

        try {
            // En mode développement, utiliser un token de test
            if (process.env.NODE_ENV === 'development') {
                const devToken = this.generateDevelopmentToken();
                this.setToken(devToken, 3600);
                
                if (this.loggingEnabled) {
                    console.log('🔑 Token de développement généré');
                }
                
                return devToken;
            }

            // En production, implémenter l'authentification réelle MSAL
            return await this.authenticateWithMSAL();
            
        } catch (error) {
            if (this.loggingEnabled) {
                console.error('❌ Erreur lors du rafraîchissement du token:', error);
            }
            throw error;
        }
    }

    /**
     * Génère un token de développement pour les tests
     */
    private generateDevelopmentToken(): string {
        // Token JWT-like pour le développement (pas un vrai token)
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            iss: 'powerbi-dev',
            aud: 'https://analysis.windows.net/powerbi/api',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            dev: true
        }));
        const signature = btoa('dev-signature-not-for-production');
        
        return `${header}.${payload}.${signature}`;
    }

    /**
     * Authentification avec MSAL pour la production
     */
    private async authenticateWithMSAL(): Promise<string> {
        if (!this.config) {
            throw new Error('Configuration manquante');
        }

        // Ici vous pouvez implémenter MSAL.js ou votre méthode d'authentification
        // Pour l'instant, retourner une erreur explicite
        throw new Error(`
            🔑 Authentification MSAL non implémentée.
            
            Pour utiliser Power BI en production :
            1. Configurez Azure AD App Registration
            2. Implémentez MSAL.js dans cette méthode
            3. Ou fournissez un token valide via setToken()
            
            En mode développement, un token de test est généré automatiquement.
        `);
    }

    /**
     * Génère un token d'embed pour un rapport spécifique
     */
    async generateEmbedToken(reportId: string, groupId?: string): Promise<PowerBIEmbedToken> {
        const accessToken = await this.getValidToken();
        
        try {
            // En mode développement, simuler la génération d'embed token
            if (process.env.NODE_ENV === 'development') {
                return this.generateDevelopmentEmbedToken(reportId);
            }

            // En production, appeler l'API Power BI REST
            return await this.callPowerBIRestAPI(reportId, groupId, accessToken);
            
        } catch (error) {
            if (this.loggingEnabled) {
                console.error('❌ Erreur génération embed token:', error);
            }
            throw error;
        }
    }

    /**
     * Génère un embed token de développement
     */
    private generateDevelopmentEmbedToken(reportId: string): PowerBIEmbedToken {
        const expiration = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
        
        return {
            token: `embed_${reportId}_${Date.now()}`,
            tokenId: `tokenId_${reportId}`,
            expiration: expiration.toISOString()
        };
    }

    /**
     * Appelle l'API REST Power BI pour générer un embed token
     */
    private async callPowerBIRestAPI(reportId: string, groupId: string | undefined, accessToken: string): Promise<PowerBIEmbedToken> {
        const baseUrl = 'https://api.powerbi.com/v1.0/myorg';
        const url = groupId 
            ? `${baseUrl}/groups/${groupId}/reports/${reportId}/GenerateToken`
            : `${baseUrl}/reports/${reportId}/GenerateToken`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accessLevel: 'View',
                allowSaveAs: false
            })
        });

        if (!response.ok) {
            throw new Error(`Power BI API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
            token: data.token,
            tokenId: data.tokenId,
            expiration: data.expiration
        };
    }

    /**
     * Obtient un token valide (rafraîchit si nécessaire)
     */
    async getValidToken(): Promise<string> {
        if (this.isTokenValid() && this.currentToken) {
            return this.currentToken;
        }

        if (this.loggingEnabled) {
            console.log('🔄 Rafraîchissement du token nécessaire');
        }

        return await this.refreshToken();
    }

    /**
     * Efface les tokens stockés (logout)
     */
    clearTokens(): void {
        this.currentToken = null;
        this.tokenExpiry = null;
        
        if (this.loggingEnabled) {
            console.log('🔑 Tokens effacés');
        }
    }

    /**
     * Obtient des informations sur le token actuel
     */
    getTokenInfo(): { hasToken: boolean; isValid: boolean; expiresAt: Date | null } {
        return {
            hasToken: !!this.currentToken,
            isValid: this.isTokenValid(),
            expiresAt: this.tokenExpiry
        };
    }

    /**
     * Configure les paramètres par défaut pour le développement
     */
    configureForDevelopment(): void {
        this.configure({
            clientId: 'dev-client-id',
            redirectUri: window.location.origin,
            authority: 'https://login.microsoftonline.com/common',
            scopes: ['https://analysis.windows.net/powerbi/api/.default']
        });

        // Générer un token de développement immédiatement
        const devToken = this.generateDevelopmentToken();
        this.setToken(devToken, 3600);

        if (this.loggingEnabled) {
            console.log('🔧 Configuration de développement appliquée');
        }
    }
}

// Instance singleton exportée
export const powerBIAuthService = PowerBIAuthService.getInstance();

// Configuration automatique en mode développement
if (process.env.NODE_ENV === 'development') {
    powerBIAuthService.configureForDevelopment();
}

export default powerBIAuthService;
