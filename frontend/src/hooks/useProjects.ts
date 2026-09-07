import { useProjects as useProjectsContext } from '../context/ProjectsContext.js';

/**
 * Convenience hook for consuming ProjectsContext
 * Wraps useContext to provide easier access to projects state and methods
 */
export function useProjects() {
  return useProjectsContext();
}
