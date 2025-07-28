
/**
 * Database Table Fixer
 * Run this in the browser console on your app to fix missing tables
 */

(async function fixDatabaseTables() {
  console.log('🔧 Fixing database tables...');

  try {
    // Import the database client
    const { getDb } = await import('/src/lib/db/client.js');
    const db = await getDb();

    if (!db) {
      console.error('❌ Database not initialized');
      return;
    }

    // Create all required tables
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS calendars (
        id TEXT PRIMARY KEY,
        userId TEXT,
        name TEXT NOT NULL,
        colorTheme TEXT NOT NULL,
        position INTEGER NOT NULL,
        isEnabled INTEGER DEFAULT 1 NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        userId TEXT,
        calendarId TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        timerEnabled INTEGER DEFAULT 0 NOT NULL,
        targetDurationSeconds INTEGER,
        pointsValue INTEGER DEFAULT 0,
        position INTEGER NOT NULL,
        isEnabled INTEGER DEFAULT 1 NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS completions (
        id TEXT PRIMARY KEY,
        userId TEXT,
        habitId TEXT NOT NULL,
        completedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS activeTimers (
        id TEXT PRIMARY KEY,
        userId TEXT,
        habitId TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        pausedTime INTEGER,
        totalPausedDurationSeconds INTEGER DEFAULT 0 NOT NULL,
        status TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS appOpens (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS syncMetadata (
        id TEXT PRIMARY KEY,
        lastSyncTimestamp INTEGER DEFAULT 0 NOT NULL
      );

      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY
      );
    `;

    await db.run(createTablesSQL);

    // Mark migrations as applied
    await db.run(`
      INSERT OR IGNORE INTO _migrations (name) VALUES
      ('0000_initial.sql'),
      ('0001_simplify_completions.sql')
    `);

    console.log('✅ Database tables created successfully!');
    console.log('🔄 Refresh the page to see if issues are resolved');

    // Verify tables were created
    const tables = await db.run("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('📋 Tables now present:', tables.rows?.map(r => r.name) || []);

  } catch (error) {
    console.error('❌ Failed to fix database:', error);
  }
})();
