import { useNotifications } from '../../context/NotificationContext.js';
import { acknowledgeNotification } from '../../services/websocket.js';
import styles from './NotificationPanel.module.css';

export function NotificationPanel() {
  const { notifications, dismissNotification } = useNotifications();

  const handleDismiss = (taskId: string) => {
    acknowledgeNotification(taskId);
    dismissNotification(taskId);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Notifications ({notifications.length})</h3>
      </div>
      <div className={styles.list}>
        {notifications.map((notification) => (
          <div
            key={notification.task_id}
            className={`${styles.item} ${styles[notification.type]}`}
          >
            <div className={styles.content}>
              <div className={styles.title}>{notification.title}</div>
              <div className={styles.type}>
                {notification.type === 'overdue' ? (
                  <span className={styles.badge}>Overdue</span>
                ) : (
                  <span className={styles.badge}>
                    Due in {notification.days_until} {notification.days_until === 1 ? 'day' : 'days'}
                  </span>
                )}
              </div>
              <div className={styles.date}>
                {new Date(notification.due_date).toLocaleDateString()}
              </div>
            </div>
            <button
              className={styles.dismiss}
              onClick={() => handleDismiss(notification.task_id)}
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
