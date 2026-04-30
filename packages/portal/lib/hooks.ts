"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  ApiError,
  type Agent,
  type Session,
  type Credential,
  type Org,
  type OrgMember,
  type Paginated,
  type AuthResponse,
  type TimeseriesResponse,
  type ProofLatencyResponse,
  type BillingUsageResponse,
  type BillingPlanResponse,
  type WebhookResponse,
  type WebhookDeliveryResponse,
} from "./api-client";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth";

// ─── Generic fetch hook ─────────────────────────────────────────────────────

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

function useFetch<T>(
  fetcher: (() => Promise<T>) | null,
  deps: unknown[] = [],
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(() => {
    if (!fetcher) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "An error occurred");
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ─── Auth Hook ──────────────────────────────────────────────────────────────

interface AuthState {
  user: AuthResponse["user"] | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    orgName: string;
    walletAddress?: string;
  }) => Promise<void>;
  logout: () => void;
  error: string | null;
}

export function useAuth(): AuthState {
  const router = useRouter();
  const [user, setUser] = useState<AuthResponse["user"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore token on mount
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      apiClient.setToken(token);
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.auth.login(email, password);
        setTokens(res.accessToken, res.refreshToken);
        apiClient.setToken(res.accessToken);
        setUser(res.user);
        router.push("/");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      orgName: string;
      walletAddress?: string;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.auth.register(data);
        setTokens(res.accessToken, res.refreshToken);
        apiClient.setToken(res.accessToken);
        setUser(res.user);
        router.push("/");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Registration failed";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    clearTokens();
    apiClient.clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return {
    user,
    isAuthenticated: !!getAccessToken(),
    loading,
    login,
    register,
    logout,
    error,
  };
}

// ─── User context helper ────────────────────────────────────────────────────

/** Reads the orgId from the stored JWT access token (base64 payload). */
export function getOrgIdFromToken(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.orgId ?? null;
  } catch {
    return null;
  }
}

// ─── Agents ─────────────────────────────────────────────────────────────────

