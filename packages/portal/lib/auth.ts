export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("at_access_token", accessToken);
  localStorage.setItem("at_refresh_token", refreshToken);
}

export function getAccessToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("at_access_token")
    : null;
}

export function getRefreshToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("at_refresh_token")
    : null;
}

export function clearTokens() {
  localStorage.removeItem("at_access_token");
  localStorage.removeItem("at_refresh_token");
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
