import { Router, Request, Response } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import * as projectService from '../services/projects.js';
import { ApiResponse } from '../types/index.js';

const router = Router();

router.use(verifyJWT);

router.get('/', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const projects = await projectService.listUserProjects(req.user_id!);
    const response: ApiResponse = {
      success: true,
      data: projects
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: error instanceof Error ? error.message : 'Failed to fetch projects'
      }
    };
    res.status(500).json(response);
  }
});

router.post('/', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const { name } = req.body;
    const project = await projectService.createProject(req.user_id!, name);
    const response: ApiResponse = {
      success: true,
      data: project
    };
    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create project'
      }
    };
    res.status(400).json(response);
  }
});

router.put('/:id', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const { name } = req.body;
    const project = await projectService.updateProject(req.user_id!, req.params.id, name);
    const response: ApiResponse = {
      success: true,
      data: project
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update project'
      }
    };
    res.status(error instanceof Error && error.message.includes('unauthorized') ? 403 : 400).json(response);
  }
});

router.delete('/:id', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const project = await projectService.deleteProject(req.user_id!, req.params.id);
    const response: ApiResponse = {
      success: true,
      data: project
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete project'
      }
    };
    res.status(error instanceof Error && error.message.includes('unauthorized') ? 403 : 400).json(response);
  }
});

export default router;
