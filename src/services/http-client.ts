import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { IHttpClient, ILogger } from '../interfaces/base';
import { BkashConfig } from '../types/types';

/**
 * Axios HTTP Client implementation
 */
export class AxiosHttpClient implements IHttpClient {
    private readonly client: AxiosInstance;

    constructor(config: BkashConfig, logger: ILogger) {
        const baseURL = config.isSandbox
            ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
            : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            timeout: config.timeout || 30000,
        });

        // Add response interceptor for logging
        this.client.interceptors.response.use(
            (response) => {
                logger.debug('API Response', {
                    url: response.config.url,
                    method: response.config.method,
                    status: response.status,
                });
                return response;
            },
            (error: AxiosError) => {
                logger.error('API Error', {
                    url: error.config?.url,
                    method: error.config?.method,
                    status: error.response?.status,
                    data: error.response?.data,
                });
                return Promise.reject(error);
            }
        );
    }

    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.post<T>(url, data, config);
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.get<T>(url, config);
    }

    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.put<T>(url, data, config);
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.delete<T>(url, config);
    }
}
