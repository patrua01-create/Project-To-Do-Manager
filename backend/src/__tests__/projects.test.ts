import request from 'supertest';
import express from 'express';
import prisma from '../config/database.js';
import * as authService from '../services/auth.js';
import app from '../index.js';
import { User } from '../types/index.js';

let user1: User;
let user2: User;
let user1Token: string;
let user2Token: string;
let projectId1: string;
let projectId2: string;

beforeAll(async () => {
  user1 = await authService.upsertUserFromOAuthProfile('google', {
    id: `projects-google-user-1-${Date.now()}`,
    displayName: 'Projects User 1',
    emails: [{ value: `projects-user1-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user1.jpg' }]
  } as any);

  user2 = await authService.upsertUserFromOAuthProfile('google', {
    id: `projects-google-user-2-${Date.now()}`,
    displayName: 'Projects User 2',
    emails: [{ value: `projects-user2-${Date.now()}@example.com` }],
    photos: [{ value: 'https://example.com/user2.jpg' }]
  } as any);

  user1Token = authService.generateJWT(user1);
  user2Token = authService.generateJWT(user2);
});


describe('Project CRUD Operations', () => {
  describe('POST /api/projects', () => {
    it('should create a project for authenticated user', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ name: 'My First Project' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('My First Project');
      expect(res.body.data.user_id).toBe(user1.id);

      projectId1 = res.body.data.id;
    });

    it('should reject project creation without auth token', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ name: 'Unauthorized Project' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject project with empty name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('name');
    });

    it('should reject project with missing name field', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should trim whitespace from project name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ name: '  Trimmed Project  ' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Trimmed Project');
    });
  });

  describe('GET /api/projects', () => {
    beforeAll(async () => {
      await prisma.project.create({
        data: { user_id: user2.id, name: 'User 2 Project' }
      });
      projectId2 = (
        await prisma.project.findFirst({
          where: { user_id: user2.id }
        })
      )!.id;
    });

    it('should list projects for authenticated user', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].user_id).toBe(user1.id);
    });

    it('should not include other users projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      const userIds = res.body.data.map((p: any) => p.user_id);
      expect(userIds).not.toContain(user2.id);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/projects');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('user 2 should see only their own projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', `auth_token=${user2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((p: any) => p.user_id === user2.id)).toBe(true);
      expect(res.body.data.some((p: any) => p.id === projectId1)).toBe(false);
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project name for owner', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId1}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ name: 'Updated Project Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Project Name');
    });

    it('should reject update without auth token', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId1}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject update from different user (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId1}`)
        .set('Cookie', `auth_token=${user2Token}`)
        .send({ name: 'Unauthorized Update' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UPDATE_ERROR');
    });

    it('should reject update with empty name', async () => {
      const res = await request(app)
        .put(`/api/projects/${projectId1}`)
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 403 for non-existent project', async () => {
      const res = await request(app)
        .put('/api/projects/non-existent-id')
        .set('Cookie', `auth_token=${user1Token}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let projectToDelete: string;

    beforeAll(async () => {
      const project = await prisma.project.create({
        data: { user_id: user1.id, name: 'Project to Delete' }
      });
      projectToDelete = project.id;
    });

    it('should delete project for owner', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectToDelete}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(projectToDelete);

      const deleted = await prisma.project.findUnique({
        where: { id: projectToDelete }
      });
      expect(deleted).toBeNull();
    });

    it('should reject delete without auth token', async () => {
      const project = await prisma.project.create({
        data: { user_id: user1.id, name: 'Another Project' }
      });

      const res = await request(app).delete(`/api/projects/${project.id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject delete from different user (403 Forbidden)', async () => {
      const project = await prisma.project.create({
        data: { user_id: user2.id, name: 'User 2 Project to Delete' }
      });

      const res = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Cookie', `auth_token=${user1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Verify project still exists
      const stillExists = await prisma.project.findUnique({
        where: { id: project.id }
      });
      expect(stillExists).not.toBeNull();

      // Clean up
      await prisma.project.delete({ where: { id: project.id } });
    });

    it('should cascade delete tasks when deleting project', async () => {
      const project = await prisma.project.create({
        data: { user_id: user1.id, name: 'Project with Tasks' }
      });

      const task = await prisma.task.create({
        data: {
          project_id: project.id,
          title: 'Task in Cascade Project',
          status: 'TODO',
          priority: 'HIGH'
        }
      });

      const taskCountBefore = await prisma.task.count({
        where: { project_id: project.id }
      });
      expect(taskCountBefore).toBe(1);

      await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Cookie', `auth_token=${user1Token}`);

      const taskCountAfter = await prisma.task.count({
        where: { project_id: project.id }
      });
      expect(taskCountAfter).toBe(0);

      const deletedProject = await prisma.project.findUnique({
        where: { id: project.id }
      });
      expect(deletedProject).toBeNull();
    });
  });
});
