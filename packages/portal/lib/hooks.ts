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

// ─── Commitments (read-only — sessions with anchorTxHash) ───────────────────
// The relay API doesn't have a dedicated commitments endpoint yet.
// We derive commitments from completed sessions. The hooks return the same
// shape so pages can consume them uniformly.

export interface Commitment {
  id: string;
  sessionId: string;
  agreementHash: string;
  partyA: string;
  partyB: string;
  verified: boolean;
  txHash: string | null;
  createdAt: string;
}

export function useCommitments(): FetchState<Commitment[]> {
  // Placeholder — returns null so the page falls back to mock data
  return { data: null, loading: false, error: null, refetch: () => {} };
}

export function useCommitment(id: string): FetchState<Commitment> {
  return { data: null, loading: false, error: null, refetch: () => {} };
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
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
