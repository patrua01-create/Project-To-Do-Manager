import request from 'supertest';
import prisma from '../config/database.js';
import * as authService from '../services/auth.js';
import app from '../index.js';
import { User } from '../types/index.js';

/**
 * Test 2: Task-Project Isolation
 * Verifies that tasks are correctly isolated by project and user
 * - listProjectTasks(projectId) returns only tasks from that project
 * - Tasks from Project A never appear in Project B
 * - Cross-user task leakage is impossible
 */

let user1: User;
let user2: User;
let user1Token: string;
let user2Token: string;
let projectA: string;
let projectB: string;
let projectC: string;
let taskA1: string;
let taskA2: string;
let taskB1: string;

beforeAll(async () => {
  // Create two users
  user1 = await authService.upsertUserFromOAuthProfile('google', {
    id: `isolation-test-user-1-${Date.now()}`,
    displayName: 'Isolation Test User 1',
    emails: [{ value: `isolation-user1-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user1.jpg' }]
  } as any);

  user2 = await authService.upsertUserFromOAuthProfile('google', {
    id: `isolation-test-user-2-${Date.now()}`,
    displayName: 'Isolation Test User 2',
    emails: [{ value: `isolation-user2-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user2.jpg' }]
  } as any);

  user1Token = authService.generateJWT(user1);
  user2Token = authService.generateJWT(user2);

  // Create projects for each user
  const projA = await prisma.project.create({
    data: { user_id: user1.id, name: 'Project A (User 1)' }
  });
  projectA = projA.id;

  const projB = await prisma.project.create({
    data: { user_id: user1.id, name: 'Project B (User 1)' }
  });
  projectB = projB.id;

  const projC = await prisma.project.create({
    data: { user_id: user2.id, name: 'Project C (User 2)' }
  });
  projectC = projC.id;
});

afterAll(async () => {
  // Cleanup
  await prisma.$executeRawUnsafe('DELETE FROM tasks');
  await prisma.$executeRawUnsafe('DELETE FROM projects');
  await prisma.$executeRawUnsafe('DELETE FROM users');
});

describe('Task-Project Isolation', () => {
  describe('Setup: Create tasks in different projects', () => {
    it('should create 2 tasks in Project A', async () => {
      // Task A1
      const res1 = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: projectA,
          title: 'Task A1',
          description: 'First task in Project A',
          status: 'TODO',
          priority: 'HIGH'
        });

      expect(res1.status).toBe(201);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.project_id).toBe(projectA);
      taskA1 = res1.body.data.id;

      // Task A2
      const res2 = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: projectA,
          title: 'Task A2',
          description: 'Second task in Project A',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM'
        });

      expect(res2.status).toBe(201);
      expect(res2.body.success).toBe(true);
      expect(res2.body.data.project_id).toBe(projectA);
      taskA2 = res2.body.data.id;
    });

    it('should create 1 task in Project B', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({
          project_id: projectB,
          title: 'Task B1',
          description: 'First task in Project B',
          status: 'TODO',
          priority: 'LOW'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project_id).toBe(projectB);
      taskB1 = res.body.data.id;
    });
  });

  describe('Project-specific task listing', () => {
    it('User 1 should see only Project A tasks when querying Project A', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectA}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);

      const taskIds = res.body.data.map((t: any) => t.id);
      expect(taskIds).toContain(taskA1);
      expect(taskIds).toContain(taskA2);
      expect(taskIds).not.toContain(taskB1);

      // Verify all tasks belong to Project A
      res.body.data.forEach((task: any) => {
        expect(task.project_id).toBe(projectA);
      });
    });

    it('User 1 should see only Project B tasks when querying Project B', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectB}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(taskB1);
      expect(res.body.data[0].project_id).toBe(projectB);

      // Verify Project A tasks not included
      const taskIds = res.body.data.map((t: any) => t.id);
      expect(taskIds).not.toContain(taskA1);
      expect(taskIds).not.toContain(taskA2);
    });

    it('should not leak Project A tasks to Project B query', async () => {
      const resA = await request(app)
        .get(`/api/tasks?projectId=${projectA}`)
        .set('Cookie', `auth_token=${user1Token}`);

      const resB = await request(app)
        .get(`/api/tasks?projectId=${projectB}`)
        .set('Cookie', `auth_token=${user1Token}`);

      // Extract task IDs
      const taskIdsA = resA.body.data.map((t: any) => t.id);
      const taskIdsB = resB.body.data.map((t: any) => t.id);

      // No overlap between projects
      const overlap = taskIdsA.filter((id: string) => taskIdsB.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Cross-user task isolation', () => {
    it('User 1 cannot access User 2 project tasks', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectC}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('unauthorized');
    });

    it('User 2 cannot see User 1 tasks when querying their own project', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectC}`)
        .set('Cookie', `auth_token=${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('Task filtering within project isolation', () => {
    it('should filter by status within Project A isolation', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectA}&status=TODO`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(taskA1);
      expect(res.body.data[0].status).toBe('TODO');
      expect(res.body.data[0].project_id).toBe(projectA);
    });

    it('should filter by priority within Project A isolation', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectA}&priority=HIGH`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(taskA1);
      expect(res.body.data[0].priority).toBe('HIGH');
      expect(res.body.data[0].project_id).toBe(projectA);
    });

    it('should search within Project A isolation only', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectA}&search=First`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(taskA1);
      expect(res.body.data[0].project_id).toBe(projectA);
    });

    it('should apply combined filters within Project A isolation', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectA}&status=TODO&priority=HIGH`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(taskA1);
      expect(res.body.data[0].status).toBe('TODO');
      expect(res.body.data[0].priority).toBe('HIGH');
      expect(res.body.data[0].project_id).toBe(projectA);
    });
  });

  describe('Validation: projectId parameter required', () => {
    it('should require projectId parameter', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Project ID');
    });
  });

  describe('Filter Combination AND Logic', () => {
    let projectForFilters: string;
    let todoPriHighId: string;
    let todoPriMediumId: string;
    let inProgPriHighId: string;
    let donePriHighId: string;

    beforeAll(async () => {
      // Create project for filter tests
      const projRes = await prisma.project.create({
        data: { user_id: user1.id, name: 'Filter Test Project' }
      });
      projectForFilters = projRes.id;

      // Create tasks with different status/priority combinations
      const task1 = await prisma.task.create({
        data: {
          project_id: projectForFilters,
          title: 'TODO High Priority',
          status: 'TODO',
          priority: 'HIGH'
        }
      });
      todoPriHighId = task1.id;

      const task2 = await prisma.task.create({
        data: {
          project_id: projectForFilters,
          title: 'TODO Medium Priority',
          status: 'TODO',
          priority: 'MEDIUM'
        }
      });
      todoPriMediumId = task2.id;

      const task3 = await prisma.task.create({
        data: {
          project_id: projectForFilters,
          title: 'In Progress High Priority',
          status: 'IN_PROGRESS',
          priority: 'HIGH'
        }
      });
      inProgPriHighId = task3.id;

      const task4 = await prisma.task.create({
        data: {
          project_id: projectForFilters,
          title: 'Done High Priority',
          status: 'DONE',
          priority: 'HIGH'
        }
      });
      donePriHighId = task4.id;
    });

    it('should combine status AND priority filters (AND logic)', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectForFilters}&status=TODO&priority=HIGH`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Should only return tasks that are BOTH TODO AND HIGH priority
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(todoPriHighId);
      expect(res.body.data[0].status).toBe('TODO');
      expect(res.body.data[0].priority).toBe('HIGH');
    });

    it('should not use OR logic for status filter', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectForFilters}&status=TODO`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      // Should return 2 TODO tasks (regardless of priority)
      expect(res.body.data).toHaveLength(2);
      const ids = res.body.data.map((t: any) => t.id);
      expect(ids).toContain(todoPriHighId);
      expect(ids).toContain(todoPriMediumId);
      expect(ids).not.toContain(inProgPriHighId);
      expect(ids).not.toContain(donePriHighId);
    });

    it('should not use OR logic for priority filter', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectForFilters}&priority=HIGH`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      // Should return 3 HIGH priority tasks (regardless of status)
      expect(res.body.data).toHaveLength(3);
      const ids = res.body.data.map((t: any) => t.id);
      expect(ids).toContain(todoPriHighId);
      expect(ids).toContain(inProgPriHighId);
      expect(ids).toContain(donePriHighId);
      expect(ids).not.toContain(todoPriMediumId);
    });

    it('should correctly filter with status=IN_PROGRESS AND priority=HIGH', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectForFilters}&status=IN_PROGRESS&priority=HIGH`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(inProgPriHighId);
      expect(res.body.data[0].status).toBe('IN_PROGRESS');
      expect(res.body.data[0].priority).toBe('HIGH');
    });

    it('should return empty when filters do not match any tasks', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectForFilters}&status=DONE&priority=MEDIUM`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      // No tasks with DONE AND MEDIUM priority
      expect(res.body.data).toHaveLength(0);
    });

    it('should combine search AND status filters (AND logic)', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectForFilters}&search=High&status=TODO`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      // Should only return tasks matching BOTH search term AND status
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(todoPriHighId);
      expect(res.body.data[0].title).toContain('High');
      expect(res.body.data[0].status).toBe('TODO');
    });

    it('should combine search AND priority filters (AND logic)', async () => {
      const res = await request(app)
        .get(`/api/tasks?projectId=${projectForFilters}&search=High&priority=MEDIUM`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      // No tasks with title containing "High" AND MEDIUM priority
      expect(res.body.data).toHaveLength(0);
    });
  });
});
