import prisma from '../config/database.js';

beforeAll(async () => {
  try {
    await prisma.$connect();
    await prisma.$executeRawUnsafe('DELETE FROM tasks');
    await prisma.$executeRawUnsafe('DELETE FROM projects');
    await prisma.$executeRawUnsafe('DELETE FROM users');
  } catch (error) {
    console.error('Failed to setup database:', error);
  }
});

afterAll(async () => {
  try {
    await prisma.$executeRawUnsafe('DELETE FROM tasks');
    await prisma.$executeRawUnsafe('DELETE FROM projects');
    await prisma.$executeRawUnsafe('DELETE FROM users');
  } catch (error) {
    // Ignore cleanup errors
  }
  await prisma.$disconnect();
}, 30000);
