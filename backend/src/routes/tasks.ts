import { Router, Request, Response } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import * as taskService from '../services/tasks.js';
import { ApiResponse, TaskStatus, TaskPriority } from '../types/index.js';

const router = Router();

router.use(verifyJWT);

router.get('/', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;

    if (!projectId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Project ID is required'
        }
      };
      return res.status(400).json(response);
    }

    const filters = {
      search: req.query.search as string | undefined,
      status: req.query.status as TaskStatus | undefined,
      priority: req.query.priority as TaskPriority | undefined,
      dueDateFilter: req.query.dueDateFilter as string | undefined
    };

    const tasks = await taskService.listProjectTasks(req.user_id!, projectId, filters);
    const response: ApiResponse = {
      success: true,
      data: tasks
    };
    res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
    const isAuthError = message.includes('unauthorized');
    const statusCode = isAuthError ? 403 : 500;

    const response: ApiResponse = {
      success: false,
      error: {
        code: isAuthError ? 'UNAUTHORIZED' : 'FETCH_ERROR',
        message
      }
    };
    res.status(statusCode).json(response);
  }
});

router.post('/', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const { project_id, title, description, status, priority, due_date } = req.body;
    const task = await taskService.createTask(req.user_id!, {
      project_id,
      title,
      description,
      status,
      priority,
      due_date: due_date ? new Date(due_date) : undefined
    });
    const response: ApiResponse = {
      success: true,
      data: task
    };
    res.status(201).json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create task';
    const statusCode = message.includes('unauthorized') ? 403 : 400;

    const response: ApiResponse = {
      success: false,
      error: {
        code: statusCode === 403 ? 'UNAUTHORIZED' : 'CREATE_ERROR',
        message
      }
    };
    res.status(statusCode).json(response);
  }
});

router.put('/:id', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    const task = await taskService.updateTask(req.user_id!, req.params.id, {
      title,
      description,
      status,
      priority,
      due_date: due_date ? new Date(due_date) : undefined
    });
    const response: ApiResponse = {
      success: true,
      data: task
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update task'
      }
    };
    res.status(error instanceof Error && error.message.includes('unauthorized') ? 403 : 400).json(response);
  }
});

router.patch('/:id/status', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const { status } = req.body;
    const task = await taskService.updateTaskStatus(req.user_id!, req.params.id, status);
    const response: ApiResponse = {
      success: true,
      data: task
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update task status'
      }
    };
    res.status(error instanceof Error && error.message.includes('unauthorized') ? 403 : 400).json(response);
  }
});

router.delete('/:id', async (req: Request & { user_id?: string }, res: Response) => {
  try {
    const task = await taskService.deleteTask(req.user_id!, req.params.id);
    const response: ApiResponse = {
      success: true,
      data: task
    };
    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete task'
      }
    };
    res.status(error instanceof Error && error.message.includes('unauthorized') ? 403 : 400).json(response);
  }
});

export default router;
