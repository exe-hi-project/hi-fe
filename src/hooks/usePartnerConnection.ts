import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import api from '../lib/api';
import { ApiResponse, User } from '../types';
import { useAuthStore } from '../store/authStore';

type UserApiResponse = ApiResponse<{ user: User }> & { user?: User };

function unwrapUser(response: UserApiResponse): User {
  const user = response.user ?? response.data?.user;
  if (!user) {
    throw new Error('Phản hồi người dùng không hợp lệ');
  }
  return user;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message ?? fallback;
  }
  return fallback;
}

export function usePartnerConnection() {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  const refreshProfile = async () => {
    const { data } = await api.get<UserApiResponse>('/users/profile');
    const user = unwrapUser(data);
    setUser(user);
    return user;
  };

  const connectPartner = useMutation({
    mutationFn: async (partnerCode: string) => {
      await api.post('/users/connect-partner', {
        partnerCode: partnerCode.trim().toUpperCase(),
      });
      return refreshProfile();
    },
    onSuccess: () => {
      toast.success('Kết nối cặp đôi thành công');
      queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Không thể kết nối cặp đôi')),
  });

  const disconnectPartner = useMutation({
    mutationFn: async () => {
      await api.delete('/users/disconnect-partner');
      return refreshProfile();
    },
    onSuccess: () => {
      toast.success('Đã ngắt kết nối cặp đôi');
      queryClient.invalidateQueries({ queryKey: ['partner-cycles'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Không thể ngắt kết nối')),
  });

  return { connectPartner, disconnectPartner };
}
