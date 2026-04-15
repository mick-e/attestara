-- AlterTable: add 7-day default expiry for sessions.
-- NOT NULL with a DB-side DEFAULT ensures existing rows are backfilled
-- (expires_at = NOW() + 7 days at migration time) without a two-phase migration.
ALTER TABLE "sessions" ADD COLUMN "expires_at" TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '7 days');
