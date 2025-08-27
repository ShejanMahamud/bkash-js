import { AxiosError } from 'axios';
import { IHttpClient, ILogger, IRetryService } from '../interfaces/base';
import { ITokenManager } from '../interfaces/services';
import {
    BkashConfig,
    BkashError,
    GrantTokenRequest,
    GrantTokenResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
} from '../types/types';

/**
 * Token management service
 */
export class TokenManager implements ITokenManager {
    private token: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor(
        private readonly config: BkashConfig,
        private readonly httpClient: IHttpClient,
        private readonly logger: ILogger,
        private readonly retryService: IRetryService
    ) { }

    /**
     * Obtains and manages authentication token from bKash API
     */
    async getToken(): Promise<string> {
        if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
            return this.token as string;
        }

        return this.retryService.retryOperation(async () => {
            try {
                this.logger.debug('Requesting new token');
                const requestData: GrantTokenRequest = {
                    app_key: this.config.appKey,
                    app_secret: this.config.appSecret,
                };

                const response = await this.httpClient.post<GrantTokenResponse>(
                    '/tokenized/checkout/token/grant',
                    requestData,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            username: this.config.username,
                            password: this.config.password,
                        },
                    }
                );

                const tokenData = response.data;
                if (!tokenData.id_token) {
                    throw new BkashError('No token received from bKash', 'TOKEN_ERROR');
                }

                this.token = tokenData.id_token;
                const expiresIn = tokenData.expires_in || 3600;
                this.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

                this.logger.debug('Token obtained successfully', {
                    tokenType: tokenData.token_type,
                    expiresIn: tokenData.expires_in,
                    statusCode: tokenData.statusCode,
                    statusMessage: tokenData.statusMessage
                });

                return tokenData.id_token;
            } catch (error) {
                this.logger.error('Failed to get token', { error });
                throw new BkashError(
                    'Failed to get bKash token',
                    'TOKEN_ERROR',
                    error instanceof AxiosError ? error.response?.data : error
                );
            }
        });
    }

    /**
     * Refresh existing token and get a new access token
     */
    async refreshToken(refreshTokenValue: string): Promise<RefreshTokenResponse> {
        try {
            this.logger.info('Refreshing token', { refreshTokenValue });

            const requestData: RefreshTokenRequest = {
                app_key: this.config.appKey,
                app_secret: this.config.appSecret,
                refresh_token: refreshTokenValue,
            };

            const response = await this.httpClient.post<RefreshTokenResponse>(
                '/tokenized/checkout/token/refresh',
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        username: this.config.username,
                        password: this.config.password,
                    },
                }
            );

            this.logger.info('Token refreshed', {
                response: {
                    tokenType: response.data.token_type,
                    expiresIn: response.data.expires_in,
                    statusCode: response.data.statusCode,
                    statusMessage: response.data.statusMessage
                }
            });

            return response.data;
        } catch (error) {
            this.logger.error('Failed to refresh token', { error, refreshTokenValue });
            throw new BkashError(
                'Failed to refresh token',
                'TOKEN_REFRESH_ERROR',
                error instanceof AxiosError ? error.response?.data : error
            );
        }
    }

    /**
     * Grant Token - Create a new access token for bKash API authorization
     */
    async grantToken(): Promise<GrantTokenResponse> {
        try {
            this.logger.info('Requesting new grant token');

            const requestData: GrantTokenRequest = {
                app_key: this.config.appKey,
                app_secret: this.config.appSecret,
            };

            const response = await this.httpClient.post<GrantTokenResponse>(
                '/tokenized/checkout/token/grant',
                requestData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        username: this.config.username,
                        password: this.config.password,
                    },
                }
            );

            this.logger.info('Grant token obtained', {
                tokenType: response.data.token_type,
                expiresIn: response.data.expires_in,
                statusCode: response.data.statusCode,
                statusMessage: response.data.statusMessage
            });

            return response.data;
        } catch (error) {
            this.logger.error('Failed to grant token', { error });
            throw new BkashError(
                'Failed to grant bKash token',
                'TOKEN_GRANT_ERROR',
                error instanceof AxiosError ? error.response?.data : error
            );
        }
    }

    /**
     * Check if current token is expired
     */
    isTokenExpired(): boolean {
        return !this.token || !this.tokenExpiry || this.tokenExpiry <= new Date();
    }

    /**
     * Clear stored token
     */
    clearToken(): void {
        this.token = null;
        this.tokenExpiry = null;
    }
}
