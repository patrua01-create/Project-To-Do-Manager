import { useState, useEffect } from 'react';
import { Task, CreateTaskInput, TaskStatus, Priority } from '../../types/index.js';
import { useTasks } from '../../hooks/useTasks.js';
import styles from './TaskForm.module.css';

interface TaskFormProps {
  mode: 'create' | 'edit';
  projectId?: string;
  taskId?: string;
  onClose: () => void;
}

export function TaskForm({ mode, projectId, taskId, onClose }: TaskFormProps) {
  const { tasks, createNewTask, updateExistingTask } = useTasks();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<Priority>('LOW');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        setTitle(task.title);
        setDescription(task.description || '');
        setStatus(task.status);
        setPriority(task.priority);
        setDueDate(task.due_date || '');
      }
    }
  }, [mode, taskId, tasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'create' && projectId) {
        await createNewTask({
          project_id: projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          due_date: dueDate || undefined,
        } as CreateTaskInput);
      } else if (mode === 'edit' && taskId) {
        await updateExistingTask(taskId, {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          due_date: dueDate || undefined,
        } as Partial<Task>);
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
          {mode === 'create' ? 'Create Task' : 'Edit Task'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className={styles.formGroup}>
            <label htmlFor="taskTitle" className={styles.label}>
              Title *
            </label>
            <input
              id="taskTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              disabled={loading}
              autoFocus
              className={styles.input}
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label htmlFor="taskDescription" className={styles.label}>
              Description
            </label>
            <textarea
              id="taskDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              disabled={loading}
              className={styles.textarea}
            />
          </div>

          {/* Status */}
          <div className={styles.formGroup}>
            <label htmlFor="taskStatus" className={styles.label}>
              Status
            </label>
            <select
              id="taskStatus"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              disabled={loading}
              className={styles.select}
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>

          {/* Priority */}
          <div className={styles.formGroup}>
            <label htmlFor="taskPriority" className={styles.label}>
              Priority
            </label>
            <select
              id="taskPriority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              disabled={loading}
              className={styles.select}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          {/* Due Date */}
          <div className={styles.formGroup}>
            <label htmlFor="taskDueDate" className={styles.label}>
              Due Date
            </label>
            <input
              id="taskDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
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
              {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
