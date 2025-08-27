import { AxiosRequestConfig, AxiosResponse } from 'axios';

/**
 * HTTP Client abstraction for dependency injection
 */
export interface IHttpClient {
    post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
}

/**
 * Logger abstraction for dependency injection
 */
export interface ILogger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Retry operation utility interface
 */
export interface IRetryService {
    retryOperation<T>(operation: () => Promise<T>): Promise<T>;
}

/**
 * Event emitter abstraction
 */
export interface IEventEmitter {
    emit(eventName: string | symbol, ...args: unknown[]): boolean;
    on(eventName: string | symbol, listener: (...args: unknown[]) => void): this;
    once(eventName: string | symbol, listener: (...args: unknown[]) => void): this;
    removeListener(eventName: string | symbol, listener: (...args: unknown[]) => void): this;
}
