#!/usr/bin/env node

import { execSync } from 'child_process';

try {
  console.log('Applying schema changes to database...');
  // Force yes to prompts with the --yes flag
  execSync('npx drizzle-kit push --yes', { stdio: 'inherit' });
  console.log('Schema changes applied successfully!');
} catch (error) {
  console.error('Error applying schema changes:', error.message);
  process.exit(1);
}