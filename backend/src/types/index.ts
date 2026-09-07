export interface User {
  id: string;
  provider: 'google' | 'github' | string;
  provider_user_id: string;
  email: string;
  display_name: string;
  avatar_url?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus | string;
  priority: TaskPriority | string;
  due_date?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  user_id: string;
  email: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest {
  user_id: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
