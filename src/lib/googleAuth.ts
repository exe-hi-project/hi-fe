function isSafeNextPath(next: string | null | undefined): next is string {
  return !!next && next.startsWith('/') && !next.startsWith('//') && next !== '/login' && next !== '/register';
}

export function extractSafeNextPath(search: string) {
  const next = new URLSearchParams(search).get('next');
  return isSafeNextPath(next) ? next : null;
}

export function getSafeNextPath(search: string, fallback: string) {
  return extractSafeNextPath(search) ?? fallback;
}

export function buildGoogleOAuthUrl(nextPath?: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Thiếu VITE_GOOGLE_CLIENT_ID');
  }

  const redirectUri = window.location.origin;
  const scope = 'email profile openid';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope,
  });

  if (isSafeNextPath(nextPath)) {
    params.set('state', nextPath);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function getSafeOAuthState(state: string | null, fallback: string) {
  return isSafeNextPath(state) ? state : fallback;
}
