import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { Task, CreateTaskInput, TaskFilters } from '../types/index.js';
import {
  listTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from '../services/tasks.js';
import { useAuth } from './AuthContext.js';
import { useProjects } from './ProjectsContext.js';

interface TasksContextType {
  tasks: Task[];
  filteredTasks: Task[];
  filters: TaskFilters;
  isLoading: boolean;
  error: string | null;

  // Filter operations
  setSearch: (search: string) => void;
  setStatus: (status: string | null) => void;
  setPriority: (priority: string | null) => void;
  setDueDateFilter: (filter: string) => void;
  clearFilters: () => void;

  // CRUD operations
  loadTasks: () => Promise<void>;
  createNewTask: (input: CreateTaskInput) => Promise<Task>;
  updateExistingTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  changeTaskStatus: (id: string, status: string) => Promise<Task>;
  removeTask: (id: string) => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

// Debounce timer for search
let searchDebounceTimer: ReturnType<typeof setTimeout>;

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { selectedProject } = useProjects();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    status: null,
    priority: null,
    dueDateFilter: 'ALL',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descMatch = task.description?.toLowerCase().includes(searchLower);
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      // Status filter
      if (filters.status && task.status !== filters.status) {
        return false;
      }

      // Priority filter
      if (filters.priority && task.priority !== filters.priority) {
        return false;
      }

      // Due date filter
      if (filters.dueDateFilter && filters.dueDateFilter !== 'ALL') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!task.due_date) {
          // Tasks without due dates don't match any date filter except ALL
          return false;
        }

        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);

        switch (filters.dueDateFilter) {
          case 'OVERDUE':
            if (task.status !== 'DONE' && dueDate < today) {
              return true;
            }
            return false;

          case 'TODAY':
            return dueDate.getTime() === today.getTime() && task.status !== 'DONE';

          case 'NEXT_7_DAYS':
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            return (
              dueDate >= today && dueDate <= nextWeek && task.status !== 'DONE'
            );

          default:
            return true;
        }
      }

      return true;
    });
  }, [tasks, filters]);

  const loadTasks = useCallback(async () => {
    if (!isAuthenticated || !selectedProject) {
      setTasks([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await listTasks(selectedProject.id, filters);
      setTasks(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMsg);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedProject, filters]);

  // Load tasks when project selected or filters change
  useEffect(() => {
    if (isAuthenticated && selectedProject) {
      loadTasks();
    } else {
      setTasks([]);
    }
  }, [isAuthenticated, selectedProject, filters, loadTasks]);

  const setSearch = useCallback((search: string) => {
    // Debounce search to avoid too many API calls
    clearTimeout(searchDebounceTimer);

    setFilters((prev) => ({
      ...prev,
      search,
    }));

    searchDebounceTimer = setTimeout(() => {
      // Debounce effect - search is already set above
    }, 500);
  }, []);

  const setStatus = useCallback((status: string | null) => {
    setFilters((prev) => ({
      ...prev,
      status: status as any,
    }));
  }, []);

  const setPriority = useCallback((priority: string | null) => {
    setFilters((prev) => ({
      ...prev,
      priority: priority as any,
    }));
  }, []);

  const setDueDateFilter = useCallback((filter: string) => {
    setFilters((prev) => ({
      ...prev,
      dueDateFilter: filter as any,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: null,
      priority: null,
      dueDateFilter: 'ALL',
    });
  }, []);

  const createNewTask = useCallback(
    async (input: CreateTaskInput): Promise<Task> => {
      try {
        setError(null);
        const newTask = await createTask(input);

        // Optimistic update
        setTasks((prev) => [...prev, newTask]);

        return newTask;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create task';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const updateExistingTask = useCallback(
    async (id: string, updates: Partial<Task>): Promise<Task> => {
      try {
        setError(null);

        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...updates,
                  updated_at: new Date().toISOString(),
                }
              : t
          )
        );

        const updated = await updateTask(id, updates);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

        return updated;
      } catch (err) {
        // Rollback optimistic update
        await loadTasks();

        const errorMsg = err instanceof Error ? err.message : 'Failed to update task';
        setError(errorMsg);
        throw err;
      }
    },
    [tasks, loadTasks]
  );

  const changeTaskStatus = useCallback(
    async (id: string, status: string): Promise<Task> => {
      try {
        setError(null);

        // Optimistic update
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: status as any,
                  updated_at: new Date().toISOString(),
                }
              : t
          )
        );

        const updated = await updateTaskStatus(id, status);
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));

        return updated;
      } catch (err) {
        // Rollback optimistic update
        await loadTasks();

        const errorMsg =
          err instanceof Error ? err.message : 'Failed to update task status';
        setError(errorMsg);
        throw err;
      }
    },
    [loadTasks]
  );

  const removeTask = useCallback(
    async (id: string) => {
      try {
        setError(null);

        setTasks((prev) => prev.filter((t) => t.id !== id));

        await deleteTask(id);
      } catch (err) {
        // Rollback optimistic update
        setTasks(tasks);

        const errorMsg = err instanceof Error ? err.message : 'Failed to delete task';
        setError(errorMsg);
        throw err;
      }
    },
    [tasks]
  );

  const value: TasksContextType = {
    tasks,
    filteredTasks,
    filters,
    isLoading,
    error,
    setSearch,
    setStatus,
    setPriority,
    setDueDateFilter,
    clearFilters,
    loadTasks,
    createNewTask,
    updateExistingTask,
    changeTaskStatus,
    removeTask,
  };

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextType {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within TasksProvider');
  }
  return context;
}
