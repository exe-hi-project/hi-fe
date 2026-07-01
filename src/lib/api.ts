import axios, { AxiosHeaders } from 'axios';
import { toast } from 'react-hot-toast';
import { buildLoginRedirect, clearAuthSession } from './session';

const productionApiUrl = 'https://api.hilover.space/api';
const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? productionApiUrl : '/api');

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn(`VITE_API_URL is missing; falling back to ${productionApiUrl}`);
}

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 12_000,
  withCredentials: true,
});

type CsrfResponse = {
  success: boolean;
  data?: {
    csrfToken?: string;
    headerName?: string;
  };
};

let csrfToken: string | null = null;
let csrfHeaderName = 'X-XSRF-TOKEN';
let csrfRequest: Promise<void> | null = null;

function isUnsafeMethod(method?: string) {
  return ['post', 'put', 'patch', 'delete'].includes((method ?? 'get').toLowerCase());
}

async function ensureCsrfToken() {
  if (csrfToken) return;
  csrfRequest ??= api.get<CsrfResponse>('/auth/csrf').then(({ data }) => {
    csrfToken = data.data?.csrfToken ?? null;
    csrfHeaderName = data.data?.headerName ?? csrfHeaderName;
  }).finally(() => {
    csrfRequest = null;
  });
  await csrfRequest;
}

api.interceptors.request.use(async (config) => {
  if (isUnsafeMethod(config.method) && !config.url?.includes('/auth/csrf')) {
    await ensureCsrfToken();
    if (csrfToken) {
      const headers = AxiosHeaders.from(config.headers);
      headers.set(csrfHeaderName, csrfToken);
      config.headers = headers;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Force-logout on 401/403 for protected routes, never for auth endpoints themselves
    const url = err.config?.url ?? '';
    const isAuthEndpoint =
      url.includes('/auth/me') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/google') ||
      url.includes('/auth/facebook') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');
    if (err.response?.status === 403 && err.config && isUnsafeMethod(err.config.method)) {
      csrfToken = null;
    }
    if ((err.response?.status === 401 || err.response?.status === 403) && !isAuthEndpoint) {
      const authPaths = ['/login', '/register', '/forgot-password'];
      if (authPaths.includes(window.location.pathname)) {
        return Promise.reject(err);
      }
      clearAuthSession();
      toast.error('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
      window.location.href = buildLoginRedirect();
    }
    return Promise.reject(err);
  }
);

export default api;
