-- CreateTable: organisations
CREATE TABLE "organisations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: organisations.slug unique
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateTable: users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "wallet_address" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: users.email unique
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex: users.wallet_address unique
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex: users.org_id for lookups
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

-- CreateTable: agents
CREATE TABLE "agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "did" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "public_key" TEXT NOT NULL,
    "registered_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: agents.did unique
CREATE UNIQUE INDEX "agents_did_key" ON "agents"("did");

-- CreateIndex: agents.org_id for lookups
CREATE INDEX "agents_org_id_idx" ON "agents"("org_id");

-- CreateTable: credentials
CREATE TABLE "credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "credential_hash" TEXT NOT NULL,
    "schema_hash" TEXT NOT NULL,
    "ipfs_cid" TEXT,
    "credential_data_cached" JSONB,
    "mandate_params_encrypted" BYTEA,
    "mandate_key_version" INTEGER NOT NULL DEFAULT 1,
    "expiry" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "registered_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: credentials.credential_hash unique
CREATE UNIQUE INDEX "credentials_credential_hash_key" ON "credentials"("credential_hash");

-- CreateIndex: credentials lookups
CREATE INDEX "credentials_org_id_idx" ON "credentials"("org_id");
CREATE INDEX "credentials_agent_id_idx" ON "credentials"("agent_id");
CREATE INDEX "credentials_schema_hash_idx" ON "credentials"("schema_hash");

-- CreateTable: sessions
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "initiator_agent_id" UUID NOT NULL,
    "initiator_org_id" UUID NOT NULL,
    "counterparty_agent_id" UUID NOT NULL,
    "counterparty_org_id" UUID NOT NULL,
    "session_type" TEXT NOT NULL DEFAULT 'intra_org',
    "invite_token_hash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "session_config" JSONB NOT NULL DEFAULT '{}',
    "merkle_root" TEXT,
    "turn_count" INTEGER NOT NULL DEFAULT 0,
    "anchor_tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: sessions indexes (matching @@index in schema)
CREATE INDEX "sessions_initiator_agent_id_idx" ON "sessions"("initiator_agent_id");
CREATE INDEX "sessions_counterparty_agent_id_idx" ON "sessions"("counterparty_agent_id");
CREATE INDEX "sessions_initiator_org_id_idx" ON "sessions"("initiator_org_id");
CREATE INDEX "sessions_counterparty_org_id_idx" ON "sessions"("counterparty_org_id");
CREATE INDEX "sessions_status_idx" ON "sessions"("status");

-- CreateTable: turns
CREATE TABLE "turns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "terms" JSONB NOT NULL,
    "proof_type" TEXT NOT NULL,
    "proof" JSONB NOT NULL,
    "public_signals" JSONB NOT NULL,
    "signature" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "turns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: turns unique constraint on (session_id, sequence_number)
CREATE UNIQUE INDEX "turns_session_id_sequence_number_key" ON "turns"("session_id", "sequence_number");

-- CreateIndex: turns lookups
CREATE INDEX "turns_session_id_idx" ON "turns"("session_id");
CREATE INDEX "turns_agent_id_idx" ON "turns"("agent_id");

-- CreateTable: commitments
CREATE TABLE "commitments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "agreement_hash" TEXT NOT NULL,
    "parties" TEXT[],
    "credential_hashes" TEXT[],
    "proofs" JSONB NOT NULL,
    "circuit_versions" TEXT[],
    "tx_hash" TEXT,
    "block_number" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "commitments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: commitments.session_id unique (one commitment per session)
CREATE UNIQUE INDEX "commitments_session_id_key" ON "commitments"("session_id");

-- CreateIndex: commitments.tx_hash for chain lookups
CREATE INDEX "commitments_tx_hash_idx" ON "commitments"("tx_hash");

-- CreateTable: api_keys
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "key_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scopes" TEXT[],
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: api_keys.key_hash unique
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex: api_keys.org_id for lookups
CREATE INDEX "api_keys_org_id_idx" ON "api_keys"("org_id");

-- CreateTable: webhooks
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret_hash" TEXT NOT NULL,
    "events" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: webhooks.org_id for lookups
CREATE INDEX "webhooks_org_id_idx" ON "webhooks"("org_id");

-- CreateTable: webhook_deliveries
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "webhook_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempted_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: webhook_deliveries lookups
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries"("webhook_id");
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");

-- AddForeignKey: users -> organisations
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: agents -> organisations
ALTER TABLE "agents" ADD CONSTRAINT "agents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: credentials -> organisations
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: credentials -> agents
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: sessions -> agents (initiator)
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_initiator_agent_id_fkey" FOREIGN KEY ("initiator_agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: sessions -> organisations (initiator)
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_initiator_org_id_fkey" FOREIGN KEY ("initiator_org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: sessions -> agents (counterparty)
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_counterparty_agent_id_fkey" FOREIGN KEY ("counterparty_agent_id") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: sessions -> organisations (counterparty)
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_counterparty_org_id_fkey" FOREIGN KEY ("counterparty_org_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: turns -> sessions
ALTER TABLE "turns" ADD CONSTRAINT "turns_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: turns -> agents
ALTER TABLE "turns" ADD CONSTRAINT "turns_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: commitments -> sessions
ALTER TABLE "commitments" ADD CONSTRAINT "commitments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: api_keys -> organisations
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: webhooks -> organisations
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: webhook_deliveries -> webhooks
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
