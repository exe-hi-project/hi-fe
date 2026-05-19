import axios from 'axios';
import { toast } from 'react-hot-toast';
import { buildLoginRedirect, clearAuthSession } from './session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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
    // Only force-logout on 401 for protected routes, never for auth endpoints themselves
    const url = err.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
    if (err.response?.status === 401 && !isAuthEndpoint) {
      clearAuthSession();
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      window.location.href = buildLoginRedirect();
    }
    return Promise.reject(err);
  }
);

export default api;
