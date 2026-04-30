-- AlterTable: add single-use tracking for session invite tokens
ALTER TABLE "sessions" ADD COLUMN "invite_consumed_at" TIMESTAMP(3);
