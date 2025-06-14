// Session-based authentication - only valid for current session
let isSessionAuthenticated = false;

export function isAuthenticated(): boolean {
  return isSessionAuthenticated;
}

export function setAuthenticated(authenticated: boolean): void {
  isSessionAuthenticated = authenticated;
}

export function getAuthToken(): string | null {
  return isSessionAuthenticated ? 'session_authenticated' : null;
}

export function clearAuth(): void {
  isSessionAuthenticated = false;
}
