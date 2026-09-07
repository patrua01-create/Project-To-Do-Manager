import { useTasks as useTasksContext } from '../context/TasksContext.js';

/**
 * Convenience hook for consuming TasksContext
 * Wraps useContext to provide easier access to tasks state and methods
 */
export function useTasks() {
  return useTasksContext();
}
