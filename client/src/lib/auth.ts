export function isAuthenticated(): boolean {
  const token = localStorage.getItem('dashboard_token');
  if (!token) return false;
  
  try {
    // Simple token validation - in production you'd validate JWT properly
    const decoded = atob(token);
    return decoded.includes('authenticated:');
  } catch {
    return false;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('dashboard_token');
}

export function clearAuth(): void {
  localStorage.removeItem('dashboard_token');
}
