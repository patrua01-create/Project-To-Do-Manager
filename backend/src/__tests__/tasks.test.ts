import request from 'supertest';
import prisma from '../config/database.js';
import * as authService from '../services/auth.js';
import app from '../index.js';
import { User } from '../types/index.js';

let user1: User;
let user2: User;
let user1Token: string;
let user2Token: string;
let project1: string;
let project2: string;
let task1: string;
let task2: string;

beforeAll(async () => {
  user1 = await authService.upsertUserFromOAuthProfile('google', {
    id: `tasks-google-user-1-${Date.now()}`,
    displayName: 'Tasks User 1',
    emails: [{ value: `tasks-user1-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user1.jpg' }]
  } as any);

  user2 = await authService.upsertUserFromOAuthProfile('google', {
    id: `tasks-google-user-2-${Date.now()}`,
    displayName: 'Tasks User 2',
    emails: [{ value: `tasks-user2-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user2.jpg' }]
  } as any);

  user1Token = authService.generateJWT(user1);
  user2Token = authService.generateJWT(user2);

  const proj1 = await prisma.project.create({
    data: { user_id: user1.id, name: 'Project 1' }
  });
  project1 = proj1.id;

  const proj2 = await prisma.project.create({
    data: { user_id: user2.id, name: 'Project 2' }
  });
  project2 = proj2.id;
});


describe('Task CRUD Operations', () => {
  describe('POST /api/tasks', () => {
    it('should create a task with all fields', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: project1,
          title: 'My First Task',
          description: 'Task description',
          status: 'TODO',
          priority: 'HIGH',
          due_date: tomorrow.toISOString()
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('My First Task');
      expect(res.body.data.description).toBe('Task description');
      expect(res.body.data.status).toBe('TODO');
      expect(res.body.data.priority).toBe('HIGH');
      expect(res.body.data.project_id).toBe(project1);

      task1 = res.body.data.id;
    });

    it('should create task with minimal fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: project1,
          title: 'Minimal Task',
          status: 'TODO',
          priority: 'LOW'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Minimal Task');
      expect(res.body.data.description).toBeNull();
      expect(res.body.data.due_date).toBeNull();

      task2 = res.body.data.id;
    });

    it('should reject task without auth token', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({
          project_id: project1,
          title: 'Unauthorized Task',
          status: 'TODO',
          priority: 'LOW'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject task with empty title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: project1,
          title: '',
          status: 'TODO',
          priority: 'LOW'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('title');
    });

    it('should reject task with invalid status', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: project1,
          title: 'Task',
          status: 'INVALID_STATUS',
          priority: 'LOW'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('status');
    });

    it('should reject task with invalid priority', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: project1,
          title: 'Task',
          status: 'TODO',
          priority: 'INVALID_PRIORITY'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('priority');
    });

    it('should reject task in another users project', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: project2,
          title: 'Unauthorized Task',
          status: 'TODO',
          priority: 'LOW'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('unauthorized');
    });

    it('should reject task with non-existent project', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: 'non-existent-project',
          title: 'Task',
          status: 'TODO',
          priority: 'LOW'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should trim whitespace from title and description', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: project1,
          title: '  Task Title  ',
          description: '  Task description  ',
          status: 'TODO',
          priority: 'LOW'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.title).toBe('Task Title');
      expect(res.body.data.description).toBe('Task description');
    });
  });

  describe('GET /api/tasks', () => {
    beforeAll(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 5);

      await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Overdue Task',
          status: 'TODO',
          priority: 'HIGH',
          due_date: yesterday
        }
      });

      await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Today Task',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          due_date: today
        }
      });

      await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Next Week Task',
          status: 'TODO',
          priority: 'LOW',
          due_date: nextWeek
        }
      });

      await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Completed Overdue',
          status: 'DONE',
          priority: 'HIGH',
          due_date: yesterday
        }
      });
    });

    it('should list all tasks for project', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/tasks');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('user should only see their own projects tasks', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      const projectIds = res.body.data.map((t: any) => t.project_id);
      expect(projectIds).not.toContain(project2);
      expect(projectIds.every((pid: string) => pid === project1)).toBe(true);
    });
  });

  describe('Search and Filters', () => {
    it('should filter tasks by status TODO', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&status=TODO`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.status === 'TODO')).toBe(true);
    });

    it('should filter tasks by status IN_PROGRESS', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&status=IN_PROGRESS`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.status === 'IN_PROGRESS')).toBe(true);
    });

    it('should filter tasks by status DONE', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&status=DONE`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.status === 'DONE')).toBe(true);
    });

    it('should filter tasks by priority HIGH', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&priority=HIGH`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.priority === 'HIGH')).toBe(true);
    });

    it('should filter tasks by priority MEDIUM', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&priority=MEDIUM`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.priority === 'MEDIUM')).toBe(true);
    });

    it('should filter tasks by priority LOW', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&priority=LOW`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.priority === 'LOW')).toBe(true);
    });

    it('should filter tasks overdue', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&dueDateFilter=overdue`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(res.body.data.every((t: any) => t.due_date && new Date(t.due_date) < today)).toBe(true);
    });

    it('should filter tasks due today', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&dueDateFilter=today`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(
        res.body.data.every((t: any) => {
          const dueDate = new Date(t.due_date);
          return dueDate >= today && dueDate < tomorrow;
        })
      ).toBe(true);
    });

    it('should filter tasks due in next 7 days', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&dueDateFilter=next7`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      expect(
        res.body.data.every((t: any) => {
          const dueDate = new Date(t.due_date);
          return dueDate >= today && dueDate < nextWeek;
        })
      ).toBe(true);
    });

    it('should search tasks by title (case-insensitive)', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&search=task`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((t: any) => t.title.toLowerCase().includes('task'))).toBe(true);
    });

    it('should search tasks by description', async () => {
      await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Search Test',
          description: 'Special description keyword',
          status: 'TODO',
          priority: 'LOW'
        }
      });

      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&search=keyword`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(
        res.body.data.some((t: any) => t.title.includes('Search Test'))
      ).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${project1}&status=TODO&priority=HIGH`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((t: any) => t.status === 'TODO' && t.priority === 'HIGH')).toBe(true);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let taskToUpdate: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Task to Update',
          status: 'TODO',
          priority: 'LOW'
        }
      });
      taskToUpdate = task.id;
    });

    it('should update task title', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should update task description', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated description');
    });

    it('should update task status', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('should update task priority', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ priority: 'HIGH' });

      expect(res.status).toBe(200);
      expect(res.body.data.priority).toBe('HIGH');
    });

    it('should update task due_date', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ due_date: tomorrow.toISOString() });

      expect(res.status).toBe(200);
      expect(res.body.data.due_date).not.toBeNull();
    });

    it('should reject update with invalid status', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ status: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject update with empty title', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ title: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject update from different user', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .set('Cookie', `auth_token=${user2Token}`)
        .send({ title: 'Unauthorized Update' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject update without auth token', async () => {
      const res = await request(app)
        .put(`/api/tasks/${taskToUpdate}`)
        .send({ title: 'Unauthorized' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/tasks/:id/status', () => {
    let taskForStatus: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Status Change Task',
          status: 'TODO',
          priority: 'LOW'
        }
      });
      taskForStatus = task.id;
    });

    it('should change status to IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskForStatus}/status`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('should change status to DONE', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskForStatus}/status`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ status: 'DONE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('DONE');
    });

    it('should change status back to TODO', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskForStatus}/status`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ status: 'TODO' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('TODO');
    });

    it('should reject invalid status', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskForStatus}/status`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ status: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject from different user', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskForStatus}/status`)
        .set('Cookie', `auth_token=${user2Token}`)
        .send({ status: 'DONE' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject without auth token', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskForStatus}/status`)
        .send({ status: 'DONE' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let taskToDelete: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Task to Delete',
          status: 'TODO',
          priority: 'LOW'
        }
      });
      taskToDelete = task.id;
    });

    it('should delete task for owner', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${taskToDelete}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(taskToDelete);

      const deleted = await prisma.task.findUnique({
        where: { id: taskToDelete }
      });
      expect(deleted).toBeNull();
    });

    it('should reject delete without auth token', async () => {
      const task = await prisma.task.create({
        data: {
          project_id: project1,
          title: 'Another Task',
          status: 'TODO',
          priority: 'LOW'
        }
      });

      const res = await request(app).delete(`/api/tasks/${task.id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);

      // Clean up
      await prisma.task.delete({ where: { id: task.id } });
    });

    it('should reject delete from different user', async () => {
      const task = await prisma.task.create({
        data: {
          project_id: project1,
          title: 'User 1 Task',
          status: 'TODO',
          priority: 'LOW'
        }
      });

      const res = await request(app)
        .delete(`/api/tasks/${task.id}`)
        .set('Cookie', `auth_token=${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Verify task still exists
      const stillExists = await prisma.task.findUnique({
        where: { id: task.id }
      });
      expect(stillExists).not.toBeNull();

      // Clean up
      await prisma.task.delete({ where: { id: task.id } });
    });
  });
});
