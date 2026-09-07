import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({ message = 'Loading...', fullScreen = false }: LoadingSpinnerProps) {
  const content = (
    <>
      <div className={styles.spinner} />
      <p className={styles.message}>{message}</p>
    </>
  );

  if (fullScreen) {
    return (
      <div className={styles.fullScreenContainer}>
        {content}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {content}
    </div>
  );
}
