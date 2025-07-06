// Cross-platform Drizzle client setup for SQLite
// - Browser: sql.js (WASM) with IndexedDB persistence
// - Tauri/Node: better-sqlite3 (via server.ts)

import * as schema from "$lib/db/schema";
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

// This is a dynamic import that Vite will handle.
// It imports the content of all migration files as raw strings.
// The migration files are sorted by name to ensure they are applied in order.
const migrationModules = import.meta.glob("../../../migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true
});
export const migrationQueries = Object.entries(migrationModules)
  .map(([path, query]) => ({
    path,
    query: query as string,
    name: path.split("/").pop()!
  }))
  .sort((a, b) => {
    const aPrefix = parseInt(a.name.split("_")[0], 10);
    const bPrefix = parseInt(b.name.split("_")[0], 10);
    return aPrefix - bPrefix;
  });

// Use a global variable to hold the db instance, which will be set by
// the platform-specific initialization code.
declare global {
  var dbInstance: any;
  var dbPromise: Promise<any> | null;
}

globalThis.dbInstance = globalThis.dbInstance ?? null;
globalThis.dbPromise = globalThis.dbPromise ?? null;

/**
 * Initializes and returns the Drizzle ORM database instance.
 * It ensures that the database is initialized only once.
 *
 * This function is cross-platform:
 * - In the browser, it uses `sql.js` with IndexedDB for persistence.
 * - In a Node.js/Tauri environment, it dynamically imports a server-specific
 *   module to use `better-sqlite3` for native performance.
 *
 * @returns {Promise<any>} A promise that resolves with the database instance.
 */
export async function getDb(): Promise<any> {
  if (globalThis.dbInstance) {
    return globalThis.dbInstance;
  }

  if (!globalThis.dbPromise) {
    // Use `import.meta.env.SSR` which is true in Node/Tauri and false in the browser.
    // This allows Vite/SvelteKit to tree-shake the unused module path.
    if (import.meta.env.SSR) {
      // Dynamically import the server-side DB initializer.
      // This prevents `better-sqlite3` from being bundled in the browser build.
      globalThis.dbPromise = import("./server.server.ts").then((module) =>
        module.initializeNodeDb()
      );
    } else {
      globalThis.dbPromise = initializeBrowserDb();
    }
  }

  try {
    await globalThis.dbPromise;
    if (!globalThis.dbInstance) {
      throw new Error("Database instance is null after initialization");
    }
    return globalThis.dbInstance;
  } catch (error) {
    console.error("Failed to get database instance:", error);
    // Reset the promise so we can try again
    globalThis.dbPromise = null;
    throw error;
  }
}

// --- Browser-specific (sql.js) Implementation ---

// IndexedDB helpers for sql.js persistence
const DB_NAME = "habistat-sqljs-db";
const DB_STORE = "sqlite";
const DB_KEY = "main";

function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadSqlJsDb(SQL: any): Promise<any> {
  const idb = await openIndexedDB();

  const processDb = (db: any) => {
    try {
      // Create migrations table if it doesn't exist
      db.run("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)");

      // Get list of applied migrations
      const appliedMigrationsStmt = db.prepare("SELECT name FROM _migrations");
      const appliedMigrationNames = new Set<string>();
      while (appliedMigrationsStmt.step()) {
        appliedMigrationNames.add(appliedMigrationsStmt.get()[0] as string);
      }
      appliedMigrationsStmt.free();

      const migrationsToApply = migrationQueries.filter((m) => !appliedMigrationNames.has(m.name));

      if (migrationsToApply.length > 0) {
        for (const migration of migrationsToApply) {
          try {
            const cleanQuery = migration.query.replace(/--> statement-breakpoint/g, "");
            db.run(cleanQuery);

            // Mark migration as applied
            const stmt = db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES (?)");
            stmt.bind([migration.name]);
            stmt.step();
            stmt.free();
          } catch (migrationError: any) {
            // For development, we'll continue with other migrations instead of failing completely
            // This helps with migration conflicts during development
            if (migrationError.message.includes("already exists")) {
              // Still mark it as applied to prevent future attempts
              const stmt = db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES (?)");
              stmt.bind([migration.name]);
              stmt.step();
              stmt.free();
            } else {
              throw migrationError;
            }
          }
        }
      }
    } catch (e: any) {
      console.error("A critical error occurred during migration:", e);
      throw new Error("Migration failed, database might be corrupt.");
    }
    return db;
  };

  return new Promise<any>((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const getReq = store.get(DB_KEY);

    getReq.onsuccess = () => {
      try {
        const db = getReq.result
          ? new SQL.Database(new Uint8Array(getReq.result))
          : new SQL.Database();
        resolve(processDb(db));
      } catch (e) {
        reject(e);
      }
    };
    getReq.onerror = () => {
      try {
        const newDb = new SQL.Database();
        resolve(processDb(newDb));
      } catch (e) {
        reject(e);
      }
    };
  });
}

async function saveSqlJsDb(db: any) {
  const idb = await openIndexedDB();
  return new Promise<void>((resolve, reject) => {
    const data = db.export();
    const tx = idb.transaction(DB_STORE, "readwrite");
    const store = tx.objectStore(DB_STORE);
    const putReq = store.put(data, DB_KEY);
    putReq.onsuccess = () => resolve();
    putReq.onerror = () => reject(putReq.error);
  });
}

let browserSqliteInstance: any = null;

export async function persistBrowserDb() {
  if (browserSqliteInstance) {
    await saveSqlJsDb(browserSqliteInstance);
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

async function initializeBrowserDb() {
  try {
    const { drizzle } = await import("drizzle-orm/sql-js");
    const SQL = await withTimeout(initSqlJs({ locateFile: () => wasmUrl }), 10000, "sql.js init");
    browserSqliteInstance = await withTimeout(loadSqlJsDb(SQL), 15000, "DB load from IndexedDB");
    globalThis.dbInstance = drizzle(browserSqliteInstance, { schema, logger: false });

    // Run custom migrations for sync support
    try {
      const { MigrationService } = await import("../services/migration");
      await MigrationService.runMigrations();
    } catch (migrationError) {
      console.warn("Custom migrations failed, continuing:", migrationError);
    }
  } catch (error) {
    console.error("Failed to initialize browser database:", error);
    globalThis.dbInstance = null;
    throw error;
  }
}

// Export the getDb function as getDrizzleDb for consistency with other files
export const getDrizzleDb = getDb;
