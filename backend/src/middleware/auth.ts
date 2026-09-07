import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { verifyJWTToken } from '../utils/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user_id?: string;
    }
  }
}

export function verifyJWT(req: Request & Partial<AuthenticatedRequest>, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.auth_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authentication token provided'
        }
      });
    }

    const decoded = verifyJWTToken(token);
    req.user_id = decoded.user_id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      }
    });
  }
}

export function optionalAuth(req: Request & Partial<AuthenticatedRequest>, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.auth_token;
    if (token) {
      const decoded = verifyJWTToken(token);
      req.user_id = decoded.user_id;
    }
  } catch {
    // Token invalid but optional, continue
  }
  next();
}
