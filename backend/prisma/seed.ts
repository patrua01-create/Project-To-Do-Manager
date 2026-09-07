import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample data...');

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { provider_user_id: 'google-sample-1' },
    update: {},
    create: {
      provider: 'google',
      provider_user_id: 'google-sample-1',
      email: 'demo@example.com',
      display_name: 'Demo User',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
    }
  });

  const user2 = await prisma.user.upsert({
    where: { provider_user_id: 'github-sample-1' },
    update: {},
    create: {
      provider: 'github',
      provider_user_id: 'github-sample-1',
      email: 'test@example.com',
      display_name: 'Test User',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test'
    }
  });

  // Create sample projects
  const project1 = await prisma.project.upsert({
    where: { id: 'project-1' },
    update: {},
    create: {
      id: 'project-1',
      user_id: user1.id,
      name: 'Personal Projects'
    }
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'project-2' },
    update: {},
    create: {
      id: 'project-2',
      user_id: user1.id,
      name: 'Work Tasks'
    }
  });

  const project3 = await prisma.project.upsert({
    where: { id: 'project-3' },
    update: {},
    create: {
      id: 'project-3',
      user_id: user2.id,
      name: 'Learning'
    }
  });

  // Create sample tasks
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const overdue = new Date(today);
  overdue.setDate(overdue.getDate() - 2);

  await prisma.task.createMany({
    data: [
      {
        project_id: project1.id,
        title: 'Complete project setup',
        description: 'Set up backend and frontend infrastructure',
        status: 'DONE',
        priority: 'HIGH',
        due_date: overdue
      },
      {
        project_id: project1.id,
        title: 'Implement authentication',
        description: 'Set up OAuth with Google and GitHub',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        due_date: tomorrow
      },
      {
        project_id: project1.id,
        title: 'Create database schema',
        description: 'Design and implement PostgreSQL schema',
        status: 'TODO',
        priority: 'HIGH',
        due_date: nextWeek
      },
      {
        project_id: project2.id,
        title: 'Review pull requests',
        description: 'Review and merge pending PRs',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: today
      },
      {
        project_id: project2.id,
        title: 'Write documentation',
        description: 'Update README and API docs',
        status: 'TODO',
        priority: 'MEDIUM',
        due_date: nextWeek
      },
      {
        project_id: project3.id,
        title: 'Learn TypeScript',
        description: 'Complete TypeScript handbook',
        status: 'IN_PROGRESS',
        priority: 'LOW'
      },
      {
        project_id: project3.id,
        title: 'Master React patterns',
        description: 'Study advanced React patterns and best practices',
        status: 'TODO',
        priority: 'MEDIUM'
      }
    ],
    skipDuplicates: true
  });

  console.log('✓ Database seeded with sample data');
  console.log(`  - 2 users created`);
  console.log(`  - 3 projects created`);
  console.log(`  - 7 tasks created`);
}

main()
  .catch(e => {
    console.error('✗ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
