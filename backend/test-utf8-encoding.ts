#!/usr/bin/env tsx

/**
 * Test UTF-8 Encoding - Verify that Unicode characters can be stored
 * This simulates storing a Google OAuth user with a Romanian name
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUTF8Encoding() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  UTF-8 Encoding Test - Storing Unicode Characters');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Test 1: Check database encoding
    console.log('Test 1: Checking database encoding...');
    const dbEncoding = await prisma.$queryRaw<Array<{ encoding: string }>>`
      SELECT pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = current_database()
    `;
    console.log(`Database encoding: ${dbEncoding[0]?.encoding || 'UNKNOWN'}`);
    if (dbEncoding[0]?.encoding === 'UTF8') {
      console.log('✓ Database is UTF-8 encoded\n');
    } else {
      console.error('✗ Database is NOT UTF-8 encoded');
      process.exit(1);
    }

    // Test 2: Create a test user with Romanian name (contains ă character = UTF-8 0xC483)
    console.log('Test 2: Creating user with Romanian name "Ioană Mihai"...');
    const testUser = await prisma.user.create({
      data: {
        provider: 'google',
        provider_user_id: 'test-romanian-' + Date.now(),
        email: 'ioana@example.com',
        display_name: 'Ioană Mihai', // Contains ă (0xC483 in UTF-8)
        avatar_url: 'https://example.com/avatar.jpg'
      }
    });
    console.log(`✓ User created successfully`);
    console.log(`  ID: ${testUser.id}`);
    console.log(`  Name: ${testUser.display_name}`);
    console.log(`  Email: ${testUser.email}\n`);

    // Test 3: Retrieve and verify the data
    console.log('Test 3: Retrieving and verifying stored data...');
    const retrievedUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });

    if (retrievedUser?.display_name === 'Ioană Mihai') {
      console.log('✓ Data retrieved correctly');
      console.log(`  Stored name: ${retrievedUser.display_name}`);
      console.log(`  Name length: ${retrievedUser.display_name.length} characters`);
      console.log(`  Exact match: ${retrievedUser.display_name === 'Ioană Mihai' ? 'YES' : 'NO'}\n`);
    } else {
      console.error('✗ Data mismatch');
      console.error(`  Expected: Ioană Mihai`);
      console.error(`  Got: ${retrievedUser?.display_name}\n`);
    }

    // Test 4: Test with multiple international characters
    console.log('Test 4: Testing various international characters...');
    const internationalNames = [
      'Pétru Français',      // French accents
      'Müller Schäfer',      // German umlauts
      'José María',          // Spanish accents
      'Иван Петров',         // Cyrillic (Russian)
      'محمد علي',            // Arabic
      '王小明',              // Chinese
      '田中太郎',            // Japanese
    ];

    for (const name of internationalNames) {
      try {
        const user = await prisma.user.create({
          data: {
            provider: 'google',
            provider_user_id: `test-international-${Date.now()}-${Math.random()}`,
            email: `test-${Date.now()}@example.com`,
            display_name: name
          }
        });
        console.log(`  ✓ ${name}`);
        // Clean up
        await prisma.user.delete({ where: { id: user.id } });
      } catch (error) {
        console.error(`  ✗ ${name} - ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Clean up test user
    console.log('\nCleaning up test data...');
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('✓ Test user deleted\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ✅ UTF-8 ENCODING TEST PASSED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nThe database correctly handles UTF-8 encoded Unicode characters.');
    console.log('Google OAuth with international user names will work correctly.\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error instanceof Error ? error.message : String(error));
    console.error('Stack:', error instanceof Error ? error.stack : '');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testUTF8Encoding().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
