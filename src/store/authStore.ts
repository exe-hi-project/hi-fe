import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiResponse, AuthPayload, RegisterDto, User } from '../types';
import api from '../lib/api';
import { clearAuthSession } from '../lib/session';

type AuthApiResponse = ApiResponse<AuthPayload> & Partial<AuthPayload>;
type UserApiResponse = ApiResponse<{ user: User }> & { user?: User };

function unwrapAuthPayload(response: AuthApiResponse): AuthPayload {
  const payload = response.data ?? { token: response.token, user: response.user };
  if (!payload.token || !payload.user) {
    throw new Error('Phản hồi đăng nhập không hợp lệ');
  }
  return { token: payload.token, user: payload.user };
}

function unwrapUserPayload(response: UserApiResponse): User {
  const user = response.data?.user ?? response.user;
  if (!user) {
    throw new Error('Phản hồi người dùng không hợp lệ');
  }
  return user;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  socialLogin: (provider: 'google' | 'facebook', payload: Record<string, string>) => Promise<User>;
  refreshSession: () => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthApiResponse>('/auth/login', { email, password });
          const payload = unwrapAuthPayload(data);
          localStorage.setItem('token', payload.token);
          set({ user: payload.user, token: payload.token, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.response?.data?.message || 'Đăng nhập thất bại');
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthApiResponse>('/auth/register', formData);
          const payload = unwrapAuthPayload(data);
          localStorage.setItem('token', payload.token);
          set({ user: payload.user, token: payload.token, isLoading: false });
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.response?.data?.message || 'Đăng ký thất bại');
        }
      },

      socialLogin: async (provider, payload) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post<AuthApiResponse>(`/auth/${provider}`, payload);
          const authPayload = unwrapAuthPayload(data);
          localStorage.setItem('token', authPayload.token);
          set({ user: authPayload.user, token: authPayload.token, isLoading: false });
          return authPayload.user;
        } catch (err: any) {
          set({ isLoading: false });
          throw new Error(err.response?.data?.message || `Đăng nhập ${provider} thất bại`);
        }
      },

      refreshSession: async () => {
        const { data } = await api.post<AuthApiResponse>('/auth/refresh');
        const payload = unwrapAuthPayload(data);
        localStorage.setItem('token', payload.token);
        set({ user: payload.user, token: payload.token });
      },

      logout: () => {
        clearAuthSession();
        set({ user: null, token: null });
      },

      updateUser: async (updates) => {
        const { data } = await api.put<UserApiResponse>('/users/profile', updates);
        set({ user: unwrapUserPayload(data) });
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'hi-auth', partialize: (state) => ({ user: state.user, token: state.token }) }
  )
);
