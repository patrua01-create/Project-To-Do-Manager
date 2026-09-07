import { useState, useEffect } from 'react';
import { useProjects } from '../../hooks/useProjects.js';
import styles from './ProjectForm.module.css';

interface ProjectFormProps {
  mode: 'create' | 'edit';
  projectId?: string;
  onClose: () => void;
}

export function ProjectForm({ mode, projectId, onClose }: ProjectFormProps) {
  const { projects, createNewProject, renameProject } = useProjects();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && projectId) {
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setName(project.name);
      }
    }
  }, [mode, projectId, projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'create') {
        await createNewProject(name.trim());
      } else if (mode === 'edit' && projectId) {
        await renameProject(projectId, name.trim());
      }
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Operation failed';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>
          {mode === 'create' ? 'Create Project' : 'Rename Project'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label
              htmlFor="projectName"
              className={styles.label}
            >
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              disabled={loading}
              autoFocus
              className={styles.input}
            />
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <div className={styles.formButtons}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`${styles.button} ${styles.buttonCancel}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`${styles.button} ${styles.buttonSubmit}`}
            >
              {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
