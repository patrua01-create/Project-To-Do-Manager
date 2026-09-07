import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Project } from '../types/index.js';
import { listProjects, createProject, updateProject, deleteProject } from '../services/projects.js';
import { useAuth } from './AuthContext.js';

interface ProjectsContextType {
  projects: Project[];
  selectedProjectId: string | null;
  selectedProject: Project | null;
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createNewProject: (name: string) => Promise<Project>;
  renameProject: (id: string, name: string) => Promise<Project>;
  removeProject: (id: string) => Promise<void>;
  selectProject: (id: string | null) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await listProjects();
      setProjects(data);

      // Auto-select first project if none selected
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMsg);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedProjectId]);

  // Load projects when user authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
    } else {
      setProjects([]);
      setSelectedProjectId(null);
    }
  }, [isAuthenticated, loadProjects]);

  const createNewProject = useCallback(
    async (name: string): Promise<Project> => {
      try {
        setError(null);
        const newProject = await createProject(name);

        // Optimistic update
        setProjects((prev) => [...prev, newProject]);

        // Auto-select new project
        setSelectedProjectId(newProject.id);

        return newProject;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create project';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const renameProject = useCallback(
    async (id: string, name: string): Promise<Project> => {
      try {
        setError(null);

        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  name,
                  updated_at: new Date().toISOString(),
                }
              : p
          )
        );

        const updated = await updateProject(id, name);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));

        return updated;
      } catch (err) {
        // Rollback optimistic update
        await loadProjects();

        const errorMsg = err instanceof Error ? err.message : 'Failed to rename project';
        setError(errorMsg);
        throw err;
      }
    },
    [projects, loadProjects]
  );

  const removeProject = useCallback(
    async (id: string) => {
      try {
        setError(null);

        setProjects((prev) => prev.filter((p) => p.id !== id));

        // Clear selection if deleting selected project
        if (selectedProjectId === id) {
          setSelectedProjectId(projects.find((p) => p.id !== id)?.id ?? null);
        }

        await deleteProject(id);
      } catch (err) {
        // Rollback optimistic update
        setProjects(projects);

        const errorMsg = err instanceof Error ? err.message : 'Failed to delete project';
        setError(errorMsg);
        throw err;
      }
    },
    [projects, selectedProjectId]
  );

  const selectProject = useCallback((id: string | null) => {
    setSelectedProjectId(id);
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  const value: ProjectsContextType = {
    projects,
    selectedProjectId,
    selectedProject,
    isLoading,
    error,
    loadProjects,
    createNewProject,
    renameProject,
    removeProject,
    selectProject,
  };

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsContextType {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectsProvider');
  }
  return context;
}