export function useAgents(): FetchState<Agent[]> {
  const orgId = getOrgIdFromToken();
  const result = useFetch<Paginated<Agent>>(
    orgId ? () => apiClient.agents.list(orgId) : null,
    [orgId],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useAgent(id: string): FetchState<Agent> {
  const orgId = getOrgIdFromToken();
  return useFetch<Agent>(
    orgId && id ? () => apiClient.agents.get(orgId, id) : null,
    [orgId, id],
  );
}

export function useCreateAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAgent = useCallback(
    async (data: {
      did: string;
      name: string;
      publicKey: string;
      metadata?: Record<string, unknown>;
    }) => {
      const orgId = getOrgIdFromToken();
      if (!orgId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const agent = await apiClient.agents.create(orgId, data);
        return agent;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create agent";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { createAgent, loading, error };
}

export function useDeleteAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAgent = useCallback(async (agentId: string) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      await apiClient.agents.delete(orgId, agentId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to deactivate agent";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteAgent, loading, error };
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export function useSessions(): FetchState<Session[]> {
  const result = useFetch<Paginated<Session>>(
    () => apiClient.sessions.list(),
    [],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useSession(id: string): FetchState<Session> {
  return useFetch<Session>(
    id ? () => apiClient.sessions.get(id) : null,
    [id],
  );
}

export function useCreateSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(
    async (data: {
      initiatorAgentId: string;
      counterpartyAgentId: string;
      initiatorOrgId: string;
      counterpartyOrgId: string;
      sessionType?: "intra_org" | "cross_org";
      sessionConfig?: Record<string, unknown>;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const session = await apiClient.sessions.create(data);
        return session;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create session";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { createSession, loading, error };
}

// ─── Credentials ────────────────────────────────────────────────────────────

export function useCredentials(): FetchState<Credential[]> {
  const orgId = getOrgIdFromToken();
  const result = useFetch<Paginated<Credential>>(
    orgId ? () => apiClient.credentials.list(orgId) : null,
    [orgId],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useCredential(id: string): FetchState<Credential> {
  const orgId = getOrgIdFromToken();
  return useFetch<Credential>(
    orgId && id ? () => apiClient.credentials.get(orgId, id) : null,
    [orgId, id],
  );
}

export function useRevokeCredential() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokeCredential = useCallback(async (credentialId: string) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      await apiClient.credentials.revoke(orgId, credentialId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to revoke credential";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { revokeCredential, loading, error };
}

// ─── Commitments ────────────────────────────────────────────────────────────

export interface Commitment {
  id: string;
  sessionId: string;
  agreementHash: string;
  parties: string[];
  credentialHashes: string[];
  proofs: Record<string, unknown>;
  circuitVersions: string[];
  verified: boolean;
  txHash: string | null;
  blockNumber: number | null;
  createdAt: string;
}

export function useCommitments(): FetchState<Commitment[]> {
  const result = useFetch<Paginated<Commitment>>(
    () => apiClient.commitments.list(),
    [],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useCommitment(id: string): FetchState<Commitment> {
  return useFetch<Commitment>(
    id ? () => apiClient.commitments.get(id) : null,
    [id],
  );
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface OrgAnalytics {
  agentCount: number;
  credentialCount: number;
  sessionCount: number;
  commitmentCount: number;
  activeSessionCount: number;
  avgTurnsPerSession: number;
}

export function useAnalytics(): FetchState<OrgAnalytics> {
  const orgId = getOrgIdFromToken();
  return useFetch<OrgAnalytics>(
    orgId ? () => apiClient.analytics.get(orgId) : null,
    [orgId],
  );
}

export function useTimeseries(metric: string, days = 14): FetchState<TimeseriesResponse> {
  return useFetch<TimeseriesResponse>(
    () => apiClient.analytics.timeseries(metric, days),
    [metric, days],
  );
}

export function useProofLatency(): FetchState<ProofLatencyResponse> {
  const orgId = getOrgIdFromToken();
  return useFetch<ProofLatencyResponse>(
    orgId ? () => apiClient.analytics.proofLatency(orgId) : null,
    [orgId],
  );
}

// ─── Billing ───────────────────────────────────────────────────────────────

export function useBillingUsage(): FetchState<BillingUsageResponse> {
  return useFetch<BillingUsageResponse>(
    () => apiClient.billing.usage(),
    [],
  );
}

export function useBillingPlan(): FetchState<BillingPlanResponse> {
  return useFetch<BillingPlanResponse>(
    () => apiClient.billing.plan(),
    [],
  );
}

// ─── Webhooks ──────────────────────────────────────────────────────────────

export function useWebhooks(): FetchState<WebhookResponse[]> {
  const orgId = getOrgIdFromToken();
  const result = useFetch<Paginated<WebhookResponse>>(
    orgId ? () => apiClient.webhooks.list(orgId) : null,
    [orgId],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useWebhookDeliveries(webhookId: string): FetchState<WebhookDeliveryResponse[]> {
  const orgId = getOrgIdFromToken();
  const result = useFetch<Paginated<WebhookDeliveryResponse>>(
    orgId && webhookId ? () => apiClient.webhooks.deliveries(orgId, webhookId) : null,
    [orgId, webhookId],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

// ─── API Keys ───────────────────────────────────────────────────────────────

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  rawKey?: string;
}

export function useApiKeys(): FetchState<ApiKey[]> {
  const orgId = getOrgIdFromToken();
  const result = useFetch<Paginated<ApiKey>>(
    orgId ? () => apiClient.apiKeys.list(orgId) : null,
    [orgId],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useCreateApiKey() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKey = useCallback(
    async (name: string, scopes: string[] = []) => {
      const orgId = getOrgIdFromToken();
      if (!orgId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const key = await apiClient.apiKeys.create(orgId, { name, scopes });
        return key;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create API key";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { createKey, loading, error };
}

export function useRevokeApiKey() {
  const [loading, setLoading] = useState(false);

  const revokeKey = useCallback(async (keyId: string) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) throw new Error("Not authenticated");
    setLoading(true);
    try {
      await apiClient.apiKeys.revoke(orgId, keyId);
    } finally {
      setLoading(false);
    }
  }, []);

  return { revokeKey, loading };
}

// ─── Turn Submission ────────────────────────────────────────────────────────

export function useSubmitTurn() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitTurn = useCallback(
    async (
      sessionId: string,
      data: {
        agentId: string;
        terms: Record<string, unknown>;
        proofType: string;
        proof: Record<string, unknown>;
        publicSignals: Record<string, unknown>;
        signature: string;
      },
    ) => {
      setLoading(true);
      setError(null);
      try {
        const turn = await apiClient.turns.submit(sessionId, data);
        return turn;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to submit turn";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { submitTurn, loading, error };
}

// ─── Orgs ───────────────────────────────────────────────────────────────────

export function useOrg(): FetchState<Org> {
  const orgId = getOrgIdFromToken();
  return useFetch<Org>(
    orgId ? () => apiClient.orgs.get(orgId) : null,
    [orgId],
  );
}

export function useOrgMembers(): FetchState<OrgMember[]> {
  const orgId = getOrgIdFromToken();
  const result = useFetch<Paginated<OrgMember>>(
    orgId ? () => apiClient.orgs.listMembers(orgId) : null,
    [orgId],
  );
  return {
    data: result.data?.data ?? null,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useInviteMember() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteMember = useCallback(async (email: string, role?: string) => {
    const orgId = getOrgIdFromToken();
    if (!orgId) throw new Error("Not authenticated");
    setLoading(true);
    setError(null);
    try {
      const invite = await apiClient.orgs.invite(orgId, email, role);
      return invite;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to invite member";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { inviteMember, loading, error };
}

export function useUpdateOrg() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOrg = useCallback(
    async (data: { name?: string; plan?: string }) => {
      const orgId = getOrgIdFromToken();
      if (!orgId) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const org = await apiClient.orgs.update(orgId, data);
        return org;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to update organization";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { updateOrg, loading, error };
}

// ─── Dashboard Stats ────────────────────────────────────────────────────────
// Aggregated from agents + sessions + credentials counts.

export interface DashboardStats {
  agentCount: number;
  sessionCount: number;
  credentialCount: number;
  activeSessionCount: number;
}

export function useDashboardStats(): FetchState<DashboardStats> {
  const orgId = getOrgIdFromToken();
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    Promise.all([
      apiClient.agents.list(orgId).catch(() => null),
      apiClient.sessions.list().catch(() => null),
      apiClient.credentials.list(orgId).catch(() => null),
    ])
      .then(([agents, sessions, creds]) => {
        setData({
          agentCount: agents?.pagination.total ?? 0,
          sessionCount: sessions?.pagination.total ?? 0,
          credentialCount: creds?.pagination.total ?? 0,
          activeSessionCount:
            sessions?.data.filter((s) => s.status === "active").length ?? 0,
        });
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load stats");
        setLoading(false);
      });
  }, [orgId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
