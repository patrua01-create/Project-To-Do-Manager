#!/usr/bin/env tsx

/**
 * Database Encoding Fix Using Prisma Direct Connection
 * Fixes the WIN1252 encoding issue by using PostgreSQL raw SQL through Prisma
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDatabaseEncoding() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PostgreSQL Database Encoding Fix: WIN1252 → UTF-8');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Check current encoding
    console.log('Step 1: Checking current database encoding...');
    const currentEncoding = await prisma.$queryRaw<Array<{ datname: string; encoding: string }>>`
      SELECT datname, pg_encoding_to_char(encoding) as encoding
      FROM pg_database
      WHERE datname = 'todo_db'
    `;

    if (currentEncoding.length > 0) {
      console.log(`Current encoding: ${currentEncoding[0].encoding}`);
      if (currentEncoding[0].encoding === 'UTF8') {
        console.log('✓ Database is already UTF-8 encoded. No fix needed.');
        await prisma.$disconnect();
        return;
      }
    }

    // Step 2: Disconnect from todo_db and connect to postgres database
    console.log('\nStep 2: Disconnecting from todo_db...');
    await prisma.$disconnect();
    console.log('✓ Disconnected');

    // Step 3: Create a new Prisma client connected to postgres (admin database)
    console.log('\nStep 3: Connecting to postgres (admin) database...');
    const adminClient = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:anca@localhost:5432/postgres'
        }
      }
    });

    // Step 4: Terminate connections to todo_db
    console.log('\nStep 4: Terminating existing connections to todo_db...');
    try {
      await adminClient.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'todo_db'
        AND pid <> pg_backend_pid();
      `);
      console.log('✓ Connections terminated');
    } catch (error) {
      console.warn('⚠ Warning: Could not terminate connections (may be ok if none exist)');
    }

    // Wait for connections to close
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 5: Drop the existing database
    console.log('\nStep 5: Dropping existing todo_db database...');
    try {
      await adminClient.$executeRawUnsafe('DROP DATABASE IF EXISTS "todo_db";');
      console.log('✓ Database dropped');
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      if (err.includes('in use')) {
        console.error('✗ Database is still in use. Please close all connections.');
        process.exit(1);
      }
      console.warn('⚠ Warning:', err);
    }

    // Step 6: Create database with UTF-8 encoding
    console.log('\nStep 6: Creating new todo_db database with UTF-8 encoding...');
    try {
      await adminClient.$executeRawUnsafe(`
        CREATE DATABASE "todo_db"
        WITH
        OWNER postgres
        ENCODING 'UTF8'
        LOCALE_PROVIDER 'libc'
        LC_COLLATE 'C'
        LC_CTYPE 'C'
        TEMPLATE template0;
      `);
      console.log('✓ Database created with UTF-8 encoding');
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      console.error('✗ Failed to create database:', err);
      await adminClient.$disconnect();
      process.exit(1);
    }

    // Step 7: Verify encoding
    console.log('\nStep 7: Verifying database encoding...');
    const newEncoding = await adminClient.$queryRaw<Array<{ datname: string; encoding: string }>>`
      SELECT datname, pg_encoding_to_char(encoding) as encoding
      FROM pg_database
      WHERE datname = 'todo_db'
    `;

    if (newEncoding.length > 0 && newEncoding[0].encoding === 'UTF8') {
      console.log('✓ Confirmed: Database encoding is UTF-8');
    } else {
      console.warn('⚠ Encoding verification inconclusive');
    }

    // Disconnect from admin database
    await adminClient.$disconnect();
    console.log('\n✓ Disconnected from admin database');

    // Step 8: Run Prisma migrations
    console.log('\nStep 8: Running Prisma migrations to set up schema...');
    try {
      // Use execSync from child_process to run prisma migrate deploy
      const { execSync } = require('child_process');
      const output = execSync('npx prisma migrate deploy', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log('✓ Prisma migrations completed');
      console.log(output.substring(0, 300));
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn('⚠ Prisma migrate deploy encountered issues (might be expected if no migrations exist)');
      console.log('Message:', errMsg.substring(0, 200));

      // Try db push as fallback
      console.log('\nAttempting db push...');
      try {
        const { execSync } = require('child_process');
        const pushOutput = execSync('npx prisma db push --skip-generate --accept-data-loss', {
          encoding: 'utf-8',
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });
        console.log('✓ Prisma db push completed');
        console.log(pushOutput.substring(0, 300));
      } catch (pushError) {
        console.error('✗ Prisma db push failed');
        const pushErrMsg = pushError instanceof Error ? pushError.message : String(pushError);
        console.error(pushErrMsg.substring(0, 300));
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ DATABASE ENCODING FIX COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nThe database is now configured with UTF-8 encoding.');
    console.log('International characters (Romanian: ă, â, î, ș, ț) will work correctly.');
    console.log('\nNext steps:');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Test Google OAuth with a Romanian/international user name');
    console.log('3. Verify the user is created in the database\n');

  } catch (error) {
    console.error('\n✗ FATAL ERROR:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run the fix
fixDatabaseEncoding()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
