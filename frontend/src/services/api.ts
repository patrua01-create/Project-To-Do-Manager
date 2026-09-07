import { ApiResponse, ApiError } from '../types/index.js';

const API_URL = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:5000';

interface ApiClientType {
  get<T>(path: string, params?: Record<string, any>): Promise<T>;
  post<T>(path: string, body?: any): Promise<T>;
  put<T>(path: string, body?: any): Promise<T>;
  patch<T>(path: string, body?: any): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

/**
 * API Client with automatic authentication via httpOnly cookies
 * Transforms API responses and handles errors
 */
function createApiClient(): ApiClientType {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  async function request<T>(
    method: string,
    path: string,
    body?: any,
    params?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${API_URL}${path}`);

    // Add query parameters if provided
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method,
      headers: baseHeaders,
      credentials: 'include', // Include httpOnly cookies
      ...(body && { body: JSON.stringify(body) }),
    });

    // Handle network errors
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let error: ApiError;

      if (contentType?.includes('application/json')) {
        try {
          const data: ApiResponse = await response.json();
          error = {
            code: data.error?.code || 'UNKNOWN_ERROR',
            message: data.error?.message || `HTTP ${response.status}`,
            status: response.status,
          };
        } catch {
          error = {
            code: 'PARSE_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
          };
        }
      } else {
        error = {
          code: 'HTTP_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
      }

      throw error;
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw {
        code: 'INVALID_RESPONSE',
        message: 'Server returned non-JSON response',
        status: 200,
      };
    }

    const data: ApiResponse<T> = await response.json();

    // Check API success flag
    if (!data.success) {
      throw {
        code: data.error?.code || 'API_ERROR',
        message: data.error?.message || 'API request failed',
        status: response.status,
      };
    }

    return data.data as T;
  }

  return {
    get<T>(path: string, params?: Record<string, any>): Promise<T> {
      return request<T>('GET', path, undefined, params);
    },

    post<T>(path: string, body?: any): Promise<T> {
      return request<T>('POST', path, body);
    },

    put<T>(path: string, body?: any): Promise<T> {
      return request<T>('PUT', path, body);
    },

    patch<T>(path: string, body?: any): Promise<T> {
      return request<T>('PATCH', path, body);
    },

    delete<T>(path: string): Promise<T> {
      return request<T>('DELETE', path);
    },
  };
}

export const apiClient = createApiClient();
export type { ApiResponse, ApiError };
