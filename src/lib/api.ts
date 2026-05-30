import axios from 'axios';
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
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Force-logout on 401/403 for protected routes, never for auth endpoints themselves
    const url = err.config?.url ?? '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password');
    if ((err.response?.status === 401 || err.response?.status === 403) && !isAuthEndpoint) {
      clearAuthSession();
      toast.error('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.');
      window.location.href = buildLoginRedirect();
    }
    return Promise.reject(err);
  }
);

export default api;
