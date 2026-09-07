import { Server as HTTPServer } from 'http';
import { createServer } from 'http';
import ioClient from 'socket.io-client';
import prisma from '../config/database.js';
import * as authService from '../services/auth.js';
import app from '../index.js';
import { initializeWebSocket } from '../config/websocket.js';
import { User } from '../types/index.js';

let httpServer: HTTPServer;
let client1: any;
let client2: any;
let user1: User;
let user2: User;
let user1Token: string;
let user2Token: string;
const BASE_URL = 'http://localhost:5001';

beforeAll(async () => {
  // Clean database
  await prisma.$executeRawUnsafe('DELETE FROM tasks');
  await prisma.$executeRawUnsafe('DELETE FROM projects');
  await prisma.$executeRawUnsafe('DELETE FROM users');

  // Create users
  user1 = await authService.upsertUserFromOAuthProfile('google', {
    id: `ws-google-user-1-${Date.now()}`,
    displayName: 'WebSocket User 1',
    emails: [{ value: `ws-user1-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user1.jpg' }]
  } as any);

  user2 = await authService.upsertUserFromOAuthProfile('google', {
    id: `ws-google-user-2-${Date.now()}`,
    displayName: 'WebSocket User 2',
    emails: [{ value: `ws-user2-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user2.jpg' }]
  } as any);

  user1Token = authService.generateJWT(user1);
  user2Token = authService.generateJWT(user2);

  // Create HTTP server with WebSocket
  httpServer = createServer(app);
  initializeWebSocket(httpServer, 'http://localhost:3000');

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(5001, () => {
      resolve();
    });
    httpServer.on('error', reject);
  });
});

