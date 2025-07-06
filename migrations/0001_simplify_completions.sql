-- Migration to ultra-simplify completions table
-- Remove notes, durationSpentSeconds, isDeleted, createdAt, and updatedAt columns
-- Keep only: id, userId, habitId, completedAt

-- Create new ultra-simplified completions table
CREATE TABLE completions_new (
  id TEXT PRIMARY KEY,
  userId TEXT,
  habitId TEXT NOT NULL,
  completedAt INTEGER NOT NULL
);

-- Copy existing data (excluding soft-deleted records)
INSERT INTO completions_new (id, userId, habitId, completedAt)
SELECT id, userId, habitId, completedAt
FROM completions
WHERE isDeleted = 0 OR isDeleted IS NULL;

-- Drop old table
DROP TABLE completions;

-- Rename new table
ALTER TABLE completions_new RENAME TO completions;