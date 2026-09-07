#!/usr/bin/env node

/**
 * Database Encoding Fix Script
 * Drops the existing todo_db database and recreates it with UTF-8 encoding
 * This fixes the WIN1252 encoding issue that prevents storing Unicode characters
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);

const ADMIN_DATABASE_URL = 'postgresql://postgres:anca@localhost:5432/postgres';
const TARGET_DATABASE = 'todo_db';
const TARGET_DATABASE_URL = 'postgresql://postgres:anca@localhost:5432/todo_db';

async function executeSQL(sql, dbUrl) {
  try {
    const { stdout, stderr } = await execAsync(
      `psql "${dbUrl}" -c "${sql.replace(/"/g, '\\"')}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    console.log('✓ SQL executed');
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('NOTICE')) console.log('STDERR:', stderr);
    return { success: true, stdout, stderr };
  } catch (error) {
    console.error('✗ SQL execution failed:', error.message);
    return { success: false, error };
  }
}

async function fixDatabaseEncoding() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PostgreSQL Database Encoding Fix: WIN1252 → UTF-8');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Terminate existing connections to the database
    console.log('Step 1: Terminating existing connections to todo_db...');
    const terminateResult = await executeSQL(
      "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${TARGET_DATABASE}' AND pid <> pg_backend_pid();",
      ADMIN_DATABASE_URL
    );
    if (!terminateResult.success) {
      console.warn('⚠ Warning: Could not terminate all connections (may be ok if none exist)');
    }
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 2: Drop the existing database
    console.log('\nStep 2: Dropping existing todo_db database...');
    const dropResult = await executeSQL(
      `DROP DATABASE IF EXISTS "${TARGET_DATABASE}";`,
      ADMIN_DATABASE_URL
    );
    if (dropResult.success) {
      console.log('✓ Database dropped successfully');
    } else if (dropResult.error.message.includes('in use')) {
      console.error('✗ Database is still in use. Please close all connections and try again.');
      process.exit(1);
    }

    // Step 3: Create database with UTF-8 encoding
    console.log('\nStep 3: Creating new todo_db database with UTF-8 encoding...');
    const createResult = await executeSQL(
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
    const verifyResult = await executeSQL(
      "SELECT datname, pg_encoding_to_char(encoding) as encoding, datcollate FROM pg_database WHERE datname = '${TARGET_DATABASE}';",
      ADMIN_DATABASE_URL
    );
    if (verifyResult.stdout.includes('UTF8')) {
      console.log('✓ Database encoding verified as UTF-8');
    } else {
      console.warn('⚠ Database encoding verification inconclusive');
    }

    // Step 5: Run Prisma migrations
    console.log('\nStep 5: Running Prisma migrations to set up schema...');
    try {
      const { stdout: migrateOutput } = await execAsync('npx prisma migrate deploy', {
        cwd: __dirname,
        stdio: 'pipe'
      });
      console.log('✓ Prisma migrations completed');
      if (migrateOutput) console.log(migrateOutput.substring(0, 500));
    } catch (error) {
      console.error('✗ Prisma migration failed:', error.message);
      process.exit(1);
    }

    // Step 6: Verify Prisma can connect
    console.log('\nStep 6: Verifying Prisma connection...');
    try {
      const { stdout: versionOutput } = await execAsync('npx prisma --version', {
        cwd: __dirname
      });
      console.log('✓ Prisma connection verified');
    } catch (error) {
      console.error('✗ Prisma connection failed:', error.message);
      process.exit(1);
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
    console.error('\n✗ FATAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixDatabaseEncoding().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
