import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { bestProductName, cleanProductTitle } from '../utils/affiliateDisplay';

type ProductFilter = 'all' | 'care' | 'wellness' | 'gifts' | 'partner';
type GenderTheme = 'female' | 'male';

interface AffiliateProduct {
  _id?: number;
  id?: number;
  name: string;
  description?: string;
  platform?: string;
  affiliateUrl: string;
  imageUrl?: string;
  price?: number;
  symptomCategory?: string;
  category?: string;
  symptomTags?: string[];
  phaseTags?: string[];
  goalTags?: string[];
  sourceName?: string;
  audience?: string;
}

const filters: Array<{ key: ProductFilter; label: string; hint: string; icon: string }> = [
  { key: 'all', label: 'Tất cả', hint: 'Gợi ý phù hợp', icon: 'apps' },
  { key: 'care', label: 'Chăm sóc cơ thể', hint: 'Kỳ kinh, đau bụng', icon: 'health_and_safety' },
  { key: 'wellness', label: 'Sức khỏe mỗi ngày', hint: 'Thư giãn, phục hồi', icon: 'self_care' },
  { key: 'gifts', label: 'Quà theo dịp', hint: 'Sinh nhật, ngày lễ', icon: 'redeem' },
  { key: 'partner', label: 'Cho người ấy', hint: 'Quan tâm tinh tế', icon: 'favorite' },
];

const themes = {
  female: {
    page: 'from-[#fff1f6] via-white to-[#f7f1ff]',
    panel: 'border-rose-200 bg-white shadow-lg shadow-rose-200/35',
    softPanel: 'border-rose-200 bg-white shadow-sm shadow-rose-100/40',
    accent: '#eb477e',
    accentText: 'text-pink-600',
    accentBg: 'bg-rose-50',
    accentBorder: 'border-rose-200',
    cta: 'bg-[#eb477e] shadow-rose-200 hover:bg-pink-600',
    chipActive: 'border-rose-300 bg-rose-50 text-pink-600 shadow-sm shadow-rose-100',
    chipHover: 'hover:border-rose-200 hover:bg-white hover:text-pink-600',
    heroIcon: 'from-rose-50 to-violet-50 text-pink-500',
    title: 'Sản phẩm chăm sóc sức khỏe cho bạn',
    subtitle: 'Gợi ý dịu nhẹ cho kỳ kinh, chăm sóc hằng ngày và những món quà nhỏ khi bạn muốn tự thương mình hơn.',
    statLabel: 'sản phẩm',
  },
  male: {
    page: 'from-[#f5fbff] via-white to-[#eff6ff]',
    panel: 'border-sky-100 bg-white shadow-lg shadow-sky-100/60',
    softPanel: 'border-sky-100 bg-[#f8fcff] shadow-sm shadow-sky-100/40',
    accent: '#3b82f6',
    accentText: 'text-blue-600',
    accentBg: 'bg-blue-50',
    accentBorder: 'border-blue-200',
    cta: 'bg-blue-600 shadow-blue-200 hover:bg-blue-700',
    chipActive: 'border-blue-200 bg-blue-50 text-blue-600',
    chipHover: 'hover:border-blue-100 hover:text-blue-600',
    heroIcon: 'from-blue-100 to-indigo-100 text-blue-500',
    title: 'Sản phẩm chăm sóc và quà tặng cho người ấy',
    subtitle: 'Một góc gọn để chọn đồ chăm sóc, món quà đúng dịp và những thứ nhỏ giúp bạn quan tâm tinh tế hơn.',
    statLabel: 'gợi ý',
  },
} satisfies Record<GenderTheme, Record<string, string>>;

function normalize(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
}

function productText(product: AffiliateProduct) {
  return normalize([
    product.name,
    product.description,
    product.category,
    product.symptomCategory,
    ...(product.symptomTags ?? []),
    ...(product.phaseTags ?? []),
    ...(product.goalTags ?? []),
  ].filter(Boolean).join(' '));
}

