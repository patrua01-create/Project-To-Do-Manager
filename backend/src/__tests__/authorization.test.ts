import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import projectRoutes from '../routes/projects.js';
import { generateJWT, createJWTCookie } from '../services/auth.js';
import prisma from '../config/database.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use('/api/projects', projectRoutes);

describe('Authorization', () => {
  let user1: any;
  let user2: any;
  let token1: string;
  let token2: string;
  let project1: any;
  let project2: any;

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM tasks');
    await prisma.$executeRawUnsafe('DELETE FROM projects');
    await prisma.$executeRawUnsafe('DELETE FROM users');

    user1 = await prisma.user.create({
      data: {
        provider: 'google',
        provider_user_id: 'auth-test-user-1',
        email: 'user1@example.com',
        display_name: 'User One'
      }
    });

    user2 = await prisma.user.create({
      data: {
        provider: 'github',
        provider_user_id: 'auth-test-user-2',
        email: 'user2@example.com',
        display_name: 'User Two'
      }
    });

    token1 = generateJWT(user1);
    token2 = generateJWT(user2);

    project1 = await prisma.project.create({
      data: {
        user_id: user1.id,
        name: 'Project 1'
      }
    });

    project2 = await prisma.project.create({
      data: {
        user_id: user2.id,
        name: 'Project 2'
      }
    });
  });

  describe('Cross-user project access', () => {
    it('User 1 should see only their own projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', `auth_token=${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(project1.id);
      expect(res.body.data[0].name).toBe('Project 1');
    });

    it('User 2 should see only their own projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', `auth_token=${token2}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(project2.id);
      expect(res.body.data[0].name).toBe('Project 2');
    });

    it('User 1 cannot update User 2 project', async () => {
      const res = await request(app)
        .put(`/api/projects/${project2.id}`)
        .set('Cookie', `auth_token=${token1}`)
        .send({ name: 'Hacked Project' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('unauthorized');

      const verifyProject = await prisma.project.findUnique({
        where: { id: project2.id }
      });
      expect(verifyProject!.name).toBe('Project 2');
    });

    it('User 1 cannot delete User 2 project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${project2.id}`)
        .set('Cookie', `auth_token=${token1}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('unauthorized');

      const verifyProject = await prisma.project.findUnique({
        where: { id: project2.id }
      });
      expect(verifyProject).toBeTruthy();
    });
  });

  describe('Unauthenticated access', () => {
    it('should deny access without auth token', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('User can manage own projects', () => {
    it('User 1 can rename their own project', async () => {
      const res = await request(app)
        .put(`/api/projects/${project1.id}`)
        .set('Cookie', `auth_token=${token1}`)
        .send({ name: 'Project 1 Renamed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Project 1 Renamed');
    });

    it('User 1 can delete their own project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${project1.id}`)
        .set('Cookie', `auth_token=${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deletedProject = await prisma.project.findUnique({
        where: { id: project1.id }
      });
      expect(deletedProject).toBeNull();
    });
  });

  describe('Project validation and cascade delete', () => {
    it('should reject project creation with empty name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${token1}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('required');
    });

    it('should reject project creation with whitespace-only name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${token1}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('required');
    });

    it('should accept project creation with valid name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${token1}`)
        .send({ name: 'Valid Project' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Valid Project');
    });

    it('should delete all tasks when project is deleted', async () => {
      // Create a test project directly in database
      const testProject = await prisma.project.create({
        data: {
          user_id: user1.id,
          name: 'Cascade Delete Test Project'
        }
      });

      // Create multiple tasks using Prisma
      const task1 = await prisma.task.create({
        data: {
          project_id: testProject.id,
          title: 'Cascade Task 1',
          status: 'TODO',
          priority: 'HIGH'
        }
      });

      const task2 = await prisma.task.create({
        data: {
          project_id: testProject.id,
          title: 'Cascade Task 2',
          status: 'IN_PROGRESS',
          priority: 'MEDIUM'
        }
      });

      // Verify tasks exist
      const tasksBeforeDelete = await prisma.task.findMany({
        where: { project_id: testProject.id }
      });
      expect(tasksBeforeDelete).toHaveLength(2);

      // Delete the project via API
      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}`)
        .set('Cookie', `auth_token=${token1}`);

      expect(deleteRes.status).toBe(200);

      // Verify project is deleted
      const deletedProject = await prisma.project.findUnique({
        where: { id: testProject.id }
      });
      expect(deletedProject).toBeNull();

      // Verify tasks are also deleted (cascade delete)
      const task1After = await prisma.task.findUnique({
        where: { id: task1.id }
      });
      const task2After = await prisma.task.findUnique({
        where: { id: task2.id }
      });

      expect(task1After).toBeNull();
      expect(task2After).toBeNull();
    });

    it('should not have orphaned tasks after project deletion', async () => {
      // Create a test project
      const projectRes = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${token1}`)
        .send({ name: 'Orphan Test Project' });

      const testProjectId = projectRes.body.data.id;

      // Create a task
      await request(app)
        .post('/api/tasks')
        .set('Cookie', `auth_token=${token1}`)
        .send({
          project_id: testProjectId,
          title: 'Orphan Test Task',
          status: 'TODO',
          priority: 'LOW'
        });

      // Delete the project
      await request(app)
        .delete(`/api/projects/${testProjectId}`)
        .set('Cookie', `auth_token=${token1}`);

      // Verify no tasks exist for this deleted project
      const orphanedTasks = await prisma.task.findMany({
        where: { project_id: testProjectId }
      });

      expect(orphanedTasks).toHaveLength(0);
    });
  });
});
