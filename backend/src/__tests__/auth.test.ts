import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { Profile } from 'passport';
import jwt from 'jsonwebtoken';
import authRoutes from '../routes/auth.js';
import * as authService from '../services/auth.js';
import { generateJWT, createJWTCookie } from '../services/auth.js';
import prisma from '../config/database.js';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use('/auth', authRoutes);

describe('Authentication', () => {
  describe('upsertUserFromOAuthProfile', () => {
    it('should create a new user from Google profile', async () => {
      const profile: Partial<Profile> = {
        id: 'google-123',
        displayName: 'John Doe',
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://example.com/photo.jpg' }]
      };

      const user = await authService.upsertUserFromOAuthProfile('google', profile as Profile);

      expect(user.provider).toBe('google');
      expect(user.provider_user_id).toBe('google-123');
      expect(user.email).toBe('john@example.com');
      expect(user.display_name).toBe('John Doe');
      expect(user.avatar_url).toBe('https://example.com/photo.jpg');
    });

    it('should update existing user on repeated login', async () => {
      const profile: Partial<Profile> = {
        id: 'google-123',
        displayName: 'John Doe',
        emails: [{ value: 'john@example.com' }],
        photos: [{ value: 'https://example.com/photo.jpg' }]
      };

      const user1 = await authService.upsertUserFromOAuthProfile('google', profile as Profile);
      const originalId = user1.id;

      const updatedProfile: Partial<Profile> = {
        id: 'google-123',
        displayName: 'John Updated',
        emails: [{ value: 'john.updated@example.com' }],
        photos: [{ value: 'https://example.com/photo2.jpg' }]
      };

      const user2 = await authService.upsertUserFromOAuthProfile('google', updatedProfile as Profile);

      expect(user2.id).toBe(originalId);
      expect(user2.display_name).toBe('John Updated');
      expect(user2.email).toBe('john.updated@example.com');
      expect(user2.avatar_url).toBe('https://example.com/photo2.jpg');
    });

    it('should handle GitHub profile without email', async () => {
      const profile: Partial<Profile> = {
        id: 'github-456',
        username: 'octocat',
        displayName: 'The Octocat',
        photos: [{ value: 'https://github.com/images/error/octocat_happy.gif' }]
      };

      const user = await authService.upsertUserFromOAuthProfile('github', profile as Profile);

      expect(user.provider).toBe('github');
      expect(user.provider_user_id).toBe('github-456');
      expect(user.email).toBe('github-456@users.noreply.github.com');
      expect(user.display_name).toBe('The Octocat');
    });
  });

  describe('JWT operations', () => {
    it('should generate valid JWT token', async () => {
      const user = await prisma.user.create({
        data: {
          provider: 'google',
          provider_user_id: 'test-user-1',
          email: 'test@example.com',
          display_name: 'Test User'
        }
      });

      const token = generateJWT(user);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded: any = jwt.decode(token);
      expect(decoded!.user_id).toBe(user.id);
      expect(decoded!.email).toBe(user.email);
    });

    it('should create JWT cookie string correctly', () => {
      const { setCookie } = createJWTCookie('test-token-123');
      expect(setCookie).toContain('auth_token=test-token-123');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/');
      expect(setCookie).toContain('Max-Age=2592000');
      expect(setCookie).toContain('SameSite=Strict');
    });

    it('should create secure cookie in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { setCookie } = createJWTCookie('test-token-123');
      expect(setCookie).toContain('Secure');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('GET /auth/me', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return current user with valid token', async () => {
      const user = await prisma.user.create({
        data: {
          provider: 'google',
          provider_user_id: 'test-user-2',
          email: 'test2@example.com',
          display_name: 'Test User 2'
        }
      });

      const token = generateJWT(user);

      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', `auth_token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.email).toBe(user.email);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', 'auth_token=invalid-token-xyz');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('should clear auth cookie on logout', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const setCookieHeader = res.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
      expect(cookieString).toContain('auth_token=');
      expect(cookieString).toContain('Max-Age=0');
    });
  });
});