function matchesFilter(product: AffiliateProduct, filter: ProductFilter) {
  if (filter === 'all') return true;
  const text = productText(product);
  if (filter === 'care') return ['dau bung', 'kinh', 'chuom', 'mieng dan', 'tra gung', 'cham soc'].some((keyword) => text.includes(keyword));
  if (filter === 'wellness') return ['suc khoe', 'thu gian', 'ngu ngon', 'vitamin', 'phuc hoi', 'wellness'].some((keyword) => text.includes(keyword));
  if (filter === 'gifts') return ['qua', 'gift', 'sinh nhat', 'valentine', '8/3', '20/10', 'hoa'].some((keyword) => text.includes(keyword));
  return ['nguoi ay', 'partner', 'ban gai', 'ban trai', 'yeu thuong', 'quan tam'].some((keyword) => text.includes(keyword))
    || ['BOTH', 'FEMALE', 'MALE'].includes((product.audience ?? '').toUpperCase());
}

function money(value?: number) {
  if (!value || Number.isNaN(value)) return 'Chưa có giá';
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

async function openAffiliateProduct(product: AffiliateProduct) {
  const productId = product._id ?? product.id;
  let targetUrl = product.affiliateUrl;
  try {
    if (productId) {
      const { data } = await api.post(`/affiliate-products/${productId}/click`);
      targetUrl = data.data?.affiliateUrl || targetUrl;
    }
  } catch {
    // Tracking is best-effort; users should still be able to open the product.
  }
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}

function ProductImage({ product, theme }: { product: AffiliateProduct; theme: (typeof themes)[GenderTheme] }) {
  const [failed, setFailed] = useState(false);
  const title = bestProductName(product);
  if (!product.imageUrl || failed) {
    return (
      <div className={`flex h-44 w-full items-center justify-center rounded-[1.75rem] bg-gradient-to-br ${theme.heroIcon}`}>
        <span className="material-symbols-outlined text-5xl">local_mall</span>
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-44 w-full rounded-[1.75rem] object-cover"
    />
  );
}

function ProductCard({ product, themeName }: { product: AffiliateProduct; themeName: GenderTheme }) {
  const theme = themes[themeName];
  const tags = [...(product.symptomTags ?? []), ...(product.phaseTags ?? []), ...(product.goalTags ?? [])].filter(Boolean).slice(0, 4);
  const title = bestProductName(product);
  const description = cleanProductTitle(product.description, 120);

  return (
    <article className={`group flex h-full flex-col rounded-[2rem] border p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${theme.panel}`}>
      <ProductImage product={product} theme={theme} />
      <div className="flex flex-1 flex-col p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black uppercase text-white">
            {product.platform ?? 'Sản phẩm'}
          </span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${theme.accentBg} ${theme.accentText}`}>
            {cleanProductTitle(product.sourceName || product.category, 34) || 'Cửa hàng'}
          </span>
        </div>

        <h3 className="mt-4 line-clamp-2 text-lg font-black leading-snug text-slate-950">{title}</h3>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed text-slate-500">
          {description || 'Sản phẩm đã được admin duyệt, đang chờ bổ sung mô tả chi tiết.'}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.length > 0 ? tags.map((tag) => (
            <span key={tag} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${theme.accentBg} ${theme.accentText}`}>
              {cleanProductTitle(tag, 28)}
            </span>
          )) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">Chăm sóc nhẹ nhàng</span>
          )}
        </div>

        <div className="mt-auto pt-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Giá sản phẩm</p>
            <p className="mt-1 text-xl font-black text-slate-950">{money(product.price)}</p>
          </div>
          <button
            type="button"
            onClick={() => openAffiliateProduct(product)}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black text-white shadow-lg transition active:translate-y-[1px] ${theme.cta}`}
          >
            Mở sản phẩm
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductSkeleton() {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white p-3 shadow-sm">
      <div className="h-44 animate-pulse rounded-[1.75rem] bg-slate-100" />
      <div className="p-3">
        <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-4 h-6 w-4/5 animate-pulse rounded-full bg-slate-100" />
        <div className="mt-2 h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="mt-6 h-11 w-full animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const { user } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<ProductFilter>('all');
  const [search, setSearch] = useState('');
  const themeName: GenderTheme = user?.gender === 'male' ? 'male' : 'female';
  const theme = themes[themeName];
  const firstName = user?.name?.split(' ').pop() ?? 'bạn';

  const productsQuery = useQuery({
    queryKey: ['affiliate-products-marketplace'],
    queryFn: () => api.get('/affiliate-products', { params: { active: true, limit: 100 } }).then(({ data }) => data.products as AffiliateProduct[]),
    staleTime: 5 * 60_000,
  });

  const products = productsQuery.data ?? [];
  const visibleProducts = useMemo(() => {
    const keyword = normalize(search.trim());
    return products.filter((product) => matchesFilter(product, activeFilter) && (!keyword || productText(product).includes(keyword)));
  }, [activeFilter, products, search]);

  const careCount = useMemo(() => products.filter((product) => matchesFilter(product, 'care')).length, [products]);
  const giftCount = useMemo(() => products.filter((product) => matchesFilter(product, 'gifts')).length, [products]);

  return (
    <div className={`rounded-[2.5rem] border border-white/80 bg-gradient-to-br p-3 shadow-inner md:p-4 ${theme.page}`}>
      <div className="space-y-6">
        <section className={`rounded-[2rem] border p-5 shadow-sm backdrop-blur md:p-6 ${theme.panel}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className={`text-xs font-black uppercase tracking-[0.22em] ${theme.accentText}`}>Hi Shop gợi ý</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-4xl">
                {theme.title}, {firstName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500 md:text-base">{theme.subtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white shadow-sm">
                <p className="text-2xl font-black">{products.length}</p>
                <p className="text-xs font-bold text-white/70">{theme.statLabel}</p>
              </div>
              <div className={`rounded-2xl px-5 py-4 shadow-sm ${theme.accentBg}`}>
                <p className={`text-2xl font-black ${theme.accentText}`}>{careCount}</p>
                <p className="text-xs font-bold text-slate-500">chăm sóc</p>
              </div>
              <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
                <p className="text-2xl font-black text-slate-950">{giftCount}</p>
                <p className="text-xs font-bold text-slate-500">quà tặng</p>
              </div>
            </div>
          </div>
        </section>

        <section className={`rounded-[2rem] border p-4 shadow-sm backdrop-blur ${theme.panel}`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap">
              {filters.map((filter) => {
                const active = activeFilter === filter.key;
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition active:translate-y-[1px] ${
                      active ? theme.chipActive : `border-slate-100 bg-white text-slate-500 ${theme.chipHover}`
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{filter.icon}</span>
                    <span>
                      <span className="block text-sm font-black">{filter.label}</span>
                      <span className="block text-xs font-semibold opacity-75">{filter.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="relative min-w-0 lg:w-72">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm túi chườm, quà, trà..."
                className={`h-12 w-full rounded-2xl border bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-4 ${theme.accentBorder}`}
              />
            </label>
          </div>
        </section>

        {productsQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => <ProductSkeleton key={index} />)}
          </div>
        ) : productsQuery.isError ? (
          <section className="rounded-[2rem] border border-red-100 bg-red-50 p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400">error</span>
            <h2 className="mt-3 text-xl font-black text-red-700">Chưa tải được danh sách sản phẩm</h2>
            <p className="mt-2 text-sm font-semibold text-red-500">Bạn thử tải lại trang hoặc quay lại sau ít phút nhé.</p>
          </section>
        ) : visibleProducts.length === 0 ? (
          <section className={`rounded-[2rem] border bg-white p-8 text-center shadow-sm ${theme.accentBorder}`}>
            <span className={`material-symbols-outlined text-5xl ${theme.accentText}`}>inventory_2</span>
            <h2 className="mt-3 text-xl font-black text-slate-950">Chưa có sản phẩm phù hợp</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Hãy thử chọn “Tất cả” hoặc đổi từ khóa tìm kiếm.</p>
            <button type="button" onClick={() => { setActiveFilter('all'); setSearch(''); }} className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white">
              Xem tất cả sản phẩm
            </button>
          </section>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product._id ?? product.id ?? product.affiliateUrl} product={product} themeName={themeName} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
