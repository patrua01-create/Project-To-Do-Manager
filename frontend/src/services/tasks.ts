import { Task, CreateTaskInput, TaskFilters } from '../types/index.js';
import { apiClient } from './api.js';

/**
 * List tasks for a specific project with optional filters
 */
export async function listTasks(projectId: string | null, filters?: TaskFilters): Promise<Task[]> {
  if (!projectId) {
    return [];
  }

  const params: Record<string, any> = {
    projectId,
  };

  if (filters?.search) {
    params.search = filters.search;
  }
  if (filters?.status) {
    params.status = filters.status;
  }
  if (filters?.priority) {
    params.priority = filters.priority;
  }
  if (filters?.dueDateFilter) {
    params.dueDateFilter = filters.dueDateFilter;
  }

  return apiClient.get<Task[]>('/api/tasks', params);
}

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  if (!input.title || !input.title.trim()) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Task title is required',
    };
  }

  if (!input.project_id) {
    throw {
      code: 'VALIDATION_ERROR',
      message: 'Project ID is required',
    };
  }

  return apiClient.post<Task>('/api/tasks', {
    project_id: input.project_id,
    title: input.title.trim(),
    description: input.description?.trim(),
    status: input.status || 'TODO',
    priority: input.priority || 'LOW',
    due_date: input.due_date,
  });
}

/**
 * Update a task
 */
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const body: Record<string, any> = {};

  if (updates.title !== undefined) {
    if (!updates.title.trim()) {
      throw {
        code: 'VALIDATION_ERROR',
        message: 'Task title is required',
      };
    }
    body.title = updates.title.trim();
  }

  if (updates.description !== undefined) {
    body.description = updates.description?.trim();
  }

  if (updates.status !== undefined) {
    body.status = updates.status;
  }

  if (updates.priority !== undefined) {
    body.priority = updates.priority;
  }

  if (updates.due_date !== undefined) {
    body.due_date = updates.due_date;
  }

  return apiClient.put<Task>(`/api/tasks/${id}`, body);
}

/**
 * Update only the task status (quick change)
 */
export async function updateTaskStatus(id: string, status: string): Promise<Task> {
  return apiClient.patch<Task>(`/api/tasks/${id}/status`, {
    status,
  });
}

/**
 * Delete a task
 */
export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(`/api/tasks/${id}`);
}
