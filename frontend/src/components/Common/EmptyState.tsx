import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>
        📋
      </div>
      <h2 className={styles.title}>
        {title}
      </h2>
      <p className={styles.message}>
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={styles.actionButton}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
