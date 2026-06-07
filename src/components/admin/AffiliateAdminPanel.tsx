import { FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

type AffiliatePlatform = 'TIKTOK' | 'SHOPEE' | 'OTHER';
type AffiliateStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type AffiliateAudience = 'FEMALE' | 'MALE' | 'BOTH';

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
  category: '',
  symptomTags: '',
  phaseTags: '',
  goalTags: '',
  audience: 'BOTH' as AffiliateAudience,
  status: 'ACTIVE' as AffiliateStatus,
  priority: '0',
  sourceName: '',
};

function splitTags(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function money(value?: number) {
  return `${Math.round(value ?? 0).toLocaleString('vi-VN')}đ`;
}

const audienceLabel: Record<AffiliateAudience, string> = {
  FEMALE: 'User nữ',
  MALE: 'User nam',
  BOTH: 'Cả hai',
};

export default function AffiliateAdminPanel() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [preview, setPreview] = useState<AffiliatePreview | null>(null);
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
      setEditingId(null);
      setForm(EMPTY_FORM);
      setPreview(null);
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
      setPreview(next);
      setForm((current) => ({
        ...current,
        platform: next.platform ?? current.platform,
        affiliateUrl: next.normalizedUrl ?? current.affiliateUrl,
        name: current.name || next.title || '',
        description: current.description || next.description || '',
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
    onSuccess: ({ data }) => {
      const result = data.result;
      if (result?.results) {
        const totalCreated = result.results.reduce((sum: number, item: { created?: number }) => sum + (item.created ?? 0), 0);
        const totalUpdated = result.results.reduce((sum: number, item: { updated?: number }) => sum + (item.updated ?? 0), 0);
        toast.success(`Sync xong: ${totalCreated} mới, ${totalUpdated} cập nhật`);
      } else {
        toast.success(`Sync xong: ${result?.created ?? 0} mới, ${result?.updated ?? 0} cập nhật`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-overview'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-recommendations'] });
    },
    onError: () => toast.error('Sync thất bại. Kiểm tra credential TikTok/Shopee trong backend.'),
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
      category: product.category ?? '',
      symptomTags: (product.symptomTags ?? []).join(', '),
      phaseTags: (product.phaseTags ?? []).join(', '),
      goalTags: (product.goalTags ?? []).join(', '),
      audience: product.audience ?? 'BOTH',
      status: product.status ?? (product.isActive === false ? 'INACTIVE' : 'ACTIVE'),
      priority: String(product.priority ?? 0),
      sourceName: product.sourceName ?? '',
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

  const overview = overviewQuery.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Sản phẩm hoạt động', overview?.activeProducts ?? 0],
          ['Clicks', overview?.clicks ?? 0],
          ['Đơn affiliate', overview?.orders ?? 0],
          ['Hoa hồng đã chốt', money(overview?.commissionSettled)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Sản phẩm Affiliate</h2>
              <p className="text-sm font-semibold text-slate-500">Chỉ gợi ý sản phẩm wellness/comfort đã được duyệt.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => syncProducts.mutate('TIKTOK')} className="hi-btn-secondary rounded-full px-4 py-2 text-xs font-black">Sync TikTok</button>
              <button onClick={() => syncProducts.mutate('SHOPEE')} className="hi-btn-secondary rounded-full px-4 py-2 text-xs font-black">Sync Shopee</button>
              <button onClick={() => syncProducts.mutate(undefined)} className="hi-btn-primary rounded-full px-4 py-2 text-xs font-black">Sync tất cả</button>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
            {(productsQuery.data ?? []).map((product) => (
              <div key={product._id} className="grid gap-3 border-b border-slate-100 p-4 last:border-0 md:grid-cols-[1fr_110px_110px_120px] md:items-center">
                <div>
                  <p className="font-black text-slate-900">{product.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{product.description || product.affiliateUrl}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-pink-50 px-2 py-1 text-[10px] font-black text-pink-600">{product.platform}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-600">{audienceLabel[product.audience ?? 'BOTH']}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${product.isActive === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                      {product.isActive === false ? 'Đã ẩn' : 'Đang bật'}
                    </span>
                    {(product.symptomTags ?? []).slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{tag}</span>)}
                  </div>
                </div>
                <p className="text-sm font-black text-slate-700">{money(product.price)}</p>
                <p className="text-sm font-black text-emerald-600">{money(product.commissionAmount)}</p>
                <div className="flex gap-2 md:justify-end">
                  <button onClick={() => startEdit(product)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Sửa</button>
                  <button onClick={() => deleteProduct.mutate(product._id)} className="rounded-xl border border-rose-100 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50">Ẩn</button>
                </div>
              </div>
            ))}
            {!productsQuery.isLoading && (productsQuery.data ?? []).length === 0 && (
              <div className="p-8 text-center text-sm font-semibold text-slate-500">Chưa có sản phẩm affiliate nào.</div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <form onSubmit={submitProduct} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-900">{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</h3>
            <div className="mt-4 grid gap-3">
              <div className="rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-sky-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">Dán link trước</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Hi sẽ cố lấy tên, ảnh, mô tả và giá từ link. Nếu Shopee/TikTok chặn metadata, Admin nhập bổ sung phần còn thiếu.
                </p>
                <div className="mt-3 flex gap-2">
                  <input value={form.affiliateUrl} onChange={(e) => setForm({ ...form, affiliateUrl: e.target.value })} placeholder="Link affiliate TikTok/Shopee" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-pink-300" />
                  <button type="button" disabled={!form.affiliateUrl.trim() || previewLink.isPending} onClick={() => previewLink.mutate()} className="hi-btn-primary rounded-2xl px-4 py-3 text-xs font-black">
                    {previewLink.isPending ? 'Đang đọc...' : 'Lấy thông tin'}
                  </button>
                </div>
                {preview && (
                  <div className="mt-3 rounded-2xl border border-white/80 bg-white/80 p-3 text-xs font-semibold text-slate-500">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-pink-50 px-2.5 py-1 font-black text-pink-600">{preview.platform ?? form.platform}</span>
                      {preview.sourceName && <span className="rounded-full bg-sky-50 px-2.5 py-1 font-black text-sky-600">{preview.sourceName}</span>}
                    </div>
                    <p><b className="text-slate-700">Độ tin cậy:</b> {preview.confidence ?? 'LOW'}</p>
                    {preview.normalizedUrl && <p className="mt-1 break-all"><b className="text-slate-700">Link đã chuẩn hóa:</b> {preview.normalizedUrl}</p>}
                    {preview.errorMessage && <p className="mt-1 text-amber-600">{preview.errorMessage}</p>}
                    {(preview.missingFields ?? []).length > 0 && <p className="mt-1">Cần bổ sung: {(preview.missingFields ?? []).join(', ')}</p>}
                  </div>
                )}
              </div>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên sản phẩm" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-pink-300" />
              <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="Ảnh sản phẩm" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-pink-300" />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn" className="min-h-20 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-pink-300" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as AffiliatePlatform })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
                  <option value="SHOPEE">Shopee</option>
                  <option value="TIKTOK">TikTok</option>
                  <option value="OTHER">Khác</option>
                </select>
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as AffiliateAudience })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
                  <option value="BOTH">Cả hai</option>
                  <option value="FEMALE">User nữ</option>
                  <option value="MALE">User nam</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Giá" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
                <input value={form.commissionAmount} onChange={(e) => setForm({ ...form, commissionAmount: e.target.value })} placeholder="Hoa hồng" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} placeholder="% hoa hồng" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
                <input value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} placeholder="Ưu tiên" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              </div>
              <input value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })} placeholder="Nguồn/shop" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              <input value={form.symptomTags} onChange={(e) => setForm({ ...form, symptomTags: e.target.value })} placeholder="Tags triệu chứng, cách nhau bằng dấu phẩy" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              <input value={form.phaseTags} onChange={(e) => setForm({ ...form, phaseTags: e.target.value })} placeholder="Tags phase: kinh nguyệt, hoàng thể..." className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              <input value={form.goalTags} onChange={(e) => setForm({ ...form, goalTags: e.target.value })} placeholder="Tags mục tiêu: chăm sóc, thư giãn..." className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AffiliateStatus })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
                <option value="ACTIVE">Đang hiển thị</option>
                <option value="INACTIVE">Tạm khóa</option>
                <option value="ARCHIVED">Ẩn</option>
              </select>
              <button disabled={saveProduct.isPending} className="hi-btn-primary rounded-2xl px-5 py-3 text-sm font-black">
                {saveProduct.isPending ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
              </button>
            </div>
          </form>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveRevenue.mutate();
            }}
            className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm"
          >
            <h3 className="text-base font-black text-slate-900">Ghi doanh thu thủ công</h3>
            <div className="mt-4 grid gap-3">
              <select value={revenue.productId} onChange={(e) => setRevenue({ ...revenue, productId: e.target.value })} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold">
                <option value="">Không gắn sản phẩm</option>
                {(productsQuery.data ?? []).map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}
              </select>
              <input value={revenue.platformOrderId} onChange={(e) => setRevenue({ ...revenue, platformOrderId: e.target.value })} placeholder="Mã đơn platform" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              <input value={revenue.orderAmount} onChange={(e) => setRevenue({ ...revenue, orderAmount: e.target.value })} placeholder="Giá trị đơn" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              <input value={revenue.commissionAmount} onChange={(e) => setRevenue({ ...revenue, commissionAmount: e.target.value })} placeholder="Hoa hồng nhận được" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold" />
              <button disabled={saveRevenue.isPending} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60">
                Ghi nhận hoa hồng
              </button>
            </div>
          </form>
        </aside>
      </div>
    </div>
  );
}
