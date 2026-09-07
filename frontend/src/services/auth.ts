import { User, ApiError } from '../types/index.js';
import { apiClient } from './api.js';

const API_URL = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:5000';

/**
 * Get current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await apiClient.get<User>('/auth/me');
    return user;
  } catch (error) {
    const apiError = error as ApiError;
    // 401 means not authenticated, not an error
    if (apiError.status === 401) {
      return null;
    }
    throw error;
  }
}

/**
 * Logout user and clear session
 */
export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

/**
 * Redirect to Google OAuth login
 */
export function loginWithGoogle(): void {
  window.location.href = `${API_URL}/auth/google`;
}

/**
 * Redirect to GitHub OAuth login
 */
export function loginWithGitHub(): void {
  window.location.href = `${API_URL}/auth/github`;
}
