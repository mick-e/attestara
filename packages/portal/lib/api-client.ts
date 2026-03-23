const RELAY_URL = process.env.NEXT_PUBLIC_RELAY_URL || "http://localhost:3001";

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

  private async handleError(res: Response) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    return new Error(body.message || `API Error: ${res.status}`);
  }
}

export const apiClient = new ApiClient();
