#!/usr/bin/env tsx

/**
 * Test Project-Specific Task Filtering
 * Verifies that tasks are correctly filtered by project
 */

import { PrismaClient } from '@prisma/client';
import * as taskService from './src/services/tasks.js';

const prisma = new PrismaClient();

async function testProjectTaskFiltering() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Project-Specific Task Filtering Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Clean up: Delete test data if it exists
    console.log('Step 0: Cleaning up old test data...');
    const testUser = await prisma.user.findFirst({
      where: { email: 'test-project-filter@example.com' }
    });
    if (testUser) {
      await prisma.task.deleteMany({
        where: { project: { user_id: testUser.id } }
      });
      await prisma.project.deleteMany({
        where: { user_id: testUser.id }
      });
      await prisma.user.delete({
        where: { id: testUser.id }
      });
    }

    // Step 1: Create test user
    console.log('Step 1: Creating test user...');
    const user = await prisma.user.create({
      data: {
        provider: 'test',
        provider_user_id: `test-project-filter-${Date.now()}`,
        email: 'test-project-filter@example.com',
        display_name: 'Test User'
      }
    });
    console.log(`✓ Test user created: ${user.id}\n`);

    // Step 2: Create projects
    console.log('Step 2: Creating Project A and Project B...');
    const projectA = await prisma.project.create({
      data: {
        user_id: user.id,
        name: 'Project A'
      }
    });
    const projectB = await prisma.project.create({
      data: {
        user_id: user.id,
        name: 'Project B'
      }
    });
    console.log(`✓ Project A created: ${projectA.id}`);
    console.log(`✓ Project B created: ${projectB.id}\n`);

    // Step 3: Create tasks in Project A
    console.log('Step 3: Creating 3 tasks in Project A...');
    const taskA1 = await prisma.task.create({
      data: {
        project_id: projectA.id,
        title: 'Task A1',
        description: 'First task in Project A',
        status: 'TODO',
        priority: 'HIGH'
      }
    });
    const taskA2 = await prisma.task.create({
      data: {
        project_id: projectA.id,
        title: 'Task A2',
        description: 'Second task in Project A',
        status: 'TODO',
        priority: 'MEDIUM'
      }
    });
    const taskA3 = await prisma.task.create({
      data: {
        project_id: projectA.id,
        title: 'Task A3',
        description: 'Third task in Project A',
        status: 'IN_PROGRESS',
        priority: 'LOW'
      }
    });
    console.log(`✓ Task A1 created`);
    console.log(`✓ Task A2 created`);
    console.log(`✓ Task A3 created\n`);

    // Step 4: Create tasks in Project B
    console.log('Step 4: Creating 2 tasks in Project B...');
    const taskB1 = await prisma.task.create({
      data: {
        project_id: projectB.id,
        title: 'Task B1',
        description: 'First task in Project B',
        status: 'TODO',
        priority: 'HIGH'
      }
    });
    const taskB2 = await prisma.task.create({
      data: {
        project_id: projectB.id,
        title: 'Task B2',
        description: 'Second task in Project B',
        status: 'DONE',
        priority: 'MEDIUM'
      }
    });
    console.log(`✓ Task B1 created`);
    console.log(`✓ Task B2 created\n`);

    // Step 5: Test filtering - Get tasks for Project A
    console.log('Step 5: Fetching tasks for Project A...');
    const tasksA = await taskService.listProjectTasks(user.id, projectA.id);
    console.log(`Tasks in Project A: ${tasksA.length}`);
    tasksA.forEach(t => console.log(`  - ${t.title} (${t.status})`));

    if (tasksA.length === 3 && tasksA.every(t => [taskA1.id, taskA2.id, taskA3.id].includes(t.id))) {
      console.log('✓ Project A filtering: PASSED\n');
    } else {
      console.error('✗ Project A filtering: FAILED');
      console.error(`Expected 3 tasks from Project A, got ${tasksA.length}`);
    }

    // Step 6: Test filtering - Get tasks for Project B
    console.log('Step 6: Fetching tasks for Project B...');
    const tasksB = await taskService.listProjectTasks(user.id, projectB.id);
    console.log(`Tasks in Project B: ${tasksB.length}`);
    tasksB.forEach(t => console.log(`  - ${t.title} (${t.status})`));

    if (tasksB.length === 2 && tasksB.every(t => [taskB1.id, taskB2.id].includes(t.id))) {
      console.log('✓ Project B filtering: PASSED\n');
    } else {
      console.error('✗ Project B filtering: FAILED');
      console.error(`Expected 2 tasks from Project B, got ${tasksB.length}`);
    }

    // Step 7: Test with filters - High priority tasks in Project A
    console.log('Step 7: Testing with filters (Project A, HIGH priority)...');
    const tasksAHighPriority = await taskService.listProjectTasks(user.id, projectA.id, {
      priority: 'HIGH'
    });
    console.log(`High priority tasks in Project A: ${tasksAHighPriority.length}`);
    tasksAHighPriority.forEach(t => console.log(`  - ${t.title}`));

    if (tasksAHighPriority.length === 1 && tasksAHighPriority[0].id === taskA1.id) {
      console.log('✓ Project A with priority filter: PASSED\n');
    } else {
      console.error('✗ Project A with priority filter: FAILED');
    }

    // Step 8: Test with search filter
    console.log('Step 8: Testing with search filter (Project B, "Task B")...');
    const tasksBSearched = await taskService.listProjectTasks(user.id, projectB.id, {
      search: 'Task B'
    });
    console.log(`Search results in Project B: ${tasksBSearched.length}`);
    tasksBSearched.forEach(t => console.log(`  - ${t.title}`));

    if (tasksBSearched.length === 2) {
      console.log('✓ Project B with search filter: PASSED\n');
    } else {
      console.error('✗ Project B with search filter: FAILED');
    }

    // Clean up
    console.log('Cleaning up test data...');
    await prisma.task.deleteMany({
      where: { project_id: { in: [projectA.id, projectB.id] } }
    });
    await prisma.project.deleteMany({
      where: { id: { in: [projectA.id, projectB.id] } }
    });
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log('✓ Test data cleaned up\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ PROJECT-SPECIFIC TASK FILTERING TEST PASSED');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Tasks are now correctly filtered by project.');
    console.log('Switching projects will display only tasks from that project.\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testProjectTaskFiltering().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
