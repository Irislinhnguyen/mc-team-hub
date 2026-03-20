/**
 * Generate bcrypt password hashes for test users
 * Run from apps/web directory: node scripts/generate-passwords.js
 */

const bcrypt = require('bcryptjs');

const testUsers = [
  { email: 'test-admin@example.com', password: 'Admin123!', name: 'Test Admin', role: 'admin' },
  { email: 'test-manager@example.com', password: 'Manager123!', name: 'Test Manager', role: 'manager' },
  { email: 'test-leader@example.com', password: 'Leader123!', name: 'Test Leader', role: 'leader' },
  { email: 'test-user@example.com', password: 'User123!', name: 'Test User', role: 'member' },
];

async function generatePasswords() {
  console.log('Generating bcrypt password hashes for test users...\n');

  for (const user of testUsers) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log(`-- ${user.name} (${user.role})`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Hash: ${hash}`);
    console.log('');

    // Also generate SQL for insertion
    console.log(`INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)`);
    console.log(`VALUES (gen_random_uuid(), '${user.email}', '${user.name}', '${user.role}', '${hash}', NOW(), NOW());`);
    console.log('');
  }
}

generatePasswords().catch(console.error);
