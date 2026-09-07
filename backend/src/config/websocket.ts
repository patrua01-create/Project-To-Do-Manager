import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyJWTToken, extractJWTFromCookie } from '../utils/jwt.js';
import { getNotificationsForUser } from '../services/notifications.js';

const NOTIFICATION_INTERVAL_MS = parseInt(process.env.NOTIFICATION_INTERVAL_MS || '300000', 10); // 5 minutes

interface SocketData {
  user_id: string;
}

export function initializeWebSocket(server: HTTPServer, corsOrigin: string): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin,
      credentials: true
    }
  });

  // Middleware: authenticate via cookie-based JWT
  io.use((socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      const token = extractJWTFromCookie(cookieHeader);

      if (!token) {
        return next(new Error('UNAUTHORIZED: No authentication token'));
      }

      const payload = verifyJWTToken(token);
      (socket.data as SocketData).user_id = payload.user_id;
      next();
    } catch (err: any) {
      next(new Error(`UNAUTHORIZED: ${err.message}`));
    }
  });

  // Connection handler
  io.on('connection', async (socket: Socket<any, any, SocketData>) => {
    const userId = (socket.data as SocketData).user_id;

    // Join user-specific room for targeted notifications
    socket.join(`user:${userId}`);

    try {
      // Send initial notification batch on connect
      const batch = await getNotificationsForUser(userId);
      socket.emit('notification_batch', batch);
    } catch (err) {
      console.error('Error fetching initial notifications:', err);
    }

    // Handle subscribe message
    socket.on('subscribe', (data: any, callback?: Function) => {
      // Optional: store client preferences (interval, notification types)
      // For now, just acknowledge
      if (callback) {
        callback({ status: 'subscribed' });
      }
    });

    // Handle acknowledge message
    socket.on('ack_notification', (data: { task_id: string }, callback?: Function) => {
      // Optional: track acknowledged notifications to avoid resending
      if (callback) {
        callback({ status: 'acknowledged' });
      }
    });

    socket.on('disconnect', () => {
      // User's room cleanup happens automatically
    });
  });

  // Periodic check for notifications
  startPeriodicNotificationCheck(io);

  return io;
}

function startPeriodicNotificationCheck(io: SocketIOServer) {
  setInterval(async () => {
    try {
      // Get all connected clients
      const sockets = await io.fetchSockets();
      const userIds = new Set(
        sockets.map(socket => (socket.data as SocketData).user_id)
      );

      // For each connected user, check and send new notifications
      for (const userId of userIds) {
        try {
          const batch = await getNotificationsForUser(userId);

          // Only emit if there are notifications
          if (batch.overdue.length > 0 || batch.due_soon.length > 0) {
            io.to(`user:${userId}`).emit('notification_batch', batch);
          }
        } catch (err) {
          console.error(`Error checking notifications for user ${userId}:`, err);
        }
      }
    } catch (err) {
      console.error('Error in periodic notification check:', err);
    }
  }, NOTIFICATION_INTERVAL_MS);
}
