import prisma from '../config/database.js';
import { Project } from '../types/index.js';

export async function listUserProjects(userId: string): Promise<Project[]> {
  return prisma.project.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' }
  });
}

export async function createProject(userId: string, name: string): Promise<Project> {
  if (!name || name.trim().length === 0) {
    throw new Error('Project name is required');
  }

  return prisma.project.create({
    data: {
      user_id: userId,
      name: name.trim()
    }
  });
}

export async function updateProject(userId: string, projectId: string, name: string): Promise<Project> {
  if (!name || name.trim().length === 0) {
    throw new Error('Project name is required');
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project || project.user_id !== userId) {
    throw new Error('Project not found or unauthorized');
  }

  return prisma.project.update({
    where: { id: projectId },
    data: { name: name.trim() }
  });
}

export async function deleteProject(userId: string, projectId: string): Promise<Project> {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project || project.user_id !== userId) {
    throw new Error('Project not found or unauthorized');
  }

  return prisma.project.delete({
    where: { id: projectId }
  });
}

export async function getProjectById(userId: string, projectId: string): Promise<Project | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project || project.user_id !== userId) {
    return null;
  }

  return project;
}
