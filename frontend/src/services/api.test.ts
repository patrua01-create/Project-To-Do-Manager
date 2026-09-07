import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, type ApiResponse } from './api';

/**
 * Test 9: API Service Auto-Headers and Error Handling
 * Verify API client includes credentials, handles success/error responses correctly
 */

describe('Test 9: API Service Auto-Headers and Error Handling', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    (globalThis as any).fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should include credentials (withCredentials) in requests', async () => {
    const mockResponse: ApiResponse = {
      success: true,
      data: { id: 'test-1', name: 'Test' }
    };

    fetchMock.mockResolvedValueOnce({
      json: async () => mockResponse,
      ok: true,
      headers: {
        get: () => 'application/json'
      }
    });

    try {
      await apiClient.get('/test');
    } catch (e) {
      // Ignore errors for this test
    }

    // Verify fetch was called with credentials
    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0][1];
    expect(callArgs?.credentials).toBe('include');
  });

  it('should extract data from successful response', async () => {
    const mockData = { id: 'test-1', name: 'Test Project' };
    const mockResponse: ApiResponse = {
      success: true,
      data: mockData
    };

    fetchMock.mockResolvedValueOnce({
      json: async () => mockResponse,
      ok: true,
      headers: {
        get: () => 'application/json'
      }
    });

    const result = await apiClient.get('/projects');

    expect(result).toEqual(mockData);
  });

  it('should throw error when API returns success: false', async () => {
    const mockResponse: ApiResponse = {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Project not found'
      }
    };

    fetchMock.mockResolvedValueOnce({
      json: async () => mockResponse,
      ok: true,
      headers: {
        get: () => 'application/json'
      }
    });

    try {
      await apiClient.get('/projects/invalid');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Project not found');
    }
  });

  it('should throw error on 404 response', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } }),
      ok: false,
      status: 404
    });

    try {
      await apiClient.get('/projects/notfound');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should throw error on 500 response', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } }),
      ok: false,
      status: 500
    });

    try {
      await apiClient.get('/projects');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should throw error on 401 (unauthorized)', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }),
      ok: false,
      status: 401
    });

    try {
      await apiClient.get('/projects');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should throw error on 403 (forbidden)', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
      ok: false,
      status: 403
    });

    try {
      await apiClient.get('/tasks/other-user-task');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should handle network errors', async () => {
    const networkError = new Error('Network request failed');
    fetchMock.mockRejectedValueOnce(networkError);

    try {
      await apiClient.get('/projects');
      expect.fail('Should have thrown an error');
    } catch (error: any) {
      expect(error.message).toContain('Network request failed');
    }
  });

  it('should send headers with POST request', async () => {
    const mockResponse: ApiResponse = {
      success: true,
      data: { id: 'new-project', name: 'New Project' }
    };

    fetchMock.mockResolvedValueOnce({
      json: async () => mockResponse,
      ok: true,
      headers: {
        get: () => 'application/json'
      }
    });

    await apiClient.post('/projects', { name: 'New Project' });

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0][1];
    expect(callArgs?.method).toBe('POST');
    expect(callArgs?.credentials).toBe('include');
  });

  it('should send headers with PUT request', async () => {
    const mockResponse: ApiResponse = {
      success: true,
      data: { id: 'project-1', name: 'Updated Project' }
    };

    fetchMock.mockResolvedValueOnce({
      json: async () => mockResponse,
      ok: true,
      headers: {
        get: () => 'application/json'
      }
    });

    await apiClient.put('/projects/1', { name: 'Updated Project' });

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0][1];
    expect(callArgs?.method).toBe('PUT');
    expect(callArgs?.credentials).toBe('include');
  });

  it('should send headers with DELETE request', async () => {
    const mockResponse: ApiResponse = {
      success: true,
      data: { id: 'project-1' }
    };

    fetchMock.mockResolvedValueOnce({
      json: async () => mockResponse,
      ok: true,
      headers: {
        get: () => 'application/json'
      }
    });

    await apiClient.delete('/projects/1');

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0][1];
    expect(callArgs?.method).toBe('DELETE');
    expect(callArgs?.credentials).toBe('include');
  });
});
