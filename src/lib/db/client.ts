// Cross-platform Drizzle client setup for SQLite
// - Browser: sql.js (WASM) with IndexedDB persistence
// - Tauri/Node: better-sqlite3 (via server.ts)

// Debug configuration - set to true to enable verbose logging
const DEBUG_VERBOSE = false;

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import * as schema from "$lib/db/schema";
import productionInitSql from "../../../production-init.sql?raw";

// Use global variables to hold the db instance and readiness flags.
// We delay marking migrations as complete to avoid race conditions where
// callers obtain a usable db instance before migrations/guards run.
declare global {
  var dbInstance:
    | LibSQLDatabase<typeof schema>
    | BetterSQLite3Database<typeof schema>
    | SQLJsDatabase<typeof schema>
    | null;
  var dbPromise: Promise<
    | LibSQLDatabase<typeof schema>
    | BetterSQLite3Database<typeof schema>
    | SQLJsDatabase<typeof schema>
  > | null;
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
export async function getDb(): Promise<
  | LibSQLDatabase<typeof schema>
  | BetterSQLite3Database<typeof schema>
  | SQLJsDatabase<typeof schema>
> {
  // Return cached instance if initialized
  if (globalThis.dbInstance) return globalThis.dbInstance;

  if (!globalThis.dbPromise) {
    // Use `import.meta.env.SSR` which is true in Node/Tauri and false in the browser.
    // This allows Vite/SvelteKit to tree-shake the unused module path.
    if (import.meta.env.SSR) {
      // Dynamically import the server-side DB initializer.
      // This prevents `better-sqlite3` from being bundled in the browser build.
      globalThis.dbPromise = import("./server.ts").then((module) => module.initializeNodeDb());
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

async function loadSqlJsDb(SQL: SqlJsStatic): Promise<SqlJsDatabase> {
  const idb = await openIndexedDB();

  const processDb = (db: SqlJsDatabase, isNew: boolean) => {
    try {
      if (isNew) {
        // For a new database, run the full production initialization script.
        // This script creates all tables in their production shape.
        console.log("New database detected, running production initialization script...");
        db.exec(productionInitSql);
        console.log("Production initialization script completed.");
      } else {
        // For an existing database, load as-is (no migrations, no guards)
        if (DEBUG_VERBOSE) {
          console.log("Existing database detected; loading without migrations or guards.");
        }
      }
    } catch (e: unknown) {
      console.error("A critical error occurred during database setup:", e);
      throw new Error("Database setup failed, the database might be corrupt.");
    }
    return db;
  };

  return new Promise<SqlJsDatabase>((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const getReq = store.get(DB_KEY);

    getReq.onsuccess = () => {
      try {
        const dbData = getReq.result;
        const isNew = !dbData;
        const db = isNew
          ? new SQL.Database()
          : new SQL.Database(new Uint8Array(dbData as ArrayBuffer));
        resolve(processDb(db, isNew));
      } catch (e) {
        reject(e);
      }
    };
    getReq.onerror = (event) => {
      if (DEBUG_VERBOSE) {
        console.warn("IndexedDB read failed, creating a new database.", event);
      }
      try {
        const newDb = new SQL.Database();
        resolve(processDb(newDb, true));
      } catch (e) {
        reject(e);
      }
    };
  });
}

async function saveSqlJsDb(db: SqlJsDatabase) {
  // Always vacuum to minimize file size before export
  db.run("VACUUM");
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

let browserSqliteInstance: SqlJsDatabase | null = null;

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
    // Create the Drizzle db wrapper
    const drizzleDb = drizzle(browserSqliteInstance, {
      schema,
      logger: false
    });
    globalThis.dbInstance = drizzleDb;
    return drizzleDb;
  } catch (error) {
    console.error("Failed to initialize browser database:", error);
    globalThis.dbInstance = null;
    throw error;
  }
}

// Export the getDb function as getDrizzleDb for consistency with other files
export const getDrizzleDb = getDb;
