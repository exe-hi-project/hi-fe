import React from 'react';
import { useCheckout, useSubscription, useCancelSubscription } from '../hooks/useSubscription';
import Spinner from './ui/Spinner';

export default function PricingCard() {
  const { data: subscription, isLoading } = useSubscription();
  const checkout = useCheckout();
  const cancelSub = useCancelSubscription();

  const isPremium = (subscription?.plan && ['premium', 'monthly', 'yearly', 'premium_monthly', 'premium_yearly'].includes(subscription.plan)) && subscription?.status === 'active';
  const isCanceled = subscription?.status === 'canceled';

  const priceMonthlyVal = import.meta.env.VITE_PAYMENT_PLAN_MONTHLY_PRICE || '49000';
  const priceYearlyVal = import.meta.env.VITE_PAYMENT_PLAN_YEARLY_PRICE || '399000';

  const formatPrice = (val: string) => {
    const num = parseInt(val, 10);
    return isNaN(num) ? val : num.toLocaleString('vi-VN') + 'đ';
  };

  const PLANS = [
    {
      id: 'monthly',
      label: 'Hàng tháng',
      price: formatPrice(priceMonthlyVal),
      period: '/tháng',
      priceId: 'monthly' as const,
      highlight: false,
      features: [
        'Theo dõi chu kỳ kinh nguyệt nâng cao',
        'Tư vấn sức khỏe AI 24/7 không giới hạn',
        'Dự báo và phân tích triệu chứng thông minh',
        'Chia sẻ dữ liệu bảo mật với bạn đời',
      ],
    },
    {
      id: 'yearly',
      label: 'Hàng năm',
      price: formatPrice(priceYearlyVal),
      period: '/năm',
      priceId: 'yearly' as const,
      highlight: true,
      badge: 'Tiết kiệm 32%',
      features: [
        'Tất cả tính năng của gói tháng',
        'Báo cáo sức khỏe sinh sản hàng năm',
        'Ưu tiên kết nối với chuyên gia y tế',
        'Giá ưu đãi tiết kiệm vượt trội',
      ],
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="h-8 w-8 text-pink-500" />
      </div>
    );
  }

  if (isPremium) {
    return (
      <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 to-white p-8 shadow-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl text-pink-500 animate-pulse">
            ✨
          </div>
          <h3 className="mt-4 text-2xl font-bold text-gray-900 font-sans">
            Gói Premium của bạn đang hoạt động
          </h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm font-sans">
            Bạn đã nâng cấp thành công tài khoản lên gói <span className="font-semibold text-pink-500">Hi Premium</span>. 
            Cảm ơn bạn đã tin tưởng đồng hành cùng ứng dụng.
          </p>

          {subscription.currentPeriodEnd && (
            <div className="mt-6 rounded-2xl bg-white px-5 py-2.5 border border-pink-100 text-sm font-medium text-pink-700 shadow-sm shadow-pink-100/50">
              Ngày hết hạn: {new Date(subscription.currentPeriodEnd).toLocaleDateString('vi-VN')}
            </div>
          )}

          <button
            onClick={() => {
              if (confirm('Bạn có chắc chắn muốn hủy gia hạn gói Premium?')) {
                cancelSub.mutate();
              }
            }}
            disabled={cancelSub.isPending}
            className="mt-8 text-xs font-semibold text-gray-400 hover:text-red-500 underline transition-colors duration-200"
          >
            {cancelSub.isPending ? 'Đang xử lý...' : 'Hủy gia hạn gói Premium'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl font-sans">
          Nâng cấp lên <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-pink-600">Hi Premium</span>
        </h2>
        <p className="mt-4 text-base text-gray-500 font-sans">
          Mở khóa toàn bộ các tính năng theo dõi sức khỏe nâng cao và AI tư vấn y khoa chuyên sâu.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 md:gap-6 lg:gap-8 max-w-3xl mx-auto">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-3xl border p-8 bg-white transition-all duration-300 ${
              plan.highlight
                ? 'border-pink-400 shadow-xl shadow-pink-100/50 scale-105 z-10'
                : 'border-gray-200 hover:border-pink-200 hover:shadow-lg hover:shadow-gray-100/50'
            }`}
          >
            {plan.badge && (
              <span className="absolute -top-3 right-8 rounded-full bg-pink-500 px-4 py-1 text-xs font-bold text-white tracking-wide uppercase shadow-md shadow-pink-500/20">
                {plan.badge}
              </span>
            )}

            <div>
              <p className="text-lg font-bold text-gray-900 font-sans">{plan.label}</p>
              <div className="mt-4 flex items-baseline text-gray-900">
                <span className="text-4xl font-extrabold tracking-tight font-sans">{plan.price}</span>
                <span className="ml-1 text-lg font-normal text-gray-400">{plan.period}</span>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-50 text-[10px] text-pink-500 font-bold border border-pink-100 mr-3 mt-0.5">
                      ✓
                    </span>
                    <span className="text-sm text-gray-600 font-sans leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              id={`btn-checkout-${plan.id}`}
              onClick={() => checkout.mutate(plan.priceId)}
              disabled={checkout.isPending}
              className={`mt-8 flex w-full items-center justify-center rounded-2xl py-3.5 px-6 text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] ${
                plan.highlight
                  ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/20 hover:from-pink-600 hover:to-pink-700 hover:shadow-pink-600/30'
                  : 'border border-pink-200 bg-pink-50/50 text-pink-600 hover:bg-pink-50 hover:border-pink-300'
              } disabled:opacity-60`}
            >
              {checkout.isPending ? 'Đang xử lý...' : 'Nâng cấp Premium'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
