import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import fs from 'fs';

const dbPath = './src/lib/db/habistat.db';

// Ensure the database file exists before attempting to connect
if (!fs.existsSync(dbPath)) {
  console.log(`Database file not found at ${dbPath}. Creating a new one.`);
  // new Database(dbPath) will create the file if it doesn't exist
}

const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log('Running migrations...');

migrate(db, { migrationsFolder: './migrations' });

console.log('Migrations applied successfully!');

sqlite.close();
