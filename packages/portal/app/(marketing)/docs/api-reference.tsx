"use client";

import { useState, useMemo } from "react";

/**
 * Searchable API Reference component.
 * Embeds the Relay API endpoints in a searchable, categorised view.
 * In production, this would load the OpenAPI spec from the relay.
 * For now it uses a static endpoint catalogue.
 */

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  tag: string;
  auth: boolean;
}

const ENDPOINTS: Endpoint[] = [
  // Auth
  { method: "POST", path: "/v1/auth/register", summary: "Register a new user and organisation", tag: "Auth", auth: false },
  { method: "POST", path: "/v1/auth/login", summary: "Authenticate with email and password", tag: "Auth", auth: false },
  { method: "POST", path: "/v1/auth/refresh", summary: "Refresh access token", tag: "Auth", auth: false },
  { method: "POST", path: "/v1/auth/wallet/nonce", summary: "Request a SIWE nonce", tag: "Auth", auth: false },
  { method: "POST", path: "/v1/auth/wallet/verify", summary: "Verify SIWE signature", tag: "Auth", auth: false },
  // Orgs
  { method: "POST", path: "/v1/orgs", summary: "Create an organisation", tag: "Orgs", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId", summary: "Get organisation by ID", tag: "Orgs", auth: true },
  { method: "PATCH", path: "/v1/orgs/:orgId", summary: "Update an organisation", tag: "Orgs", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId/members", summary: "List organisation members", tag: "Orgs", auth: true },
  { method: "POST", path: "/v1/orgs/:orgId/invite", summary: "Invite a user to an organisation", tag: "Orgs", auth: true },
  // Agents
  { method: "POST", path: "/v1/orgs/:orgId/agents", summary: "Register an agent", tag: "Agents", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId/agents", summary: "List agents for an organisation", tag: "Agents", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId/agents/:agentId", summary: "Get agent by ID", tag: "Agents", auth: true },
  { method: "PATCH", path: "/v1/orgs/:orgId/agents/:agentId", summary: "Update an agent", tag: "Agents", auth: true },
  { method: "DELETE", path: "/v1/orgs/:orgId/agents/:agentId", summary: "Deactivate an agent", tag: "Agents", auth: true },
  { method: "POST", path: "/v1/agents/provision-did", summary: "Provision a DID for an agent", tag: "Agents", auth: true },
  // Credentials
  { method: "POST", path: "/v1/orgs/:orgId/credentials", summary: "Create a credential", tag: "Credentials", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId/credentials", summary: "List credentials for an organisation", tag: "Credentials", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId/credentials/:id", summary: "Get credential by ID", tag: "Credentials", auth: true },
  { method: "DELETE", path: "/v1/orgs/:orgId/credentials/:id", summary: "Revoke a credential", tag: "Credentials", auth: true },
  // Sessions
  { method: "POST", path: "/v1/sessions", summary: "Create a negotiation session", tag: "Sessions", auth: true },
  { method: "GET", path: "/v1/sessions", summary: "List negotiation sessions", tag: "Sessions", auth: true },
  { method: "GET", path: "/v1/sessions/:sessionId", summary: "Get session by ID", tag: "Sessions", auth: true },
  { method: "GET", path: "/v1/sessions/:sessionId/turns", summary: "List turns in a session", tag: "Sessions", auth: true },
  { method: "POST", path: "/v1/sessions/:sessionId/turns", summary: "Submit a negotiation turn", tag: "Sessions", auth: true },
  { method: "POST", path: "/v1/sessions/:sessionId/invite", summary: "Generate an invite token", tag: "Sessions", auth: true },
  { method: "POST", path: "/v1/sessions/:sessionId/accept", summary: "Accept a session invite", tag: "Sessions", auth: true },
  { method: "POST", path: "/v1/sessions/:sessionId/abandon", summary: "Abandon a session", tag: "Sessions", auth: true },
  // Commitments
  { method: "POST", path: "/v1/sessions/:sessionId/commitment", summary: "Anchor a commitment", tag: "Commitments", auth: true },
  { method: "GET", path: "/v1/commitments", summary: "List commitments", tag: "Commitments", auth: true },
  { method: "GET", path: "/v1/commitments/:id", summary: "Get commitment by ID", tag: "Commitments", auth: true },
  { method: "POST", path: "/v1/commitments/:id/verify", summary: "Verify a commitment", tag: "Commitments", auth: true },
  // API Keys
  { method: "POST", path: "/v1/orgs/:orgId/api-keys", summary: "Create an API key", tag: "API Keys", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId/api-keys", summary: "List API keys", tag: "API Keys", auth: true },
  { method: "DELETE", path: "/v1/orgs/:orgId/api-keys/:id", summary: "Revoke an API key", tag: "API Keys", auth: true },
  // Webhooks
  { method: "POST", path: "/v1/orgs/:orgId/webhooks", summary: "Register a webhook", tag: "Webhooks", auth: true },
  { method: "GET", path: "/v1/orgs/:orgId/webhooks", summary: "List webhooks", tag: "Webhooks", auth: true },
  { method: "DELETE", path: "/v1/orgs/:orgId/webhooks/:id", summary: "Delete a webhook", tag: "Webhooks", auth: true },
  // Analytics
  { method: "GET", path: "/v1/orgs/:orgId/analytics", summary: "Get organisation analytics", tag: "Analytics", auth: true },
  { method: "GET", path: "/v1/analytics/timeseries", summary: "Get timeseries analytics", tag: "Analytics", auth: true },
  // Billing
  { method: "GET", path: "/v1/billing/usage", summary: "Get billing usage", tag: "Billing", auth: true },
  { method: "GET", path: "/v1/billing/plan", summary: "Get billing plan", tag: "Billing", auth: true },
  { method: "POST", path: "/v1/billing/topup", summary: "Top up credits", tag: "Billing", auth: true },
  // Admin
  { method: "GET", path: "/v1/admin/stats", summary: "Get platform statistics", tag: "Admin", auth: true },
  { method: "POST", path: "/v1/admin/indexer/backfill", summary: "Trigger indexer backfill", tag: "Admin", auth: true },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400",
  POST: "bg-blue-500/20 text-blue-400",
  PATCH: "bg-amber-500/20 text-amber-400",
  DELETE: "bg-red-500/20 text-red-400",
};

export function ApiReference() {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const tags = useMemo(
    () => Array.from(new Set(ENDPOINTS.map((e) => e.tag))),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return ENDPOINTS.filter((ep) => {
      const matchesTag = !selectedTag || ep.tag === selectedTag;
      const matchesSearch =
        !q ||
        ep.path.toLowerCase().includes(q) ||
        ep.summary.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q) ||
        ep.tag.toLowerCase().includes(q);
      return matchesTag && matchesSearch;
    });
  }, [search, selectedTag]);

  const groupedByTag = useMemo(() => {
    const groups: Record<string, Endpoint[]> = {};
    for (const ep of filtered) {
      if (!groups[ep.tag]) groups[ep.tag] = [];
      groups[ep.tag].push(ep);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="rounded-xl border border-navy-800 bg-navy-900 p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">API Reference</h2>
          <p className="mt-1 text-sm text-navy-400">
            {filtered.length} endpoints &middot; Relay server at localhost:3001
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="http://localhost:3001/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-navy-700 px-3 py-1.5 text-xs text-navy-300 transition-colors hover:bg-navy-800 hover:text-white"
          >
            Open Swagger UI &rarr;
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search endpoints (e.g., agents, POST, credentials)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-navy-700 bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 outline-none transition-colors focus:border-accent/60 focus:ring-1 focus:ring-accent/30"
        />
      </div>

      {/* Tag filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag(null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !selectedTag
              ? "bg-accent/20 text-accent"
              : "bg-navy-800 text-navy-400 hover:text-white"
          }`}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedTag === tag
                ? "bg-accent/20 text-accent"
                : "bg-navy-800 text-navy-400 hover:text-white"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Endpoint list */}
      <div className="space-y-6">
        {Object.entries(groupedByTag).map(([tag, endpoints]) => (
          <div key={tag}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-navy-400">
              {tag}
            </h3>
            <div className="space-y-1">
              {endpoints.map((ep) => (
                <div
                  key={`${ep.method}-${ep.path}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-navy-800/60"
                >
                  <span
                    className={`inline-block w-16 rounded px-2 py-0.5 text-center text-xs font-bold ${METHOD_COLORS[ep.method] ?? "bg-navy-700 text-navy-300"}`}
                  >
                    {ep.method}
                  </span>
                  <code className="flex-1 text-sm text-navy-200">
                    {ep.path}
                  </code>
                  <span className="hidden text-sm text-navy-400 sm:inline">
                    {ep.summary}
                  </span>
                  {ep.auth && (
                    <span className="rounded bg-navy-700 px-1.5 py-0.5 text-[10px] text-navy-400">
                      AUTH
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-navy-500">
          No endpoints match your search.
        </p>
      )}
    </div>
  );
}
