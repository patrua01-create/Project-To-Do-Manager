import { Task } from '../../types/index.js';
import styles from './TaskCard.module.css';

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: string) => void;
}

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueDateLabel = '';
  if (dueDate) {
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today && task.status !== 'DONE') {
      dueDateLabel = 'OVERDUE';
    } else if (dueDate.getTime() === today.getTime()) {
      dueDateLabel = 'TODAY';
    } else if (dueDate > today) {
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) {
        dueDateLabel = `${daysUntil}d`;
      } else {
        dueDateLabel = dueDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
      }
    }
  }

  const getNextStatus = (current: string): string => {
    const statuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    const currentIndex = statuses.indexOf(current);
    return statuses[(currentIndex + 1) % statuses.length];
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'TODO':
        return styles.statusTodo;
      case 'IN_PROGRESS':
        return styles.statusInProgress;
      case 'DONE':
        return styles.statusDone;
      default:
        return '';
    }
  };

  const getPriorityClass = (priority: string): string => {
    switch (priority) {
      case 'LOW':
        return styles.priorityLow;
      case 'MEDIUM':
        return styles.priorityMedium;
      case 'HIGH':
        return styles.priorityHigh;
      default:
        return styles.priorityLow;
    }
  };

  return (
    <div className={styles.card}>
      {/* Status Badge */}
      <div
        className={`${styles.statusBadge} ${getStatusClass(task.status)}`}
        onClick={() => onStatusChange(getNextStatus(task.status))}
        title="Click to change status"
      >
        {task.status === 'TODO'
          ? 'To Do'
          : task.status === 'IN_PROGRESS'
            ? 'In Progress'
            : 'Done'}
      </div>

      {/* Content */}
      <div className={styles.content}>
        <h3 className={styles.title}>
          {task.title}
        </h3>

        {task.description && (
          <p className={styles.description}>
            {task.description}
          </p>
        )}

        {/* Meta Information */}
        <div className={styles.meta}>
          {/* Priority */}
          <div className={`${styles.priority} ${getPriorityClass(task.priority)}`}>
            {task.priority}
          </div>

          {/* Due Date */}
          {dueDateLabel && (
            <div className={`${styles.dueDate} ${dueDateLabel === 'OVERDUE' ? styles.dueDateOverdue : styles.dueDateNormal}`}>
              {dueDateLabel}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={onEdit}
          className={styles.actionButton}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className={`${styles.actionButton} ${styles.actionButtonDelete}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
