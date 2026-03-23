export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("ac_access_token", accessToken);
  localStorage.setItem("ac_refresh_token", refreshToken);
}

export function getAccessToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("ac_access_token")
    : null;
}

export function getRefreshToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("ac_refresh_token")
    : null;
}

export function clearTokens() {
  localStorage.removeItem("ac_access_token");
  localStorage.removeItem("ac_refresh_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
