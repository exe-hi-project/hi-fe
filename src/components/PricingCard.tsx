import { useCancelSubscription, useCheckout, useSubscription } from '../hooks/useSubscription';
import {
  FREE_PLAN_FEATURES,
  PREMIUM_PLAN_FEATURES,
  PREMIUM_YEARLY_FEATURES,
} from '../config/subscriptionPlans';
import Spinner from './ui/Spinner';

type PaidPlanId = 'monthly' | 'yearly';

interface PricingPlan {
  id: 'free' | PaidPlanId;
  label: string;
  price: string;
  period: string;
  description: string;
  priceId?: PaidPlanId;
  highlight?: boolean;
  badge?: string;
  features: string[];
}

function formatVnd(value: string) {
  const num = Number.parseInt(value, 10);
  return Number.isNaN(num) ? value : `${num.toLocaleString('vi-VN')}đ`;
}

export default function PricingCard() {
  const { data: subscription, isLoading } = useSubscription();
  const checkout = useCheckout();
  const cancelSub = useCancelSubscription();

  const isPremium = subscription?.tier === 'PREMIUM';
  const isCanceled = subscription?.status === 'canceled';
  const currentPeriodEnd = subscription?.currentPeriodEnd;

  const monthlyPrice = formatVnd(import.meta.env.VITE_PAYMENT_PLAN_MONTHLY_PRICE || '49000');
  const yearlyPrice = formatVnd(import.meta.env.VITE_PAYMENT_PLAN_YEARLY_PRICE || '399000');

  const plans: PricingPlan[] = [
    {
      id: 'free',
      label: 'Đồng Hành Cơ Bản',
      price: '0đ',
      period: '/mãi mãi',
      description: 'Đầy đủ công cụ chăm sóc sức khỏe hằng ngày.',
      features: [...FREE_PLAN_FEATURES],
    },
    {
      id: 'monthly',
      label: 'Đồng Hành Premium Tháng',
      price: monthlyPrice,
      period: '/30 ngày',
      description: 'Phân tích sâu hơn và tăng hạn mức Hi AI.',
      priceId: 'monthly',
      features: [...PREMIUM_PLAN_FEATURES],
    },
    {
      id: 'yearly',
      label: 'Đồng Hành Premium Năm',
      price: yearlyPrice,
      period: '/365 ngày',
      description: 'Cùng tính năng Premium, tiết kiệm hơn.',
      priceId: 'yearly',
      highlight: true,
      badge: 'Tiết kiệm 32%',
      features: [...PREMIUM_YEARLY_FEATURES],
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl text-pink-500">✨</div>
          <h3 className="mt-4 text-2xl font-black text-slate-900">Gói Premium của bạn đang hoạt động</h3>
          <p className="mt-2 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
            Bạn đã nâng cấp thành công lên Hi Premium. Cảm ơn bạn đã tin tưởng đồng hành cùng Hi.
          </p>

          {currentPeriodEnd && (
            <div className="mt-6 rounded-2xl border border-pink-100 bg-white px-5 py-2.5 text-sm font-bold text-pink-700 shadow-sm">
              Ngày hết hạn: {new Date(currentPeriodEnd).toLocaleDateString('vi-VN')}
            </div>
          )}

          {subscription?.cancelAtPeriodEnd ? (
            <p className="mt-8 text-xs font-bold text-amber-600">
              Đã dừng gia hạn. Quyền Premium vẫn giữ đến ngày hết hạn.
            </p>
          ) : (
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn dừng gia hạn Premium?')) cancelSub.mutate();
              }}
              disabled={cancelSub.isPending}
              className="mt-8 text-xs font-bold text-slate-400 underline transition hover:text-red-500 disabled:opacity-60"
            >
              {cancelSub.isPending ? 'Đang xử lý...' : 'Dừng gia hạn Premium'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div id="pricing" className="mx-auto max-w-5xl px-4 py-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="hi-page-title text-3xl sm:text-4xl">
          Lựa chọn Gói <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-pink-500 bg-clip-text text-transparent">Đồng Hành</span> cùng Hi
        </h2>
        <p className="mt-4 text-base font-semibold leading-relaxed text-slate-500">
          Bắt đầu miễn phí hoặc mở khóa thêm phân tích sức khỏe, AI hỗ trợ tham khảo và trải nghiệm Người ấy nâng cao.
        </p>
        {isCanceled && (
          <p className="mt-3 text-sm font-bold text-pink-600">
            Gói Premium trước đó đã dừng. Bạn có thể chọn lại gói phù hợp khi cần.
          </p>
        )}
      </div>

      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-3 lg:items-stretch">
        {plans.map((plan) => {
          const isFreePlan = plan.id === 'free';
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-[2rem] border bg-white p-7 transition-all duration-300 hover:-translate-y-1 ${
                plan.highlight
                  ? 'border-pink-300 shadow-xl shadow-pink-100/60 lg:scale-[1.03] lg:z-10'
                  : 'border-slate-200 hover:border-pink-200 hover:shadow-lg hover:shadow-slate-100'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 right-8 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-1 text-xs font-black uppercase tracking-wide text-white shadow-md">
                  {plan.badge}
                </span>
              )}

              <div>
                <p className="text-lg font-black text-slate-900">{plan.label}</p>
                <div className="mt-4 flex items-baseline text-slate-900">
                  <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                  <span className="ml-1 text-lg font-bold text-slate-400">{plan.period}</span>
                </div>
                <p className="mt-3 min-h-10 text-sm font-semibold leading-relaxed text-slate-500">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <span className="mr-3 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-pink-100 bg-pink-50 text-[10px] font-black text-pink-500">
                        ✓
                      </span>
                      <span className="text-sm font-semibold leading-snug text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                id={`btn-checkout-${plan.id}`}
                onClick={() => plan.priceId && checkout.mutate(plan.priceId)}
                disabled={isFreePlan || checkout.isPending}
                className={`mt-8 flex w-full items-center justify-center rounded-full px-6 py-3.5 text-sm font-black tracking-wide ${
                  isFreePlan
                    ? 'hi-btn-secondary text-slate-500'
                    : 'hi-btn-primary'
                }`}
              >
                {isFreePlan ? 'Đồng Hành Cơ Bản' : checkout.isPending ? 'Đang xử lý...' : `Đăng ký gói ${plan.id === 'monthly' ? 'Tháng' : 'Năm'}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
