/**
 * Database migration script for Habistat
 * 
 * This script applies pending migrations to the SQLite database.
 * It includes verification and error handling to ensure migrations succeed.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = './src/lib/db/habistat.db';
const migrationsPath = './migrations';

console.log('🔄 Starting database migration...');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsPath)) {
  console.error(`❌ Migrations directory not found at ${migrationsPath}`);
  console.log('💡 Run "bun run db:generate" first to create migrations');
  process.exit(1);
}

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`📁 Created database directory: ${dbDir}`);
}

// Create database connection
try {
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);
  
  console.log(`📍 Database: ${dbPath}`);
  console.log(`📦 Migrations: ${migrationsPath}`);
  
  // Apply migrations
  migrate(db, { migrationsFolder: migrationsPath });
  
  // Verify tables were created
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('✅ Migration completed successfully!');
  console.log('📋 Available tables:', tables.map(t => t.name).join(', '));
  
  // Verify userProfile table specifically (since this was the issue)
  const userProfileExists = tables.some(t => t.name === 'userProfile');
  if (userProfileExists) {
    console.log('✅ userProfile table created successfully');
  } else {
    console.warn('⚠️  userProfile table not found - this may cause runtime errors');
  }
  
  sqlite.close();
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
