/**
 * Generate bcrypt password hashes for test users
 * Run with: node scripts/generate-test-passwords.cjs
 */

const bcrypt = require('./node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs');

const testUsers = [
  { email: 'test-admin@example.com', password: 'Admin123!', name: 'Test Admin', role: 'admin' },
  { email: 'test-manager@example.com', password: 'Manager123!', name: 'Test Manager', role: 'manager' },
  { email: 'test-leader@example.com', password: 'Leader123!', name: 'Test Leader', role: 'leader' },
  { email: 'test-user@example.com', password: 'User123!', name: 'Test User', role: 'member' },
];

async function generatePasswords() {
  console.log('Generating bcrypt password hashes...\n');

  for (const user of testUsers) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log(`-- ${user.name} (${user.role})`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${user.password}`);
    console.log(`Hash: ${hash}`);
    console.log('');
  }
}

generatePasswords().catch(console.error);