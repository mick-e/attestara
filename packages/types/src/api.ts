export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown> | undefined
  requestId: string
}

export interface RegisterRequest {
  email: string
  password: string
  orgName: string
  walletAddress?: string | undefined
}

export interface LoginRequest {
  email: string
  password: string
}

export interface WalletAuthRequest {
  message: string
  signature: string
  address: string
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    orgId: string
    role: string
  }
}

export interface WebhookPayload {
  id: string
  event: string
  timestamp: string
  data: Record<string, unknown>
}
