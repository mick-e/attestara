-- AddIndex: User.orgId
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

-- AddIndex: Agent.orgId
CREATE INDEX "agents_org_id_idx" ON "agents"("org_id");

-- AddIndex: Credential.orgId
CREATE INDEX "credentials_org_id_idx" ON "credentials"("org_id");

-- AddIndex: Credential.agentId
CREATE INDEX "credentials_agent_id_idx" ON "credentials"("agent_id");

-- AddIndex: Credential.expiry
CREATE INDEX "credentials_expiry_idx" ON "credentials"("expiry");

-- AddIndex: ApiKey.orgId
CREATE INDEX "api_keys_org_id_idx" ON "api_keys"("org_id");

-- AddIndex: ApiKey.expiresAt
CREATE INDEX "api_keys_expires_at_idx" ON "api_keys"("expires_at");

-- AddIndex: Webhook.orgId
CREATE INDEX "webhooks_org_id_idx" ON "webhooks"("org_id");

-- AddIndex: Webhook.active
CREATE INDEX "webhooks_active_idx" ON "webhooks"("active");

-- AddIndex: WebhookDelivery.webhookId
CREATE INDEX "webhook_deliveries_webhook_id_idx" ON "webhook_deliveries"("webhook_id");

-- AddIndex: Invite.orgId
CREATE INDEX "invites_org_id_idx" ON "invites"("org_id");

-- AddIndex: Turn.sessionId
CREATE INDEX "turns_session_id_idx" ON "turns"("session_id");

-- AddIndex: Turn.agentId
CREATE INDEX "turns_agent_id_idx" ON "turns"("agent_id");
