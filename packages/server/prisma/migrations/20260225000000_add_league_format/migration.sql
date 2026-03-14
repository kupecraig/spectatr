-- AlterTable: add format column to leagues
-- Default 'classic' covers all existing rows — no backfill needed.
ALTER TABLE "leagues" ADD COLUMN "format" TEXT NOT NULL DEFAULT 'classic';
