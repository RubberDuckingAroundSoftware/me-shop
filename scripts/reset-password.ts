#!/usr/bin/env tsx
/**
 * CLI password reset for self-hosted meShop.
 * Usage: pnpm auth:reset-password <email>
 */
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const DB_PATH = process.env.DATABASE_PATH || './db/meshop.db';

interface UserRow {
  id: string;
  email: string;
  name: string;
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: pnpm auth:reset-password <email>');
    console.error('Example: pnpm auth:reset-password demo@meshop.world');
    process.exit(1);
  }

  const db = new Database(resolve(DB_PATH));
  const user = db
    .prepare('SELECT id, email, name FROM users WHERE email = ?')
    .get(email.toLowerCase()) as UserRow | undefined;

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Resetting password for: ${user.name} (${user.email})`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const newPassword = await new Promise<string>((res) => {
    rl.question('New password (min 8 chars): ', res);
  });
  rl.close();

  if (newPassword.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(
    "UPDATE users SET password = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?"
  ).run(hash, user.id);

  console.log('Password updated successfully.');
  db.close();
}

main();
