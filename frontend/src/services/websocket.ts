import io, { Socket } from 'socket.io-client';

const WEBSOCKET_URL = (import.meta.env?.VITE_API_URL as string) || 'http://localhost:5000';

let socket: Socket | null = null;

export interface NotificationOverdue {
  type: 'overdue';
  task_id: string;
  title: string;
  due_date: string;
}

export interface NotificationDueSoon {
  type: 'due_soon';
  task_id: string;
  title: string;
  days_until: number;
  due_date: string;
}

export type Notification = NotificationOverdue | NotificationDueSoon;

export interface NotificationBatch {
  overdue: NotificationOverdue[];
  due_soon: NotificationDueSoon[];
}

export function connectWebSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (socket?.connected) {
      resolve(socket);
      return;
    }

    socket = io(WEBSOCKET_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✓ WebSocket connected');
      // Send subscribe message
      socket?.emit('subscribe', {}, (response: any) => {
        console.log('✓ Subscribed to notifications:', response);
      });
      resolve(socket!);
    });

    socket.on('connect_error', (err: any) => {
      console.error('WebSocket connection error:', err);
      reject(err);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectWebSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}

export function onNotificationBatch(callback: (batch: NotificationBatch) => void): void {
  if (socket) {
    socket.on('notification_batch', callback);
  }
}

export function onNotificationOverdue(callback: (notification: NotificationOverdue) => void): void {
  if (socket) {
    socket.on('task_overdue', callback);
  }
}

export function onNotificationDueSoon(callback: (notification: NotificationDueSoon) => void): void {
  if (socket) {
    socket.on('task_due_soon', callback);
  }
}

export function acknowledgeNotification(taskId: string): void {
  if (socket?.connected) {
    socket.emit('ack_notification', { task_id: taskId }, (response: any) => {
      console.log('✓ Notification acknowledged:', response);
    });
  }
}

export function removeNotificationListener(event: string): void {
  if (socket) {
    socket.off(event);
  }
}
