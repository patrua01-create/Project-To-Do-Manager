import { useState } from 'react';
import { useProjects } from '../../hooks/useProjects.js';
import { ProjectForm } from './ProjectForm.js';
import styles from './ProjectList.module.css';

interface ProjectListProps {
  onProjectSelect?: () => void;
}

export function ProjectList({ onProjectSelect }: ProjectListProps) {
  const {
    projects,
    selectedProjectId,
    isLoading,
    error,
    selectProject,
    removeProject,
  } = useProjects();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSelectProject = (id: string) => {
    selectProject(id);
    onProjectSelect?.();
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProject(id);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (isLoading) {
    return <div className={styles.loadingText}>Loading projects...</div>;
  }

  if (error) {
    return <div className={styles.errorText}>Error: {error}</div>;
  }

  if (projects.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyMessage}>
          No projects yet
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className={styles.newProjectButton}
        >
          + New Project
        </button>
        {showCreateForm && (
          <ProjectForm mode="create" onClose={() => setShowCreateForm(false)} />
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.projectsList}>
        {projects.map((project) => (
          <div
            key={project.id}
            className={`${styles.projectItem} ${selectedProjectId === project.id ? styles.projectItemSelected : ''}`}
            onClick={() => handleSelectProject(project.id)}
          >
            <span className={styles.projectName}>
              {project.name}
            </span>
            <div className={styles.actionButtons}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingProjectId(project.id);
                }}
                className={styles.actionButton}
              >
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(project.id);
                }}
                className={`${styles.actionButton} ${styles.actionButtonDelete}`}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowCreateForm(true)}
        className={styles.newProjectButton}
      >
        + New Project
      </button>

      {/* Create Form Modal */}
      {showCreateForm && (
        <ProjectForm mode="create" onClose={() => setShowCreateForm(false)} />
      )}

      {/* Edit Form Modal */}
      {editingProjectId && (
        <ProjectForm
          mode="edit"
          projectId={editingProjectId}
          onClose={() => setEditingProjectId(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>
              Delete Project?
            </h2>
            <p className={styles.modalMessage}>
              This will delete the project and all its tasks. This action cannot be undone.
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className={`${styles.modalButton} ${styles.modalButtonDelete}`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
