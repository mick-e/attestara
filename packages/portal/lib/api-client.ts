const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || "http://localhost:3001";

// ─── Response Types ─────────────────────────────────────────────────────────

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; orgId: string; role: string };
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Agent {
  id: string;
  orgId: string;
  did: string;
  name: string;
  status: string;
  metadata: Record<string, unknown>;
  publicKey: string;
  registeredTxHash: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  initiatorAgentId: string;
  initiatorOrgId: string;
  counterpartyAgentId: string;
  counterpartyOrgId: string;
  sessionType: string;
  status: string;
  sessionConfig: Record<string, unknown>;
  merkleRoot: string | null;
  turnCount: number;
  anchorTxHash: string | null;
  createdAt: string;
  updatedAt: string;
  inviteToken?: string;
}

export interface Turn {
  id: string;
  sessionId: string;
  agentId: string;
  sequenceNumber: number;
  terms: Record<string, unknown>;
  proofType: string;
  proof: Record<string, unknown>;
  publicSignals: Record<string, unknown>;
  signature: string;
  createdAt: string;
}

export interface Credential {
  id: string;
  orgId: string;
  agentId: string;
  credentialHash: string;
  schemaHash: string;
  ipfsCid: string | null;
  credentialDataCached: Record<string, unknown> | null;
  expiry: string;
  revoked: boolean;
  registeredTxHash: string | null;
  createdAt: string;
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface OrgMember {
  id: string;
  orgId: string;
  role: string;
}

export interface Invite {
  id: string;
  orgId: string;
  email: string;
  role: string;
  status: string;
}

export interface CommitmentResponse {
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

export interface AnalyticsResponse {
  agentCount: number;
  credentialCount: number;
  sessionCount: number;
  commitmentCount: number;
  activeSessionCount: number;
  avgTurnsPerSession: number;
}

export interface ApiKeyResponse {
  id: string;
  orgId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
  rawKey?: string;
}

export interface Paginated<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// ─── API Client ─────────────────────────────────────────────────────────────

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = RELAY_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}/v1${path}`, {
      headers: this.headers(),
    });
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/v1${path}`, {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/v1${path}`, {
      method: "PATCH",
      headers: { ...this.headers(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await this.handleError(res);
    return res.json();
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v1${path}`, {
      method: "DELETE",
      headers: this.headers(),
    });
    if (!res.ok) throw await this.handleError(res);
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    return h;
  }

  private async handleError(res: Response): Promise<ApiError> {
    const body = await res.json().catch(() => ({
      message: res.statusText,
      code: "UNKNOWN",
    }));
    return new ApiError(
      body.message || `API Error: ${res.status}`,
      body.code || "UNKNOWN",
      res.status,
    );
  }

  // ── Auth ────────────────────────────────────────────────────────────────

  auth = {
    login: (email: string, password: string) =>
      this.post<AuthResponse>("/auth/login", { email, password }),

    register: (data: {
      email: string;
      password: string;
      orgName: string;
      walletAddress?: string;
    }) => this.post<AuthResponse>("/auth/register", data),

    refresh: (refreshToken: string) =>
      this.post<RefreshResponse>("/auth/refresh", { refreshToken }),

    verifyEmail: (token: string) =>
      this.post<{ message: string }>("/auth/verify-email", { token }),

    wallet: (data: { message: string; signature: string; address: string }) =>
      this.post<AuthResponse>("/auth/wallet", data),
  };

  // ── Agents ──────────────────────────────────────────────────────────────

  agents = {
    list: (orgId: string) =>
      this.get<Paginated<Agent>>(`/orgs/${orgId}/agents`),

    get: (orgId: string, agentId: string) =>
      this.get<Agent>(`/orgs/${orgId}/agents/${agentId}`),

    create: (
      orgId: string,
      data: {
        did: string;
        name: string;
        publicKey: string;
        metadata?: Record<string, unknown>;
      },
    ) => this.post<Agent>(`/orgs/${orgId}/agents`, data),

    update: (
      orgId: string,
      agentId: string,
      data: {
        name?: string;
        metadata?: Record<string, unknown>;
        status?: "active" | "inactive";
      },
    ) => this.patch<Agent>(`/orgs/${orgId}/agents/${agentId}`, data),

    delete: (orgId: string, agentId: string) =>
      this.delete(`/orgs/${orgId}/agents/${agentId}`),
  };

  // ── Sessions ────────────────────────────────────────────────────────────

  sessions = {
    list: () => this.get<Paginated<Session>>("/sessions"),

    get: (sessionId: string) => this.get<Session>(`/sessions/${sessionId}`),

    create: (data: {
      initiatorAgentId: string;
      counterpartyAgentId: string;
      initiatorOrgId: string;
      counterpartyOrgId: string;
      sessionType?: "intra_org" | "cross_org";
      sessionConfig?: Record<string, unknown>;
    }) => this.post<Session>("/sessions", data),

    getTurns: (sessionId: string) =>
      this.get<Paginated<Turn>>(`/sessions/${sessionId}/turns`),

    invite: (sessionId: string) =>
      this.post<{ inviteToken: string; sessionId: string }>(
        `/sessions/${sessionId}/invite`,
      ),

    accept: (sessionId: string, inviteToken: string) =>
      this.post<Session>(`/sessions/${sessionId}/accept`, { inviteToken }),
  };

  // ── Credentials ─────────────────────────────────────────────────────────

  credentials = {
    list: (orgId: string) =>
      this.get<Paginated<Credential>>(`/orgs/${orgId}/credentials`),

    get: (orgId: string, credentialId: string) =>
      this.get<Credential>(`/orgs/${orgId}/credentials/${credentialId}`),

    create: (
      orgId: string,
      data: {
        agentId: string;
        credentialHash: string;
        schemaHash: string;
        ipfsCid?: string;
        credentialData?: Record<string, unknown>;
        expiry: string;
      },
    ) => this.post<Credential>(`/orgs/${orgId}/credentials`, data),

    revoke: (orgId: string, credentialId: string) =>
      this.delete(`/orgs/${orgId}/credentials/${credentialId}`),
  };

  // ── Orgs ────────────────────────────────────────────────────────────────

  orgs = {
    get: (orgId: string) => this.get<Org>(`/orgs/${orgId}`),

    update: (orgId: string, data: { name?: string; plan?: string }) =>
      this.patch<Org>(`/orgs/${orgId}`, data),

    listMembers: (orgId: string) =>
      this.get<Paginated<OrgMember>>(`/orgs/${orgId}/members`),

    invite: (orgId: string, email: string, role?: string) =>
      this.post<Invite>(`/orgs/${orgId}/invite`, { email, role }),
  };

  // ── Commitments ──────────────────────────────────────────────────────────

  commitments = {
    list: () =>
      this.get<Paginated<CommitmentResponse>>("/commitments"),

    get: (id: string) =>
      this.get<CommitmentResponse>(`/commitments/${id}`),

    verify: (id: string) =>
      this.post<CommitmentResponse>(`/commitments/${id}/verify`),
  };

  // ── Analytics ────────────────────────────────────────────────────────────

  analytics = {
    get: (orgId: string) =>
      this.get<AnalyticsResponse>(`/orgs/${orgId}/analytics`),
  };

  // ── API Keys ─────────────────────────────────────────────────────────────

  apiKeys = {
    list: (orgId: string) =>
      this.get<Paginated<ApiKeyResponse>>(`/orgs/${orgId}/api-keys`),

    create: (orgId: string, data: { name: string; scopes?: string[]; expiresAt?: string }) =>
      this.post<ApiKeyResponse>(`/orgs/${orgId}/api-keys`, data),

    revoke: (orgId: string, keyId: string) =>
      this.delete(`/orgs/${orgId}/api-keys/${keyId}`),
  };

  // ── Turns ────────────────────────────────────────────────────────────────

  turns = {
    submit: (sessionId: string, data: {
      agentId: string;
      terms: Record<string, unknown>;
      proofType: string;
      proof: Record<string, unknown>;
      publicSignals: Record<string, unknown>;
      signature: string;
    }) => this.post<Turn>(`/sessions/${sessionId}/turns`, data),
  };
}

export const apiClient = new ApiClient();
