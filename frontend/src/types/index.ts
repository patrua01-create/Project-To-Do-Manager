/**
 * Frontend Type Definitions
 * Single source of truth for all TypeScript interfaces used in the frontend
 */

// ============================================
// User & Authentication
// ============================================

export interface User {
  id: string;
  provider: 'google' | 'github';
  provider_user_id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Projects
// ============================================

export interface Project {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Tasks
// ============================================

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type DueDateFilter = 'OVERDUE' | 'TODAY' | 'NEXT_7_DAYS' | 'ALL';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  due_date?: string;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus | null;
  priority?: Priority | null;
  dueDateFilter?: DueDateFilter;
}

// ============================================
// API Response & Error
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}

// ============================================
// WebSocket Notifications
// ============================================

export interface NotificationOverdue {
  type: 'overdue';
  task_id: string;
  title: string;
  due_date: string;
}

export interface NotificationDueSoon {
  type: 'due_soon';
  task_id: string;
  title: string;
  days_until: number;
  due_date: string;
}

export type Notification = NotificationOverdue | NotificationDueSoon;

export interface NotificationBatch {
  overdue: NotificationOverdue[];
  due_soon: NotificationDueSoon[];
}
