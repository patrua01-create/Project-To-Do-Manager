#!/usr/bin/env tsx

/**
 * Database Encoding Fix Script
 * Drops the existing todo_db database and recreates it with UTF-8 encoding
 * This fixes the WIN1252 encoding issue that prevents storing Unicode characters
 */

import { execSync } from 'child_process';

const ADMIN_DATABASE_URL = 'postgresql://postgres:anca@localhost:5432/postgres';
const TARGET_DATABASE = 'todo_db';

function executeSQL(sql: string, dbUrl: string): { success: boolean; output?: string; error?: string } {
  try {
    const command = `psql "${dbUrl}" -c "${sql.replace(/"/g, '\\"')}"`;
    console.log(`Executing: ${command.substring(0, 80)}...`);
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    console.log('✓ SQL executed');
    if (output) console.log(output);
    return { success: true, output };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('✗ SQL execution failed:', errorMsg);
    return { success: false, error: errorMsg };
  }
}

async function fixDatabaseEncoding() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PostgreSQL Database Encoding Fix: WIN1252 → UTF-8');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Terminate existing connections to the database
    console.log('Step 1: Terminating existing connections to todo_db...');
    executeSQL(
      `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${TARGET_DATABASE}' AND pid <> pg_backend_pid();`,
      ADMIN_DATABASE_URL
    );
    console.log('Waiting for connections to close...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Drop the existing database
    console.log('\nStep 2: Dropping existing todo_db database...');
    const dropResult = executeSQL(
      `DROP DATABASE IF EXISTS "${TARGET_DATABASE}";`,
      ADMIN_DATABASE_URL
    );
    if (dropResult.success) {
      console.log('✓ Database dropped successfully');
    } else if (dropResult.error?.includes('in use')) {
      console.error('✗ Database is still in use. Please close all connections and try again.');
      process.exit(1);
    }

    // Step 3: Create database with UTF-8 encoding
    console.log('\nStep 3: Creating new todo_db database with UTF-8 encoding...');
    const createResult = executeSQL(
      `CREATE DATABASE "${TARGET_DATABASE}"
       WITH
       OWNER postgres
       ENCODING 'UTF8'
       LOCALE_PROVIDER 'libc'
       LC_COLLATE 'C'
       LC_CTYPE 'C'
       TEMPLATE template0;`,
      ADMIN_DATABASE_URL
    );
    if (createResult.success) {
      console.log('✓ Database created with UTF-8 encoding');
    } else {
      console.error('✗ Failed to create database');
      console.error(createResult.error);
      process.exit(1);
    }

    // Step 4: Verify the encoding
    console.log('\nStep 4: Verifying database encoding...');
    const verifyResult = executeSQL(
      `SELECT datname, pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = '${TARGET_DATABASE}';`,
      ADMIN_DATABASE_URL
    );
    if (verifyResult.output?.includes('UTF8')) {
      console.log('✓ Database encoding verified as UTF-8');
    } else {
      console.warn('⚠ Database encoding verification inconclusive');
      console.log('Output:', verifyResult.output);
    }

    // Step 5: Run Prisma migrations
    console.log('\nStep 5: Running Prisma migrations to set up schema...');
    try {
      const migrateOutput = execSync('npx prisma migrate deploy', {
        encoding: 'utf-8',
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      console.log('✓ Prisma migrations completed');
      console.log(migrateOutput.substring(0, 500));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('✗ Prisma migration failed:', errorMsg);
      if (errorMsg.includes('ENOENT')) {
        console.log('Attempting alternative: npx prisma db push');
        try {
          const pushOutput = execSync('npx prisma db push --skip-generate', {
            encoding: 'utf-8',
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
          });
          console.log('✓ Prisma db push completed');
          console.log(pushOutput.substring(0, 500));
        } catch (pushError) {
          console.error('✗ Prisma db push also failed');
          process.exit(1);
        }
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
fixDatabaseEncoding().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
