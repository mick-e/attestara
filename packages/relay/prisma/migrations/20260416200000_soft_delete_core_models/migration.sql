-- Add soft delete (deletedAt) columns to core models

ALTER TABLE "organisations" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "agents" ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "credentials" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Create indexes for efficient soft-delete filtering
CREATE INDEX "organisations_deleted_at_idx" ON "organisations"("deleted_at");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
CREATE INDEX "agents_deleted_at_idx" ON "agents"("deleted_at");
CREATE INDEX "credentials_deleted_at_idx" ON "credentials"("deleted_at");
