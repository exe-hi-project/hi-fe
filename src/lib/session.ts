const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const PERSISTED_AUTH_KEY = 'hi-auth';

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PERSISTED_AUTH_KEY);
}

export function buildLoginRedirect(reason = 'session-expired') {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  const params = new URLSearchParams({ reason });

  if (!['/login', '/register'].includes(window.location.pathname)) {
    params.set('next', currentPath);
  }

  return `/login?${params.toString()}`;
}
