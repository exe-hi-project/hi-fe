import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'react-hot-toast';

export interface SubscriptionInfo {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: 'free' | 'premium' | 'monthly' | 'yearly' | 'premium_monthly' | 'premium_yearly';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | null;
  currentPeriodEnd: string | null;
}

export function useSubscription() {
  return useQuery<SubscriptionInfo>({
    queryKey: ['subscription'],
    queryFn: () => api.get('/payments/subscription').then((r) => r.data.data),
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: (planType: 'monthly' | 'yearly') =>
      api.post('/payments/create-checkout-session', { priceId: planType }).then((r) => r.data.data),
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Không tìm thấy URL thanh toán');
      }
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi tạo phiên thanh toán';
      toast.error(msg);
      console.error('Checkout error:', error);
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/payments/cancel').then((r) => r.data),
    onSuccess: (data) => {
      toast.success(data.message || 'Đã lên lịch hủy subscription');
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi hủy subscription';
      toast.error(msg);
      console.error('Cancel subscription error:', error);
    },
  });
}
