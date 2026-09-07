import { Router, Request, Response } from 'express';
import passport from 'passport';
import * as authService from '../services/auth.js';
import { verifyJWT } from '../middleware/auth.js';
import { ApiResponse, AuthenticatedRequest } from '../types/index.js';
import prisma from '../config/database.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const token = authService.generateJWT(user);
      const { setCookie } = authService.createJWTCookie(token);
      res.setHeader('Set-Cookie', setCookie);
      res.redirect(FRONTEND_URL);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

router.get('/github', passport.authenticate('github', { session: false, scope: ['user:email'] }));

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  (req: any, res: Response) => {
    try {
      const user = req.user as any;
      const token = authService.generateJWT(user);
      const { setCookie } = authService.createJWTCookie(token);
      res.setHeader('Set-Cookie', setCookie);
      res.redirect(FRONTEND_URL);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);

router.get('/me', verifyJWT, async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user_id as string }
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: user
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch user'
      }
    };
    res.status(500).json(response);
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  try {
    const { setCookie } = authService.clearAuthCookie();
    res.setHeader('Set-Cookie', setCookie);
    const response: ApiResponse = {
      success: true,
      data: { message: 'Logged out successfully' }
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'LOGOUT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to logout'
      }
    };
    res.status(500).json(response);
  }
});

export default router;
