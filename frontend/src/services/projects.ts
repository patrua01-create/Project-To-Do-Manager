import { Project } from '../types/index.js';
import { apiClient } from './api.js';

/**
 * List all projects for the authenticated user
 */
export async function listProjects(): Promise<Project[]> {
  return apiClient.get<Project[]>('/api/projects');
}

/**
 * Create a new project
 */
export async function createProject(name: string): Promise<Project> {
  if (!name || !name.trim()) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Project name is required',
    };
  }

  return apiClient.post<Project>('/api/projects', {
    name: name.trim(),
  });
}

/**
 * Update project name
 */
export async function updateProject(id: string, name: string): Promise<Project> {
  if (!name || !name.trim()) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Project name is required',
    };
  }

  return apiClient.put<Project>(`/api/projects/${id}`, {
    name: name.trim(),
  });
}

/**
 * Delete a project (cascade deletes all tasks)
 */
export async function deleteProject(id: string): Promise<void> {
  await apiClient.delete(`/api/projects/${id}`);
}