afterAll(async () => {
  // Close all client connections
  if (client1?.connected) client1.disconnect();
  if (client2?.connected) client2.disconnect();

  // Close server
  await new Promise<void>((resolve, reject) => {
    httpServer.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Clean database
  await prisma.$executeRawUnsafe('DELETE FROM tasks');
  await prisma.$executeRawUnsafe('DELETE FROM projects');
  await prisma.$executeRawUnsafe('DELETE FROM users');
  await prisma.$disconnect();
});

describe('WebSocket Notifications', () => {
  describe('Authentication', () => {
    it('should reject connection without token', async () => {
      const client = ioClient(BASE_URL, {
        reconnection: false,
        extraHeaders: {}
      } as any);

      return new Promise<void>((resolve, reject) => {
        client.on('connect_error', (err: any) => {
          expect(err.message).toContain('UNAUTHORIZED');
          client.disconnect();
          resolve();
        });

        // Timeout if connect succeeds (should not happen)
        setTimeout(() => {
          client.disconnect();
          reject(new Error('Should have rejected without token'));
        }, 1000);
      });
    });

    it('should reject connection with invalid token', async () => {
      const client = ioClient(BASE_URL, {
        extraHeaders: {
          cookie: 'auth_token=invalid_token'
        },
        reconnection: false
      } as any);

      return new Promise<void>((resolve, reject) => {
        client.on('connect_error', (err: any) => {
          expect(err.message).toContain('UNAUTHORIZED');
          client.disconnect();
          resolve();
        });

        setTimeout(() => {
          client.disconnect();
          reject(new Error('Should have rejected invalid token'));
        }, 1000);
      });
    });

    it('should accept connection with valid token', async () => {
      client1 = ioClient(BASE_URL, {
        extraHeaders: {
          cookie: `auth_token=${user1Token}`
        },
        reconnection: false
      } as any);

      return new Promise<void>((resolve, reject) => {
        client1.on('connect', () => {
          expect(client1.connected).toBe(true);
          resolve();
        });

        client1.on('connect_error', (err: any) => {
          reject(err);
        });

        setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 2000);
      });
    });
  });

  describe('Initial Batch on Connect', () => {
    it('should send empty batch when user has no overdue/due soon tasks', async () => {
      client2 = ioClient(BASE_URL, {
        extraHeaders: {
          cookie: `auth_token=${user2Token}`
        },
        reconnection: false
      } as any);

      return new Promise<void>((resolve, reject) => {
        client2.on('notification_batch', (batch: Record<string, any>) => {
          expect(batch).toHaveProperty('overdue');
          expect(batch).toHaveProperty('due_soon');
          expect(Array.isArray(batch.overdue)).toBe(true);
          expect(Array.isArray(batch.due_soon)).toBe(true);
          expect((batch as any).overdue.length).toBe(0);
          expect((batch as any).due_soon.length).toBe(0);
          resolve();
        });

        client2.on('connect_error', reject);

        setTimeout(() => {
          reject(new Error('notification_batch timeout'));
        }, 2000);
      });
    });

    it('should send initial batch with overdue tasks', async () => {
      // Create project for user1
      const project = await prisma.project.create({
        data: { user_id: user1.id, name: 'Test Project' }
      });

      // Create overdue task
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await prisma.task.create({
        data: {
          project_id: project.id,
          title: 'Overdue Task',
          status: 'TODO',
          priority: 'HIGH',
          due_date: yesterday
        }
      });

      // Reconnect client1 to receive batch
      client1.disconnect();
      client1 = ioClient(BASE_URL, {
        extraHeaders: {
          cookie: `auth_token=${user1Token}`
        },
        reconnection: false
      } as any);

      return new Promise<void>((resolve, reject) => {
        client1.on('notification_batch', (batch: any) => {
          expect(batch.overdue.length).toBeGreaterThan(0);
          const overdueTask = batch.overdue[0];
          expect(overdueTask).toHaveProperty('task_id');
          expect(overdueTask).toHaveProperty('title');
          expect(overdueTask).toHaveProperty('due_date');
          expect(overdueTask.type).toBe('overdue');
          resolve();
        });

        client1.on('connect_error', reject);

        setTimeout(() => {
          reject(new Error('notification_batch timeout'));
        }, 2000);
      });
    });

    it('should send initial batch with due soon tasks', async () => {
      // Create project for user2
      const project = await prisma.project.create({
        data: { user_id: user2.id, name: 'Test Project 2' }
      });

      // Create due soon task (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await prisma.task.create({
        data: {
          project_id: project.id,
          title: 'Due Soon Task',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          due_date: tomorrow
        }
      });

      // Reconnect client2 to receive batch
      client2.disconnect();
      client2 = ioClient(BASE_URL, {
        extraHeaders: {
          cookie: `auth_token=${user2Token}`
        },
        reconnection: false
      } as any);

      return new Promise<void>((resolve, reject) => {
        client2.on('notification_batch', (batch: Record<string, any>) => {
          expect(batch.due_soon.length).toBeGreaterThan(0);
          const dueSoonTask = batch.due_soon[0];
          expect(dueSoonTask).toHaveProperty('task_id');
          expect(dueSoonTask).toHaveProperty('title');
          expect(dueSoonTask).toHaveProperty('days_until');
          expect(dueSoonTask).toHaveProperty('due_date');
          expect(dueSoonTask.type).toBe('due_soon');
          expect(dueSoonTask.days_until).toBeGreaterThan(0);
          resolve();
        });

        client2.on('connect_error', reject);

        setTimeout(() => {
          reject(new Error('notification_batch timeout'));
        }, 2000);
      });
    });
  });

  describe('Client Messages', () => {
    it('should accept subscribe message from client', async () => {
      return new Promise<void>((resolve, reject) => {
        client1.emit('subscribe', { interval: 5 }, (response: any) => {
          expect(response.status).toBe('subscribed');
          resolve();
        });

        setTimeout(() => {
          reject(new Error('Subscribe callback timeout'));
        }, 1000);
      });
    });

    it('should accept ack_notification message from client', async () => {
      // Create a task to get a task_id
      const project = await prisma.project.findFirst({
        where: { user_id: user1.id }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      const task = await prisma.task.findFirst({
        where: { project_id: project.id }
      });

      if (!task) {
        throw new Error('Task not found');
      }

      return new Promise<void>((resolve, reject) => {
        client1.emit('ack_notification', { task_id: task.id }, (response: any) => {
          expect(response.status).toBe('acknowledged');
          resolve();
        });

        setTimeout(() => {
          reject(new Error('Ack callback timeout'));
        }, 1000);
      });
    });
  });

  describe('Data Isolation', () => {
    it('should only send notifications for user own tasks', async () => {
      // User1 has overdue task from earlier
      // User2 should not see it

      const user2Batch = await new Promise<any>((resolve, reject) => {
        const tempClient = ioClient(BASE_URL, {
          extraHeaders: {
            cookie: `auth_token=${user2Token}`
          },
          reconnection: false
        } as any);

        tempClient.on('notification_batch', (batch: any) => {
          tempClient.disconnect();
          resolve(batch);
        });

        tempClient.on('connect_error', reject);

        setTimeout(() => {
          tempClient.disconnect();
          reject(new Error('notification_batch timeout'));
        }, 2000);
      });

      // User2 should not have user1's overdue task
      const hasUser1Task = user2Batch.overdue.some((task: any) =>
        task.title === 'Overdue Task'
      );
      expect(hasUser1Task).toBe(false);
    });
  });
});
