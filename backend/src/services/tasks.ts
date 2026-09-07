import prisma from '../config/database.js';
import { Task, TaskStatus, TaskPriority } from '../types/index.js';

interface CreateTaskInput {
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: Date;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: Date;
}

const VALID_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
const VALID_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

function validateStatus(status: unknown): status is TaskStatus {
  return VALID_STATUSES.includes(status as TaskStatus);
}

function validatePriority(priority: unknown): priority is TaskPriority {
  return VALID_PRIORITIES.includes(priority as TaskPriority);
}

export async function listUserTasks(
  userId: string,
  filters?: { search?: string; status?: TaskStatus; priority?: TaskPriority; dueDateFilter?: string }
): Promise<Task[]> {
  const where: any = {
    project: { user_id: userId }
  };

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  if (filters?.status && validateStatus(filters.status)) {
    where.status = filters.status;
  }

  if (filters?.priority && validatePriority(filters.priority)) {
    where.priority = filters.priority;
  }

  if (filters?.dueDateFilter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (filters.dueDateFilter === 'overdue') {
      where.due_date = { lt: today };
    } else if (filters.dueDateFilter === 'today') {
      where.due_date = { gte: today, lt: tomorrow };
    } else if (filters.dueDateFilter === 'next7') {
      where.due_date = { gte: today, lt: nextWeek };
    }
  }

  return prisma.task.findMany({
    where,
    orderBy: { due_date: 'asc' }
  });
}

export async function listProjectTasks(
  userId: string,
  projectId: string,
  filters?: { search?: string; status?: TaskStatus; priority?: TaskPriority; dueDateFilter?: string }
): Promise<Task[]> {
  // Verify project belongs to user
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project || project.user_id !== userId) {
    throw new Error('Project not found or unauthorized');
  }

  const where: any = {
    project_id: projectId
  };

  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  if (filters?.status && validateStatus(filters.status)) {
    where.status = filters.status;
  }

  if (filters?.priority && validatePriority(filters.priority)) {
    where.priority = filters.priority;
  }

  if (filters?.dueDateFilter) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (filters.dueDateFilter === 'OVERDUE') {
      where.AND = [
        { status: { not: 'DONE' } },
        { due_date: { lt: today } }
      ];
    } else if (filters.dueDateFilter === 'TODAY') {
      where.AND = [
        { status: { not: 'DONE' } },
        { due_date: { gte: today, lt: tomorrow } }
      ];
    } else if (filters.dueDateFilter === 'NEXT_7_DAYS') {
      where.AND = [
        { status: { not: 'DONE' } },
        { due_date: { gte: today, lt: nextWeek } }
      ];
    }
  }

  return prisma.task.findMany({
    where,
    orderBy: { due_date: 'asc' }
  });
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Task title is required');
  }

  if (!validateStatus(input.status)) {
    throw new Error('Invalid task status');
  }

  if (!validatePriority(input.priority)) {
    throw new Error('Invalid task priority');
  }

  const project = await prisma.project.findUnique({
    where: { id: input.project_id }
  });

  if (!project || project.user_id !== userId) {
    throw new Error('Project not found or unauthorized');
  }

  return prisma.task.create({
    data: {
      project_id: input.project_id,
      title: input.title.trim(),
      description: input.description?.trim(),
      status: input.status,
      priority: input.priority,
      due_date: input.due_date
    }
  });
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true }
  });

  if (!task || task.project.user_id !== userId) {
    throw new Error('Task not found or unauthorized');
  }

  const updateData: any = {};
  if (input.title !== undefined) {
    if (!input.title.trim().length) throw new Error('Task title is required');
    updateData.title = input.title.trim();
  }
  if (input.description !== undefined) {
    updateData.description = input.description?.trim();
  }
  if (input.status !== undefined) {
    if (!validateStatus(input.status)) throw new Error('Invalid task status');
    updateData.status = input.status;
  }
  if (input.priority !== undefined) {
    if (!validatePriority(input.priority)) throw new Error('Invalid task priority');
    updateData.priority = input.priority;
  }
  if (input.due_date !== undefined) {
    updateData.due_date = input.due_date;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: updateData
  });
}

export async function updateTaskStatus(userId: string, taskId: string, status: TaskStatus): Promise<Task> {
  if (!validateStatus(status)) {
    throw new Error('Invalid task status');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true }
  });

  if (!task || task.project.user_id !== userId) {
    throw new Error('Task not found or unauthorized');
  }

  return prisma.task.update({
    where: { id: taskId },
    data: { status }
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<Task> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true }
  });

  if (!task || task.project.user_id !== userId) {
    throw new Error('Task not found or unauthorized');
  }

  return prisma.task.delete({
    where: { id: taskId }
  });
}

export async function getOverdueTasks(userId: string): Promise<Task[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.task.findMany({
    where: {
      project: { user_id: userId },
      due_date: { lt: today },
      status: { not: 'DONE' }
    },
    orderBy: { due_date: 'asc' }
  });
}

export async function getDueSoonTasks(userId: string): Promise<Task[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inThreeDays = new Date(today);
  inThreeDays.setDate(inThreeDays.getDate() + 3);

  return prisma.task.findMany({
    where: {
      project: { user_id: userId },
      due_date: { gte: today, lte: inThreeDays },
      status: { not: 'DONE' }
    },
    orderBy: { due_date: 'asc' }
  });
}
