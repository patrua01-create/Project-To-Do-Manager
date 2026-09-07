import { useState } from 'react';
import { useTasks } from '../../hooks/useTasks.js';
import { useProjects } from '../../hooks/useProjects.js';
import { TaskCard } from './TaskCard.js';
import { TaskForm } from './TaskForm.js';
import { TaskSearch } from './TaskSearch.js';
import { FilterBar } from './FilterBar.js';
import { LoadingSpinner } from '../Common/LoadingSpinner.js';
import { EmptyState } from '../Common/EmptyState.js';
import styles from './TaskList.module.css';

export function TaskList() {
  const { selectedProject } = useProjects();
  const {
    filteredTasks,
    filters,
    isLoading,
    error,
    setSearch,
    setStatus,
    setPriority,
    setDueDateFilter,
    removeTask,
    changeTaskStatus,
  } = useTasks();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  if (!selectedProject) {
    return (
      <EmptyState
        title="No Project Selected"
        message="Select a project from the sidebar to view and manage its tasks"
      />
    );
  }

  if (isLoading) {
    return <LoadingSpinner message="Loading tasks..." />;
  }

  if (error) {
    return (
      <div className={styles.errorMessage}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          {selectedProject.name}
        </h2>
        <p className={styles.subtitle}>
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search and Filters */}
      <div className={styles.filtersSection}>
        <TaskSearch value={filters.search || ''} onChange={setSearch} />
        <FilterBar
          status={(filters.status as string | null) ?? null}
          onStatusChange={setStatus}
          priority={(filters.priority as string | null) ?? null}
          onPriorityChange={setPriority}
          dueDateFilter={filters.dueDateFilter || 'ALL'}
          onDueDateFilterChange={setDueDateFilter}
        />
      </div>

      {/* Create Button */}
      <button
        onClick={() => setShowCreateForm(true)}
        className={styles.createButton}
      >
        + New Task
      </button>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No Tasks"
          message={
            filters.search || filters.status || filters.priority || filters.dueDateFilter !== 'ALL'
              ? 'No tasks match the current filters'
              : `No tasks in ${selectedProject.name} yet`
          }
          actionLabel={
            !filters.search && !filters.status && !filters.priority && filters.dueDateFilter === 'ALL'
              ? 'Create a Task'
              : undefined
          }
          onAction={() => setShowCreateForm(true)}
        />
      ) : (
        <div className={styles.taskGrid}>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => setEditingTaskId(task.id)}
              onDelete={() => removeTask(task.id)}
              onStatusChange={(status) => changeTaskStatus(task.id, status)}
            />
          ))}
        </div>
      )}

      {/* Create Task Form */}
      {showCreateForm && (
        <TaskForm
          mode="create"
          projectId={selectedProject.id}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Edit Task Form */}
      {editingTaskId && (
        <TaskForm mode="edit" taskId={editingTaskId} onClose={() => setEditingTaskId(null)} />
      )}
    </div>
  );
}
