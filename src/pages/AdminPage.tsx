import { useMemo, useState, useEffect } from 'react';
import HiLogo from '../components/ui/HiLogo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  ShieldCheck,
  Heart,
  Bell,
  Robot,
  DownloadSimple,
  BellRinging,
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  Crown,
  CurrencyCircleDollar,
  Coins,
  CreditCard,
  PaperPlaneRight,
  Sliders,
  Cpu,
  Database,
  ChartPieSlice,
  CheckCircle,
  Clock,
  XCircle,
  TrendUp,
  Pulse,
} from '@phosphor-icons/react';

import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import {
  Area,
  AreaChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts';
import api from '../lib/api';

interface MoodItem {
  name: string;
  value: number;
  color: string;
}

interface ChatHourItem {
  hour: string;
  queries: number;
}

interface AdminOverview {
  usersTotal: number;
  usersFemale: number;
  usersMale: number;
  adminsTotal: number;
  cyclesTotal: number;
  symptomsTotal: number;
  notificationsTotal: number;
  unreadNotifications: number;
  chatMessagesTotal: number;
}

interface AdminFinancialReport {
  estimatedPaidUsers: number;
  estimatedMrrUsd: number;
  estimatedAiCostMonthlyUsd: number;
  infraCostUsd: number;
  estimatedGrossProfitUsd: number;
  estimatedGrossMarginPct: number;
  arpuUsd: number;
  monthlyChurnRatePct: number;
  estimatedLtvUsd: number;
  assumptions: {
    paidUserRate: number;
    avgMessagesPerConversation: number;
    avgTokensPerConversation: number;
    aiCostPer1kTokens: number;
  };
}

interface MonthlyFinancialItem {
  month: string;
  newUsers: number;
  chatMessages: number;
  revenueUsd: number;
  aiCostUsd: number;
  netUsd: number;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  gender: 'female' | 'male' | 'other';
  role: 'user' | 'admin';
  onboardingCompleted?: boolean;
  createdAt: string;
}

interface PayOSTransaction {
  _id: string;
  userId: string;
  userEmail: string;
  orderCode: number;
  amount: number;
  plan: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface PayOSReport {
  totalRevenueVnd: number;
  completedOrdersCount: number;
  totalOrdersCount: number;
  statusBreakdown: {
    completed: number;
    pending: number;
    canceled: number;
  };
  transactions: PayOSTransaction[];
}

const PAGE_SIZE = 10;

// Pastel colors theme for Hi app
const STAT_CARDS = [
  { key: 'users', label: 'Tổng người dùng', Icon: Users, iconColor: 'text-[#e9638f]', bgCls: 'bg-rose-50/60 border-rose-100/50' },
  { key: 'admins', label: 'Quản trị viên', Icon: ShieldCheck, iconColor: 'text-amber-500', bgCls: 'bg-amber-50/60 border-amber-100/50' },
  { key: 'health', label: 'Dữ liệu sức khỏe', Icon: Heart, iconColor: 'text-emerald-500', bgCls: 'bg-emerald-50/60 border-emerald-100/50' },
  { key: 'notifs', label: 'Thông báo đã gửi', Icon: Bell, iconColor: 'text-purple-500', bgCls: 'bg-purple-50/60 border-purple-100/50' },
  { key: 'chat', label: 'Lịch sử AI Chat', Icon: Robot, iconColor: 'text-sky-500', bgCls: 'bg-sky-50/60 border-sky-100/50' },
] as const;

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'payos' | 'users' | 'system'>('overview');
  const [q, setQ] = useState('');
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male' | 'other'>('all');
  const [page, setPage] = useState(1);
  const [chartRange, setChartRange] = useState<3 | 6>(6);

  // Time filter for PayOS Revenue
  const [payosPeriod, setPayosPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all'>('year');

  // Sliders for Financial Simulator
  const [simPaidRate, setSimPaidRate] = useState<number>(15);
  const [simArpu, setSimArpu] = useState<number>(4.99);

  // Notification Campaign State
  const [campaignTarget, setCampaignTarget] = useState<string>('all');
  const [campaignTitle, setCampaignTitle] = useState<string>('');
  const [campaignBody, setCampaignBody] = useState<string>('');
  const [isSendingCampaign, setIsSendingCampaign] = useState<boolean>(false);



  const usersQueryKey = useMemo(
    () => ['admin-users', { q, roleFilter, genderFilter, page }],
    [q, roleFilter, genderFilter, page]
  );

  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const { data } = await api.get('/admin/overview');
      return data as {
        success: boolean;
        overview: AdminOverview;
        financialReport: AdminFinancialReport;
        monthlyFinancials: MonthlyFinancialItem[];
        recentUsers: AdminUser[];
        payosReport: PayOSReport;
        moodDistribution?: MoodItem[];
        hourlyChatTraffic?: ChatHourItem[];
      };
    },
  });

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      const { data } = await api.get('/admin/users', {
        params: {
          q: q || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
          gender: genderFilter === 'all' ? undefined : genderFilter,
          page,
          limit: PAGE_SIZE,
        },
      });
      return data as {
        success: boolean;
        items: AdminUser[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });

  // Set default slider values once assumptions loaded
  useEffect(() => {
    if (overviewQuery.data?.financialReport) {
      setSimPaidRate(overviewQuery.data.financialReport.assumptions.paidUserRate);
      setSimArpu(overviewQuery.data.financialReport.arpuUsd);
    }
  }, [overviewQuery.data?.financialReport]);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò người dùng thành công');
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật vai trò');
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: async () => {
      const response = await api.get('/admin/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Đã xuất và tải xuống danh sách người dùng CSV'),
    onError: () => toast.error('Xuất CSV thất bại'),
  });

  const triggerRemindersMutation = useMutation({
    mutationFn: () => api.post('/admin/trigger-reminders'),
    onSuccess: () => toast.success('Đã chạy thủ công lệnh gửi thông báo nhắc nhở chu kỳ kinh'),
    onError: () => toast.error('Gửi nhắc nhở thất bại'),
  });

  const displayStats = overviewQuery.data?.overview;
  const displayFinancial = overviewQuery.data?.financialReport;
  const displayMonthlyFinancials = overviewQuery.data?.monthlyFinancials || [];
  const displayRecentUsers = overviewQuery.data?.recentUsers || [];
  const displayUsers = usersQuery.data?.items || [];
  const displayPagination = usersQuery.data?.pagination;
  const displayPayOSReport = overviewQuery.data?.payosReport;
  const displayMoodDistribution = overviewQuery.data?.moodDistribution || [];
  const displayHourlyChatTraffic = overviewQuery.data?.hourlyChatTraffic || [];

  const moodTotal = useMemo(() => displayMoodDistribution.reduce((acc, curr) => acc + (curr.value || 0), 0), [displayMoodDistribution]);
  const chatTotal = useMemo(() => displayHourlyChatTraffic.reduce((acc, curr) => acc + (curr.queries || 0), 0), [displayHourlyChatTraffic]);

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQ(searchText.trim());
  };

  const chartData = displayMonthlyFinancials.slice(-chartRange);
  const genderOther = Math.max(
    (displayStats?.usersTotal ?? 0) - (displayStats?.usersFemale ?? 0) - (displayStats?.usersMale ?? 0),
    0,
  );
  const genderData = [
    { name: 'Nữ', value: displayStats?.usersFemale ?? 0, color: '#e9638f' },
    { name: 'Nam', value: displayStats?.usersMale ?? 0, color: '#a78bfa' },
    { name: 'Khác', value: genderOther, color: '#94a3b8' },
  ];

  const statValues = [
    {
      value: displayStats?.usersTotal ?? 0,
      sub: `${displayStats?.usersFemale ?? 0} nữ · ${displayStats?.usersMale ?? 0} nam`,
    },
    { value: displayStats?.adminsTotal ?? 0, sub: 'Quyền cao nhất' },
    {
      value: (displayStats?.cyclesTotal ?? 0) + (displayStats?.symptomsTotal ?? 0),
      sub: `${displayStats?.cyclesTotal ?? 0} chu kỳ · ${displayStats?.symptomsTotal ?? 0} triệu chứng`,
    },
    { value: displayStats?.notificationsTotal ?? 0, sub: `${displayStats?.unreadNotifications ?? 0} chưa đọc` },
    { value: displayStats?.chatMessagesTotal ?? 0, sub: 'Lịch sử AI Chat' },
  ];

  // Dynamic client-side filter for PayOS transactions
  const filteredPayosMetrics = useMemo(() => {
    if (!displayPayOSReport) return { totalRevenue: 0, completedCount: 0, statusData: [], list: [] };
    const txs = displayPayOSReport.transactions || [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - 7 * 24 * 60 * 60 * 1000;
    const monthStart = todayStart - 30 * 24 * 60 * 60 * 1000;
    const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

    const filtered = txs.filter((tx) => {
      if (!tx.createdAt) return false;
      const txTime = new Date(tx.createdAt).getTime();
      if (payosPeriod === 'today') return txTime >= todayStart;
      if (payosPeriod === 'week') return txTime >= weekStart;
      if (payosPeriod === 'month') return txTime >= monthStart;
      if (payosPeriod === 'year') return txTime >= yearStart;
      return true;
    });

    let totalRevenue = 0;
    let completedCount = 0;
    let completed = 0;
    let pending = 0;
    let canceled = 0;

    filtered.forEach((tx) => {
      const status = tx.status?.toLowerCase() || 'pending';
      if (status === 'completed') {
        totalRevenue += tx.amount || 0;
        completedCount++;
        completed++;
      } else if (status === 'pending') {
        pending++;
      } else {
        canceled++;
      }
    });

    const finalStatusData = [
      { name: 'Đã thanh toán', value: completed, color: '#e9638f' }, // Hi accent pink
      { name: 'Chờ thanh toán', value: pending, color: '#a78bfa' },   // Hi accent purple
      { name: 'Hủy', value: canceled, color: '#cbd5e1' },            // Slate light gray
    ].filter((item) => item.value > 0);

    return {
      totalRevenue,
      completedCount,
      statusData: finalStatusData,
      list: filtered,
    };
  }, [displayPayOSReport, payosPeriod]);

  // Financial Simulator values based on system variables & sliders
  const simMetrics = useMemo(() => {
    const totalUsers = displayStats?.usersTotal ?? 0;
    const chatQueries = displayStats?.chatMessagesTotal ?? 0;

    const paidUsers = Math.round(totalUsers * (simPaidRate / 100));
    const mrr = paidUsers * simArpu;
    const conversations = chatQueries / (displayFinancial?.assumptions.avgMessagesPerConversation || 10.0);
    const avgTokens = displayFinancial?.assumptions.avgTokensPerConversation || 800.0;
    const tokenPrice = displayFinancial?.assumptions.aiCostPer1kTokens || 0.005;
    const aiCostMonthly = (conversations * avgTokens / 1000.0) * tokenPrice;

    const infraCost = displayFinancial?.infraCostUsd || 30.0;
    const grossProfit = mrr - aiCostMonthly - infraCost;
    const grossMargin = mrr > 0 ? (grossProfit / mrr) * 100 : 0;

    return {
      paidUsers,
      mrr: Math.max(0, mrr),
      aiCost: Math.max(0, aiCostMonthly),
      grossProfit,
      grossMargin: Math.max(0, Math.min(100, grossMargin)),
    };
  }, [displayStats?.usersTotal, displayStats?.chatMessagesTotal, displayFinancial, simPaidRate, simArpu]);

  // Handle Notification Campaign sending
  const handleSendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignTitle.trim() || !campaignBody.trim()) {
      toast.error('Vui lòng nhập đầy đủ nội dung chiến dịch');
      return;
    }

    setIsSendingCampaign(true);
    try {
      await api.post('/admin/send-campaign', {
        target: campaignTarget,
        title: campaignTitle.trim(),
        body: campaignBody.trim(),
      });
      toast.success(`Đã phát đi chiến dịch tới đối tượng: ${campaignTarget.toUpperCase()}`);
      setCampaignTitle('');
      setCampaignBody('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gửi chiến dịch thất bại');
    } finally {
      setIsSendingCampaign(false);
    }
  };

  const currentTabName = useMemo(() => {
    if (activeTab === 'overview') return 'Tổng quan hệ thống';
    if (activeTab === 'payos') return 'Doanh thu PayOS';
    if (activeTab === 'users') return 'Quản lý tài khoản';
    return 'Hệ thống & AI';
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#f8f6f7] text-slate-800 flex font-sans">

      {/* ── LIGHT SIDEBAR ── */}
      <aside className="w-[220px] shrink-0 bg-white border-r border-slate-100 flex flex-col sticky top-0 h-screen overflow-y-auto">

        {/* ── Logo block ── */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <HiLogo size={34} />
            <div className="leading-tight">
              <p className="text-slate-900 font-extrabold text-[15px] tracking-tight">Hi</p>
              <p className="text-[#eb477e] text-[10px] font-semibold tracking-wide uppercase">Admin</p>
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="mx-5 h-px bg-slate-100" />

        {/* ── Nav items ── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">Điều hướng</p>
          {[
            { id: 'overview', label: 'Tổng quan', Icon: ChartPieSlice, desc: 'Thống kê tổng hợp' },
            { id: 'payos', label: 'Doanh thu', Icon: CurrencyCircleDollar, desc: 'PayOS & giao dịch' },
            { id: 'users', label: 'Người dùng', Icon: Users, desc: 'Tài khoản & phân quyền' },
            { id: 'system', label: 'Hệ thống', Icon: Cpu, desc: 'AI & dịch vụ' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id as any); setPage(1); }}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all relative overflow-hidden ${
                  active
                    ? 'bg-[#fdf0f4] text-[#eb477e]'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {/* Active left border pill */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#eb477e]" />
                )}
                <tab.Icon
                  size={16}
                  weight={active ? 'fill' : 'regular'}
                  className={`shrink-0 transition-colors ${
                    active ? 'text-[#eb477e]' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold truncate leading-tight ${
                    active ? 'text-[#eb477e]' : ''
                  }`}>{tab.label}</p>
                  <p className={`text-[10px] truncate leading-tight mt-0.5 ${
                    active ? 'text-[#eb477e]/70' : 'text-slate-400'
                  }`}>{tab.desc}</p>
                </div>
              </button>
            );
          })}
        </nav>

        {/* ── Sidebar footer ── */}
        <div className="px-4 py-4 border-t border-slate-100 space-y-3">
          {/* Status chip */}
          <div className="flex items-center gap-2 px-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Hệ thống hoạt động</span>
          </div>
          {/* App version badge */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-300 font-medium">Hi Admin v2.5</span>
            <span className="text-[9px] bg-[#fdf0f4] text-[#eb477e] font-bold px-2 py-0.5 rounded-full">
              MVP
            </span>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200/60 px-7 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 tracking-tight">{currentTabName}</h1>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Hi App · Bảng quản trị nội bộ</p>
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Hệ thống đang hoạt động
          </span>
        </header>

        {/* ── CONTENT ── */}
        <main className="flex-1 p-6 lg:p-8">
        <div className="space-y-0">


            {/* ── TAB 1: TỔNG QUAN ── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">

                {/* 5 stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {overviewQuery.isLoading
                    ? Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className="h-24 rounded-2xl bg-white border border-slate-200/60 animate-pulse" />
                      ))
                    : STAT_CARDS.map((stat, i) => (
                        <div key={stat.key} className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-2.5">
                            <div className={`p-1.5 rounded-lg bg-slate-50 border border-slate-100 ${stat.iconColor}`}>
                              <stat.Icon size={14} weight="bold" />
                            </div>
                          </div>
                          <p className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                            {(statValues[i]?.value ?? 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1.5">{stat.label}</p>
                          {statValues[i]?.sub && (
                            <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">{statValues[i]?.sub}</p>
                          )}
                        </div>
                      ))}
                </div>

                {/* Charts row 1 */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                  {/* Growth area chart */}
                  <div className="xl:col-span-2 bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Tăng trưởng & Tương tác AI</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Users mới và chat queries theo tháng</p>
                      </div>
                      <div className="inline-flex items-center rounded-lg bg-slate-100 p-0.5">
                        {([3, 6] as const).map((range) => (
                          <button
                            key={range}
                            type="button"
                            onClick={() => setChartRange(range)}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                              chartRange === range ? 'bg-white text-[#eb477e] shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            {range}T
                          </button>
                        ))}
                      </div>
                    </div>
                    {overviewQuery.isLoading ? (
                      <div className="h-52 flex items-center justify-center"><Spinner /></div>
                    ) : chartData.length === 0 ? (
                      <div className="h-52 flex items-center justify-center text-xs text-slate-400">Chưa có dữ liệu</div>
                    ) : (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#eb477e" stopOpacity={0.18} />
                                <stop offset="100%" stopColor="#eb477e" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="chatGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.18} />
                                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, fontSize: 11 }}
                              formatter={(value, name) => [Number(value ?? 0).toFixed(0), String(name)]}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                            <Area yAxisId="left" type="monotone" dataKey="newUsers" name="Users mới" stroke="#eb477e" fill="url(#userGrad)" strokeWidth={2} />
                            <Area yAxisId="right" type="monotone" dataKey="chatMessages" name="Chat queries" stroke="#a78bfa" fill="url(#chatGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Gender donut */}
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">Cơ cấu giới tính</h3>
                    <div className="h-40 w-full relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={2}>
                            {genderData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} người`, 'Số lượng']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <p className="text-lg font-black text-slate-800">{displayStats?.usersTotal ?? 0}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">TỔNG</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center border-t border-slate-100 pt-3 mt-2">
                      {genderData.map((d) => (
                        <div key={d.name}>
                          <span className="text-[10px] text-slate-400 block font-medium">{d.name}</span>
                          <div className="flex items-center justify-center gap-1 mt-0.5">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-xs font-bold text-slate-800">{d.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Charts row 2 */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

                  {/* Mood bar chart */}
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-0.5">Chỉ số Tâm trạng Hệ thống</h3>
                    <p className="text-[11px] text-slate-400 mb-4">Phân tích sức khỏe tinh thần từ nhật ký người dùng.</p>
                    {overviewQuery.isLoading ? (
                      <div className="h-52 flex items-center justify-center"><Spinner /></div>
                    ) : displayMoodDistribution.length === 0 || moodTotal === 0 ? (
                      <div className="h-52 flex items-center justify-center text-xs text-slate-400">Chưa có dữ liệu tâm trạng</div>
                    ) : (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={displayMoodDistribution} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip
                              cursor={{ fill: 'rgba(235,71,126,0.04)' }}
                              contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, fontSize: 11 }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                              {displayMoodDistribution.map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color || '#eb477e'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Hourly traffic chart */}
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-800 mb-0.5">Tần suất Chat AI theo Giờ</h3>
                    <p className="text-[11px] text-slate-400 mb-4">Phân bổ tin nhắn AI trong ngày (giờ Việt Nam).</p>
                    {overviewQuery.isLoading ? (
                      <div className="h-52 flex items-center justify-center"><Spinner /></div>
                    ) : displayHourlyChatTraffic.length === 0 || chatTotal === 0 ? (
                      <div className="h-52 flex items-center justify-center text-xs text-slate-400">Chưa có dữ liệu tần suất</div>
                    ) : (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={displayHourlyChatTraffic} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.18} />
                                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={2} />
                            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #f1f5f9', borderRadius: 10, fontSize: 11 }} />
                            <Area type="monotone" dataKey="queries" name="Tin nhắn" stroke="#a78bfa" fill="url(#trafficGrad)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* ── TAB 2: PAYOS ── */}
            {activeTab === 'payos' && (
              <div className="space-y-5">

                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Doanh thu PayOS thực tế</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Dữ liệu từ MongoDB · ghi nhận qua webhook</p>
                  </div>
                  <div className="inline-flex items-center rounded-lg bg-white border border-slate-200 p-0.5 shadow-sm">
                    {([
                      { key: 'today', label: 'Hôm nay' },
                      { key: 'week', label: 'Tuần' },
                      { key: 'month', label: 'Tháng' },
                      { key: 'year', label: 'Năm' },
                      { key: 'all', label: 'Tất cả' },
                    ] as const).map((period) => (
                      <button
                        key={period.key}
                        type="button"
                        onClick={() => setPayosPeriod(period.key)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                          payosPeriod === period.key
                            ? 'bg-[#eb477e] text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>

                {overviewQuery.isLoading ? (
                  <div className="h-40 flex items-center justify-center"><Spinner /></div>
                ) : (
                  <>
                    {/* Metric cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tổng doanh thu</p>
                        <p className="text-3xl font-black text-[#eb477e] tracking-tight">
                          {filteredPayosMetrics.totalRevenue.toLocaleString('vi-VN')}
                          <span className="text-sm font-semibold text-slate-400 ml-1.5">VND</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2">Giao dịch trạng thái COMPLETED</p>
                      </div>
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Đơn hàng thành công</p>
                        <p className="text-3xl font-black text-[#a78bfa] tracking-tight">
                          {filteredPayosMetrics.completedCount}
                          <span className="text-sm font-semibold text-slate-400 ml-1.5">đơn</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2">Người dùng thanh toán thành công</p>
                      </div>
                    </div>

                    {/* Donut + Transaction list */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                      {/* Status donut */}
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col">
                        <p className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5">
                          <ChartPieSlice size={13} className="text-[#eb477e]" /> Trạng thái đơn
                        </p>
                        {filteredPayosMetrics.list.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-8">Không có giao dịch</div>
                        ) : (
                          <>
                            <div className="h-40 w-full relative">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={filteredPayosMetrics.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={2}>
                                    {filteredPayosMetrics.statusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                <p className="text-base font-black text-slate-800">{filteredPayosMetrics.list.length}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">ĐƠN</p>
                              </div>
                            </div>
                            <div className="flex gap-2 w-full mt-4 border-t border-slate-100 pt-3">
                              {filteredPayosMetrics.statusData.map((d) => (
                                <div key={d.name} className="text-center flex-1">
                                  <span className="text-[9px] font-bold text-slate-400 block truncate">{d.name}</span>
                                  <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-xs font-extrabold text-slate-700">{d.value}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Transaction list */}
                      <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm xl:col-span-2">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-4">
                          <CreditCard size={13} className="text-[#eb477e]" /> Giao dịch gần đây
                        </p>
                        {filteredPayosMetrics.list.length === 0 ? (
                          <div className="flex items-center justify-center py-12 text-xs text-slate-400">Chưa có giao dịch nào</div>
                        ) : (
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
                            {filteredPayosMetrics.list.map((tx) => (
                              <div
                                key={tx._id}
                                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <p className="text-xs font-semibold text-slate-800 truncate">{tx.userEmail}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    #{tx.orderCode} · {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs font-bold text-[#eb477e]">
                                    +{(tx.amount || 0).toLocaleString('vi-VN')} đ
                                  </span>
                                  <div className="mt-0.5">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                      tx.status === 'completed'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : tx.status === 'pending'
                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                        : 'bg-slate-100 text-slate-500 border-slate-200'
                                    }`}>
                                      {tx.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TAB 3: USERS ── */}
            {activeTab === 'users' && (
              <div className="space-y-5">
                <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm">
                  {/* Card header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap px-6 pt-6 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-[#eb477e] rounded-xl">
                        <Users size={16} weight="bold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Quản trị người dùng</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Tìm kiếm, lọc giới tính, phân quyền quản trị</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold"
                        loading={exportCsvMutation.isPending}
                        onClick={() => exportCsvMutation.mutate()}
                      >
                        <DownloadSimple size={13} weight="bold" className="mr-1.5" />
                        Xuất CSV
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#eb477e] hover:bg-rose-50 rounded-xl text-xs font-bold border border-rose-100"
                        loading={triggerRemindersMutation.isPending}
                        onClick={() => triggerRemindersMutation.mutate()}
                      >
                        <BellRinging size={13} weight="bold" className="mr-1.5" />
                        Gửi nhắc nhở
                      </Button>
                    </div>
                  </div>

                  {/* Search/filter */}
                  <form onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="relative md:col-span-2">
                      <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="Tìm theo tên hoặc email..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="pl-8 bg-white border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl text-xs"
                      />
                    </div>
                    <select
                      value={roleFilter}
                      onChange={(e) => { setPage(1); setRoleFilter(e.target.value as 'all' | 'user' | 'admin'); }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer"
                    >
                      <option value="all">Tất cả vai trò</option>
                      <option value="admin">Quản trị viên</option>
                      <option value="user">Người dùng</option>
                    </select>
                    <div className="flex gap-2">
                      <select
                        value={genderFilter}
                        onChange={(e) => { setPage(1); setGenderFilter(e.target.value as 'all' | 'female' | 'male' | 'other'); }}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Tất cả giới tính</option>
                        <option value="female">Nữ</option>
                        <option value="male">Nam</option>
                        <option value="other">Khác</option>
                      </select>
                      <Button type="submit" size="sm" className="bg-slate-900 text-white rounded-xl font-bold text-xs shrink-0">
                        Lọc
                      </Button>
                    </div>
                  </form>

                  {/* Table */}
                  <div className="px-6 py-4">
                    {usersQuery.isLoading ? (
                      <div className="flex justify-center py-12"><Spinner size="md" /></div>
                    ) : displayUsers.length === 0 ? (
                      <div className="py-12 flex flex-col items-center text-slate-400">
                        <Users size={28} className="mb-2 opacity-40" />
                        <p className="text-xs">Không tìm thấy người dùng nào</p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl border border-slate-100 overflow-hidden">
                          {displayUsers.map((user, idx) => (
                            <div
                              key={user._id}
                              className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-3 hover:bg-slate-50/60 transition-colors ${
                                idx !== displayUsers.length - 1 ? 'border-b border-slate-100' : ''
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  user.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-rose-50 text-[#eb477e]'
                                }`}>
                                  {user.role === 'admin' ? <Crown size={13} weight="bold" /> : <Users size={13} weight="bold" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-slate-800 truncate">{user.name}</p>
                                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase ${
                                      user.role === 'admin'
                                        ? 'bg-amber-50 text-amber-600 border-amber-100'
                                        : 'bg-rose-50 text-[#eb477e] border-rose-100'
                                    }`}>
                                      {user.role}
                                    </span>
                                    <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">
                                      {user.gender === 'female' ? 'Nữ' : user.gender === 'male' ? 'Nam' : 'Khác'}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase ${
                                      user.onboardingCompleted
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : 'bg-slate-100 text-slate-400 border-slate-200'
                                    }`}>
                                      {user.onboardingCompleted ? 'Onboarded' : 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant={user.role === 'admin' ? 'ghost' : 'secondary'}
                                size="sm"
                                className={`rounded-xl text-xs font-bold border shrink-0 ${
                                  user.role === 'admin'
                                    ? 'text-rose-500 border-rose-200 bg-rose-50/30 hover:bg-rose-50'
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                }`}
                                loading={updateRoleMutation.isPending && updateRoleMutation.variables?.userId === user._id}
                                onClick={() => updateRoleMutation.mutate({ userId: user._id, role: user.role === 'admin' ? 'user' : 'admin' })}
                              >
                                {user.role === 'admin' ? 'Hạ quyền' : 'Nâng Admin'}
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between pt-4">
                          <p className="text-xs text-slate-400">
                            Trang {displayPagination?.page ?? 1}/{displayPagination?.totalPages ?? 1} · {displayPagination?.total ?? 0} người dùng
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="border border-slate-200 rounded-xl px-2 py-1.5"
                              disabled={!displayPagination || displayPagination.page <= 1}
                              onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            >
                              <CaretLeft size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="border border-slate-200 rounded-xl px-2 py-1.5"
                              disabled={!displayPagination || displayPagination.page >= displayPagination.totalPages}
                              onClick={() => setPage((p) => p + 1)}
                            >
                              <CaretRight size={13} />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 4: SYSTEM ── */}
            {activeTab === 'system' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

                {/* Left 2/3 */}
                <div className="xl:col-span-2 space-y-5">

                  {/* Service status cards */}
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                        <Pulse size={15} weight="bold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">AI & System Monitor</h3>
                        <p className="text-[11px] text-slate-400">Trạng thái thời gian thực các dịch vụ</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[
                        { Icon: Cpu, title: 'Spring AI Core', sub: 'Model: spring-ai', status: 'Đang hoạt động', dotCls: 'bg-emerald-400', iconBg: 'bg-emerald-50 text-emerald-500' },
                        { Icon: Database, title: 'Chroma Vector DB', sub: 'Kho tài liệu y khoa', status: 'Đang kết nối', dotCls: 'bg-violet-400', iconBg: 'bg-violet-50 text-[#a78bfa]' },
                        { Icon: Database, title: 'MongoDB Atlas', sub: 'Atlas Cluster M0', status: 'Đang kết nối', dotCls: 'bg-sky-400', iconBg: 'bg-sky-50 text-sky-500' },
                      ].map((item) => (
                        <div key={item.title} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-xl ${item.iconBg}`}>
                              <item.Icon size={14} weight="bold" />
                            </div>
                            <span className={`w-2 h-2 rounded-full ${item.dotCls}`} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{item.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
                          </div>
                          <p className="text-[11px] font-semibold text-emerald-600">{item.status}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial simulator */}
                  <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="p-2 bg-violet-50 text-[#a78bfa] rounded-xl">
                        <TrendUp size={15} weight="bold" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">Giả định Tài chính</h3>
                        <p className="text-[11px] text-slate-400">Kéo thanh trượt để ước tính doanh thu dựa trên dữ liệu thật</p>
                      </div>
                    </div>

                    {overviewQuery.isLoading ? (
                      <div className="h-32 flex items-center justify-center"><Spinner /></div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-500">Paid conversion rate</span>
                              <span className="text-[#eb477e] font-bold">{simPaidRate}%</span>
                            </div>
                            <input type="range" min="1" max="100" step="1" value={simPaidRate}
                              onChange={(e) => setSimPaidRate(Number(e.target.value))}
                              className="w-full accent-[#eb477e] h-1.5 rounded-lg cursor-pointer" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-slate-500">ARPU (USD/user/month)</span>
                              <span className="text-[#eb477e] font-bold">${simArpu}</span>
                            </div>
                            <input type="range" min="0.99" max="49.99" step="1" value={simArpu}
                              onChange={(e) => setSimArpu(Number(e.target.value))}
                              className="w-full accent-[#eb477e] h-1.5 rounded-lg cursor-pointer" />
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          {[
                            { label: 'Thành viên Premium', val: `${simMetrics.paidUsers.toLocaleString()} người`, cls: 'text-slate-800' },
                            { label: 'MRR ước tính', val: `$${simMetrics.mrr.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, cls: 'text-emerald-600' },
                            { label: 'AI Cost ước tính', val: `$${simMetrics.aiCost.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, cls: 'text-amber-500' },
                            { label: 'Lợi nhuận gộp', val: `$${simMetrics.grossProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, cls: 'text-slate-800' },
                          ].map((row) => (
                            <div key={row.label} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-slate-500">{row.label}</span>
                              <span className={`font-bold ${row.cls}`}>{row.val}</span>
                            </div>
                          ))}
                          <div className="pt-1">
                            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
                              <span>Gross Margin</span>
                              <span>{simMetrics.grossMargin.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#eb477e] rounded-full transition-all duration-300"
                                style={{ width: `${simMetrics.grossMargin}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 1/3 — Notification campaign */}
                <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-rose-50 text-[#eb477e] rounded-xl">
                      <BellRinging size={15} weight="bold" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Chiến dịch Thông báo</h3>
                      <p className="text-[11px] text-slate-400">Phát tin tới các phân khúc người dùng</p>
                    </div>
                  </div>

                  <form onSubmit={handleSendCampaign} className="flex-1 flex flex-col gap-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Nhóm đối tượng</label>
                      <select
                        value={campaignTarget}
                        onChange={(e) => setCampaignTarget(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Tất cả người dùng</option>
                        <option value="female">Người dùng Nữ</option>
                        <option value="male">Người dùng Nam</option>
                        <option value="premium">Tài khoản Premium</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Tiêu đề</label>
                      <Input
                        placeholder="Tiêu đề thông báo..."
                        value={campaignTitle}
                        onChange={(e) => setCampaignTitle(e.target.value)}
                        className="bg-white border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Nội dung</label>
                      <textarea
                        rows={4}
                        placeholder="Nội dung tin nhắn..."
                        value={campaignBody}
                        onChange={(e) => setCampaignBody(e.target.value)}
                        className="flex-1 min-h-[90px] w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      loading={isSendingCampaign}
                      className="w-full bg-[#eb477e] hover:bg-[#d63d70] text-white font-bold rounded-xl py-2.5 flex items-center justify-center gap-1.5"
                    >
                      <PaperPlaneRight size={13} weight="bold" />
                      Gửi chiến dịch
                    </Button>
                  </form>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                    <span>Admin v2.5</span>
                    <span>Audit logging ✓</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
