/**
 * Database reset script for Habistat
 * 
 * This script safely resets the local SQLite database by:
 * 1. Backing up the existing database (if it exists)
 * 2. Removing the current database file
 * 3. Running migrations to create fresh tables
 * 
 * Usage: bun run db:reset
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = './src/lib/db/habistat.db';
const backupDir = './backups';

console.log('🔄 Starting database reset...');

// Create backups directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Backup existing database if it exists
if (fs.existsSync(dbPath)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `habistat-backup-${timestamp}.db`);
  
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`✅ Database backed up to: ${backupPath}`);
  } catch (error) {
    console.warn(`⚠️  Failed to backup database: ${error.message}`);
  }
  
  // Remove the existing database
  fs.unlinkSync(dbPath);
  console.log('🗑️  Existing database removed');
}

// Create fresh database and run migrations
try {
  console.log('🏗️  Creating fresh database...');
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);
  
  console.log('📦 Running migrations...');
  migrate(db, { migrationsFolder: './migrations' });
  
  console.log('✅ Database reset completed successfully!');
  console.log(`📍 New database created at: ${dbPath}`);
  
  // Verify tables were created
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('📋 Created tables:', tables.map(t => t.name).join(', '));
  
  sqlite.close();
} catch (error) {
  console.error('❌ Database reset failed:', error.message);
  process.exit(1);
}
