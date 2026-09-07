import React, { createContext, useContext, useState, useCallback } from 'react';
import { Notification, NotificationBatch } from '../services/websocket.js';

interface NotificationContextType {
  notifications: Notification[];
  addNotifications: (batch: NotificationBatch) => void;
  dismissNotification: (taskId: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotifications = useCallback((batch: NotificationBatch) => {
    const newNotifications: Notification[] = [
      ...batch.overdue,
      ...batch.due_soon
    ];

    setNotifications((prev) => {
      // Avoid duplicates by task_id
      const taskIds = new Set(prev.map(n => n.task_id));
      const unique = newNotifications.filter(n => !taskIds.has(n.task_id));
      return [...prev, ...unique];
    });
  }, []);

  const dismissNotification = useCallback((taskId: string) => {
    setNotifications((prev) => prev.filter(n => n.task_id !== taskId));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    notifications,
    addNotifications,
    dismissNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
