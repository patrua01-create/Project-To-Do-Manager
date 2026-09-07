import { useEffect, useState } from 'react';
import {
  connectWebSocket,
  onNotificationBatch,
  getSocket,
  removeNotificationListener
} from '../services/websocket.js';
import { useNotifications } from '../context/NotificationContext.js';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { addNotifications } = useNotifications();

  useEffect(() => {
    const initializeWebSocket = async () => {
      try {
        const socket = await connectWebSocket();
        setConnected(true);
        setError(null);

        // Set up notification listener
        onNotificationBatch((batch) => {
          addNotifications(batch);
        });

        // Listen for disconnect
        socket.on('disconnect', () => {
          setConnected(false);
        });

        // Listen for reconnect
        socket.on('connect', () => {
          setConnected(true);
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error('WebSocket connection failed');
        setError(error);
        console.error('Failed to connect WebSocket:', error);
      }
    };

    initializeWebSocket();

    return () => {
      removeNotificationListener('notification_batch');
    };
  }, [addNotifications]);

  return {
    connected,
    error,
    socket: getSocket()
  };
}
