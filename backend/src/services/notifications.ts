import prisma from '../config/database.js';

export interface NotificationOverdue {
  type: 'overdue';
  task_id: string;
  title: string;
  due_date: Date;
}

export interface NotificationDueSoon {
  type: 'due_soon';
  task_id: string;
  title: string;
  days_until: number;
  due_date: Date;
}

export type Notification = NotificationOverdue | NotificationDueSoon;

export interface NotificationBatch {
  overdue: NotificationOverdue[];
  due_soon: NotificationDueSoon[];
}

export async function getNotificationsForUser(userId: string): Promise<NotificationBatch> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Get user's projects (for FK constraint)
  const userProjects = await prisma.project.findMany({
    where: { user_id: userId },
    select: { id: true }
  });

  const projectIds = userProjects.map(p => p.id);

  if (projectIds.length === 0) {
    return { overdue: [], due_soon: [] };
  }

  // Get overdue tasks (due_date < today and status != DONE)
  const overdueTasks = await prisma.task.findMany({
    where: {
      project_id: { in: projectIds },
      status: { not: 'DONE' },
      due_date: { lt: today }
    },
    select: {
      id: true,
      title: true,
      due_date: true
    }
  });

  // Get due soon tasks (due_date between today and today+3 days, status != DONE)
  const dueSoonTasks = await prisma.task.findMany({
    where: {
      project_id: { in: projectIds },
      status: { not: 'DONE' },
      due_date: {
        gte: today,
        lte: threeDaysFromNow
      }
    },
    select: {
      id: true,
      title: true,
      due_date: true
    }
  });

  const overdue: NotificationOverdue[] = overdueTasks.map(task => ({
    type: 'overdue' as const,
    task_id: task.id,
    title: task.title,
    due_date: task.due_date!
  }));

  const dueSoon: NotificationDueSoon[] = dueSoonTasks.map(task => {
    const daysUntil = Math.ceil(
      (task.due_date!.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      type: 'due_soon' as const,
      task_id: task.id,
      title: task.title,
      days_until: daysUntil,
      due_date: task.due_date!
    };
  });

  return { overdue, due_soon: dueSoon };
}
