import { FormEvent, useMemo, useState } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import { ImageSquare, LinkSimple, PencilSimple, Plus, Storefront, Trash } from '@phosphor-icons/react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { bestProductName, cleanProductTitle, isNoisyAffiliateTitle } from '../../utils/affiliateDisplay';

type AffiliatePlatform = 'TIKTOK' | 'SHOPEE' | 'OTHER';
type AffiliateStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type AffiliateAudience = 'FEMALE' | 'MALE' | 'BOTH';
type CommissionSource = 'ESTIMATED' | 'MANUAL' | 'PLATFORM_SYNC';

interface AffiliateProduct {
  _id: number;
  name: string;
  description?: string;
  platform: AffiliatePlatform;
  affiliateUrl: string;
  imageUrl?: string;
  price?: number;
  commissionAmount?: number;
  commissionRate?: number;
  commissionSource?: CommissionSource;
  category?: string;
  symptomTags?: string[];
  phaseTags?: string[];
  goalTags?: string[];
  audience?: AffiliateAudience;
  status?: AffiliateStatus;
  isActive?: boolean;
  priority?: number;
  sourceName?: string;
}

interface AffiliateOverview {
  activeProducts: number;
  clicks: number;
  orders: number;
  commissionSettled: number;
  totalCommission?: number;
  totalOrderAmount?: number;
  conversionRate?: number;
  recentRevenueEvents?: Array<{
    _id: number;
    productId?: number;
    platform?: AffiliatePlatform;
    orderAmount?: number;
    commissionAmount?: number;
    status?: string;
    orderedAt?: string;
  }>;
  recentClicks?: Array<{
    _id: number;
    productId?: number;
    userId?: string;
    clickedAt?: string;
  }>;
}

interface AffiliatePreview {
  platform?: AffiliatePlatform;
  title?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  sourceName?: string;
  normalizedUrl?: string;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  missingFields?: string[];
  errorMessage?: string;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  platform: 'SHOPEE' as AffiliatePlatform,
  affiliateUrl: '',
  imageUrl: '',
  price: '',
  commissionAmount: '',
  commissionRate: '',
  commissionSource: 'ESTIMATED' as CommissionSource,
  category: '',
  symptomTags: '',
  phaseTags: '',
  goalTags: '',
  audience: 'BOTH' as AffiliateAudience,
  status: 'ACTIVE' as AffiliateStatus,
  priority: '0',
  sourceName: '',
};

const audienceLabel: Record<AffiliateAudience, string> = {
  FEMALE: 'User nữ',
  MALE: 'User nam',
  BOTH: 'Cả hai',
};

function splitTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function money(value?: number) {
  if (value == null || Number.isNaN(value)) return 'Chưa có';
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

function numberText(value: number) {
  if (!Number.isFinite(value)) return '';
  return String(Math.round(value * 100) / 100);
}

function imageFallback(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.style.display = 'none';
}

export default function AffiliateAdminPanel() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<AffiliatePreview | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [revenue, setRevenue] = useState({
    platform: 'SHOPEE' as AffiliatePlatform,
    platformOrderId: '',
    productId: '',
    orderAmount: '',
    commissionAmount: '',
    status: 'SETTLED',
  });

  const productsQuery = useQuery({
    queryKey: ['admin-affiliate-products'],
    queryFn: () => api.get('/affiliate-products', { params: { limit: 100 } }).then(({ data }) => data.products as AffiliateProduct[]),
  });

  const overviewQuery = useQuery({
    queryKey: ['admin-affiliate-overview'],
    queryFn: () => api.get('/affiliate-products/admin/overview').then(({ data }) => {
      const summary = data.overview?.summary ?? data.overview ?? {};
      return {
        ...summary,
        commissionSettled: summary.commissionSettled ?? summary.settledCommission ?? 0,
        recentRevenueEvents: data.overview?.recentRevenueEvents ?? [],
        recentClicks: data.overview?.recentClicks ?? [],
      } as AffiliateOverview;
    }),
  });

  const saveProduct = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        price: form.price ? Number(form.price) : undefined,
        commissionAmount: form.commissionAmount ? Number(form.commissionAmount) : undefined,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : undefined,
        commissionSource: form.commissionSource,
        priority: Number(form.priority || 0),
        symptomTags: splitTags(form.symptomTags),
        phaseTags: splitTags(form.phaseTags),
        goalTags: splitTags(form.goalTags),
        isActive: form.status !== 'ARCHIVED' && form.status !== 'INACTIVE',
      };
      return editingId ? api.put(`/affiliate-products/${editingId}`, payload) : api.post('/affiliate-products', payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Đã cập nhật sản phẩm affiliate' : 'Đã thêm sản phẩm affiliate');
      closeProductModal();
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-recommendations'] });
    },
    onError: () => toast.error('Không thể lưu sản phẩm affiliate'),
  });

  const previewLink = useMutation({
    mutationFn: () => api.post('/affiliate-products/preview-link', { url: form.affiliateUrl }),
    onSuccess: ({ data }) => {
      const next = data.preview as AffiliatePreview;
      const cleanTitle = cleanProductTitle(next.title);
      const shouldUseTitle = cleanTitle && !(next.confidence === 'LOW' && isNoisyAffiliateTitle(next.title));
      setPreview(next);
      setForm((current) => ({
        ...current,
        platform: next.platform ?? current.platform,
        affiliateUrl: next.normalizedUrl ?? current.affiliateUrl,
        name: current.name || (shouldUseTitle ? cleanTitle : ''),
        description: current.description || cleanProductTitle(next.description, 160) || '',
        imageUrl: current.imageUrl || next.imageUrl || '',
        price: current.price || (next.price != null ? String(next.price) : ''),
        sourceName: current.sourceName || next.sourceName || '',
      }));
      toast.success(next.confidence === 'LOW' ? 'Đã lấy được một phần thông tin từ link' : 'Đã tự điền thông tin từ link');
    },
    onError: (error) => {
      const message = typeof error === 'object' && error && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      toast.error(message ?? 'Không đọc được link này. Bạn vẫn có thể nhập thủ công.');
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: number) => api.delete(`/affiliate-products/${id}`),
    onSuccess: () => {
      toast.success('Đã ẩn sản phẩm');
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-overview'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-recommendations'] });
    },
    onError: () => toast.error('Không thể ẩn sản phẩm'),
  });

  const syncProducts = useMutation({
    mutationFn: (platform?: AffiliatePlatform) => api.post('/affiliate-products/sync', null, { params: platform ? { platform } : undefined }),
    onSuccess: () => {
      toast.success('Sync hoàn tất');
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-overview'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-recommendations'] });
    },
    onError: () => toast.error('Chưa cấu hình credential TikTok/Shopee trong backend. Sản phẩm vẫn có thể nhập thủ công.'),
  });

  const saveRevenue = useMutation({
    mutationFn: () => api.post('/affiliate-products/revenue-events', {
      platform: revenue.platform,
      platformOrderId: revenue.platformOrderId || undefined,
      productId: revenue.productId ? Number(revenue.productId) : undefined,
      orderAmount: revenue.orderAmount ? Number(revenue.orderAmount) : 0,
      commissionAmount: revenue.commissionAmount ? Number(revenue.commissionAmount) : 0,
      status: revenue.status,
    }),
    onSuccess: () => {
      toast.success('Đã ghi nhận doanh thu affiliate');
      setRevenue({ platform: 'SHOPEE', platformOrderId: '', productId: '', orderAmount: '', commissionAmount: '', status: 'SETTLED' });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: () => toast.error('Không thể ghi nhận doanh thu'),
  });

  const overview = overviewQuery.data;
  const products = productsQuery.data ?? [];
  const chartData = useMemo(() => ([
    { label: 'Click', value: overview?.clicks ?? 0, color: '#60a5fa' },
    { label: 'Đơn', value: overview?.orders ?? 0, color: '#eb477e' },
    { label: 'HH chốt', value: Math.round((overview?.commissionSettled ?? 0) / 1000), color: '#10b981' },
  ]), [overview]);
  const productNameById = useMemo(() => {
    const map = new Map<number, string>();
    products.forEach((product) => map.set(product._id, bestProductName(product)));
    return map;
  }, [products]);

  const previewProductImage = useMemo(() => form.imageUrl || preview?.imageUrl || '', [form.imageUrl, preview?.imageUrl]);

  const openCreateModal = () => {
    setEditingId(null);
    setPreview(null);
    setForm(EMPTY_FORM);
    setProductModalOpen(true);
  };

  const closeProductModal = () => {
    setEditingId(null);
    setPreview(null);
    setForm(EMPTY_FORM);
    setProductModalOpen(false);
  };

  const startEdit = (product: AffiliateProduct) => {
    setEditingId(product._id);
    setPreview(null);
    setForm({
      name: product.name ?? '',
      description: product.description ?? '',
      platform: product.platform ?? 'SHOPEE',
      affiliateUrl: product.affiliateUrl ?? '',
      imageUrl: product.imageUrl ?? '',
      price: product.price?.toString() ?? '',
      commissionAmount: product.commissionAmount?.toString() ?? '',
      commissionRate: product.commissionRate?.toString() ?? '',
      commissionSource: product.commissionSource ?? 'MANUAL',
      category: product.category ?? '',
      symptomTags: (product.symptomTags ?? []).join(', '),
      phaseTags: (product.phaseTags ?? []).join(', '),
      goalTags: (product.goalTags ?? []).join(', '),
      audience: product.audience ?? 'BOTH',
      status: product.status ?? (product.isActive === false ? 'INACTIVE' : 'ACTIVE'),
      priority: String(product.priority ?? 0),
      sourceName: product.sourceName ?? '',
    });
    setProductModalOpen(true);
  };

  const updateCommissionRate = (value: string) => {
    const price = Number(form.price);
    const rate = Number(value);
    setForm({
      ...form,
      commissionRate: value,
      commissionAmount: price > 0 && rate > 0 ? numberText((price * rate) / 100) : form.commissionAmount,
      commissionSource: 'ESTIMATED',
    });
  };

  const updateCommissionAmount = (value: string) => {
    const price = Number(form.price);
    const amount = Number(value);
    setForm({
      ...form,
      commissionAmount: value,
      commissionRate: price > 0 && amount > 0 ? numberText((amount / price) * 100) : form.commissionRate,
      commissionSource: 'MANUAL',
    });
  };

  const updatePrice = (value: string) => {
    const price = Number(value);
    const rate = Number(form.commissionRate);
    setForm({
      ...form,
      price: value,
      commissionAmount: price > 0 && rate > 0 ? numberText((price * rate) / 100) : form.commissionAmount,
      commissionSource: rate > 0 ? 'ESTIMATED' : form.commissionSource,
    });
  };

  const submitProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.affiliateUrl.trim()) {
      toast.error('Nhập tên sản phẩm và link affiliate trước nhé');
      return;
    }
    saveProduct.mutate();
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Sản phẩm hoạt động', overview?.activeProducts ?? 0],
          ['Clicks', overview?.clicks ?? 0],
          ['Đơn affiliate', overview?.orders ?? 0],
          ['Hoa hồng đã chốt', money(overview?.commissionSettled)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-4 text-2xl font-extrabold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-bold text-slate-950">Affiliate funnel</h3>
              <p className="mt-1 text-xs text-slate-500">Click được ghi nhận ngay; doanh thu chỉ đến từ nhập tay hoặc sync nền tảng.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
              Không tự tạo doanh thu từ click
            </span>
          </div>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry) => <Cell key={entry.label} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-950">Gần đây</h3>
          <div className="mt-4 space-y-3">
            {(overview?.recentRevenueEvents ?? []).slice(0, 3).map((event) => (
              <div key={`revenue-${event._id}`} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-xs font-black text-emerald-700">{money(event.commissionAmount)} hoa hồng</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-600">{event.productId ? productNameById.get(event.productId) ?? `Sản phẩm #${event.productId}` : 'Không gắn sản phẩm'} · {event.status ?? 'PENDING'}</p>
              </div>
            ))}
            {(overview?.recentClicks ?? []).slice(0, 3).map((click) => (
              <div key={`click-${click._id}`} className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <p className="text-xs font-black text-blue-700">Click affiliate</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-600">{click.productId ? productNameById.get(click.productId) ?? `Sản phẩm #${click.productId}` : 'Không rõ sản phẩm'}</p>
              </div>
            ))}
            {(overview?.recentRevenueEvents ?? []).length === 0 && (overview?.recentClicks ?? []).length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs font-semibold text-slate-400">
                Chưa có click hoặc doanh thu affiliate gần đây.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">Sản phẩm Affiliate</h2>
            <p className="mt-1 text-sm text-slate-500">Ảnh, giá và hoa hồng được hiển thị rõ để admin kiểm duyệt nhanh.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" loading={syncProducts.isPending} onClick={() => syncProducts.mutate('TIKTOK')}>Sync TikTok</Button>
            <Button variant="outline" loading={syncProducts.isPending} onClick={() => syncProducts.mutate('SHOPEE')}>Sync Shopee</Button>
            <Button onClick={openCreateModal}><Plus size={16} className="mr-2" />Thêm sản phẩm</Button>
          </div>
        </div>

        {productsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <Storefront size={34} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">Chưa có sản phẩm affiliate nào.</p>
            <Button className="mt-5" onClick={openCreateModal}>Thêm sản phẩm đầu tiên</Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((product) => (
              <article key={product._id} className="grid gap-4 p-4 md:grid-cols-[88px_minmax(0,1fr)_120px_140px_140px] md:items-center">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} loading="lazy" referrerPolicy="no-referrer" onError={imageFallback} className="relative z-10 h-full w-full object-cover" />
                  ) : null}
                  <ImageSquare size={24} className="absolute text-slate-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-sm font-extrabold text-slate-950">{bestProductName(product)}</h3>
                    <Badge tone={product.platform === 'TIKTOK' ? 'rose' : 'slate'}>{product.platform}</Badge>
                    <Badge tone={product.isActive === false ? 'slate' : 'emerald'}>{product.isActive === false ? 'Ẩn' : 'Đang bật'}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{cleanProductTitle(product.description, 140) || cleanProductTitle(product.sourceName) || 'Chưa có mô tả'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge>{audienceLabel[product.audience ?? 'BOTH']}</Badge>
                    {(product.symptomTags ?? []).slice(0, 3).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                  </div>
                </div>
                <Metric label="Giá" value={money(product.price)} />
                <Metric
                  label={product.commissionSource === 'PLATFORM_SYNC' ? 'Hoa hồng' : 'Hoa hồng ước tính'}
                  value={money(product.commissionAmount)}
                />
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <a
                    href={product.affiliateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    <LinkSimple size={14} className="mr-1" />
                    Mở
                  </a>
                  <Button size="sm" variant="outline" onClick={() => startEdit(product)}><PencilSimple size={14} className="mr-1" />Sửa</Button>
                  <Button size="sm" variant="danger" loading={deleteProduct.isPending && deleteProduct.variables === product._id} onClick={() => deleteProduct.mutate(product._id)}>
                    <Trash size={14} className="mr-1" />
                    Ẩn
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-950">Ghi doanh thu thủ công</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveRevenue.mutate();
          }}
          className="mt-4 grid gap-3 md:grid-cols-5"
        >
          <select value={revenue.productId} onChange={(event) => setRevenue({ ...revenue, productId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
            <option value="">Không gắn sản phẩm</option>
            {products.map((product) => <option key={product._id} value={product._id}>{bestProductName(product)}</option>)}
          </select>
          <Input value={revenue.platformOrderId} onChange={(event) => setRevenue({ ...revenue, platformOrderId: event.target.value })} placeholder="Mã đơn" />
          <Input value={revenue.orderAmount} onChange={(event) => setRevenue({ ...revenue, orderAmount: event.target.value })} placeholder="Giá trị đơn" />
          <Input value={revenue.commissionAmount} onChange={(event) => setRevenue({ ...revenue, commissionAmount: event.target.value })} placeholder="Hoa hồng" />
          <Button loading={saveRevenue.isPending}>Ghi nhận</Button>
        </form>
      </section>

      <Modal
        open={productModalOpen}
        onClose={closeProductModal}
        title={editingId ? 'Sửa sản phẩm affiliate' : 'Thêm sản phẩm affiliate'}
        footer={(
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeProductModal}>Hủy</Button>
            <Button disabled={!form.name.trim() || !form.affiliateUrl.trim()} loading={saveProduct.isPending} onClick={() => saveProduct.mutate()}>{editingId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}</Button>
          </div>
        )}
      >
        <form onSubmit={submitProduct} className="space-y-4">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <p className="text-sm font-bold text-slate-900">Dán link trước</p>
            <p className="mt-1 text-xs text-slate-500">Hi sẽ cố lấy tên, ảnh, mô tả và giá. Hoa hồng từ link công khai chỉ là ước tính hoặc nhập tay.</p>
            <div className="mt-3 flex gap-2">
              <Input value={form.affiliateUrl} onChange={(event) => setForm({ ...form, affiliateUrl: event.target.value })} placeholder="Link TikTok/Shopee" />
              <Button type="button" disabled={!form.affiliateUrl.trim()} loading={previewLink.isPending} onClick={() => previewLink.mutate()}>
                Lấy thông tin
              </Button>
            </div>
            {preview ? (
              <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-500">
                Độ tin cậy: <span className="font-bold text-slate-900">{preview.confidence ?? 'LOW'}</span>
                {(preview.missingFields ?? []).length > 0 ? <span> · Cần bổ sung: {(preview.missingFields ?? []).join(', ')}</span> : null}
                {preview.errorMessage ? <p className="mt-1 text-amber-700">{preview.errorMessage}</p> : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 lg:grid-cols-[160px_minmax(0,1fr)]">
            <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {previewProductImage ? (
                <img src={previewProductImage} alt="" referrerPolicy="no-referrer" onError={imageFallback} className="h-full w-full object-cover" />
              ) : (
                <ImageSquare size={34} className="text-slate-300" />
              )}
            </div>
            <div className="grid gap-3">
              <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tên sản phẩm" />
              <Input value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="URL ảnh sản phẩm" />
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Mô tả ngắn"
                className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <select value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as AffiliatePlatform })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
              <option value="SHOPEE">Shopee</option>
              <option value="TIKTOK">TikTok</option>
              <option value="OTHER">Khác</option>
            </select>
            <select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value as AffiliateAudience })} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
              <option value="BOTH">Cả hai</option>
              <option value="FEMALE">User nữ</option>
              <option value="MALE">User nam</option>
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={form.price} onChange={(event) => updatePrice(event.target.value)} placeholder="Giá" />
            <Input value={form.commissionRate} onChange={(event) => updateCommissionRate(event.target.value)} placeholder="% hoa hồng" />
            <Input value={form.commissionAmount} onChange={(event) => updateCommissionAmount(event.target.value)} placeholder="Hoa hồng" />
          </div>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            Nguồn hoa hồng: {form.commissionSource === 'PLATFORM_SYNC' ? 'Đồng bộ nền tảng' : form.commissionSource === 'MANUAL' ? 'Admin nhập tay' : 'Ước tính từ giá và tỷ lệ'}.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.sourceName} onChange={(event) => setForm({ ...form, sourceName: event.target.value })} placeholder="Nguồn/shop" />
            <Input value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} placeholder="Ưu tiên" />
          </div>
          <Input value={form.symptomTags} onChange={(event) => setForm({ ...form, symptomTags: event.target.value })} placeholder="Tags triệu chứng, cách nhau bằng dấu phẩy" />
          <Input value={form.phaseTags} onChange={(event) => setForm({ ...form, phaseTags: event.target.value })} placeholder="Tags phase: kinh nguyệt, hoàng thể..." />
          <Input value={form.goalTags} onChange={(event) => setForm({ ...form, goalTags: event.target.value })} placeholder="Tags mục tiêu: chăm sóc, thư giãn..." />
          <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AffiliateStatus })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold">
            <option value="ACTIVE">Đang hiển thị</option>
            <option value="INACTIVE">Tạm khóa</option>
            <option value="ARCHIVED">Ẩn</option>
          </select>
          <button type="submit" className="hidden">Submit</button>
        </form>
      </Modal>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'emerald' | 'rose' }) {
  const classes = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${classes[tone]}`}>{children}</span>;
}
