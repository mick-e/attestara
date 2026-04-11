-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_counterparty_agent_id_fkey";

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "counterparty_agent_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_counterparty_agent_id_fkey" FOREIGN KEY ("counterparty_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
