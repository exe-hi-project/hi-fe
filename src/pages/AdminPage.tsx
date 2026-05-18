import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../lib/api';

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

const PAGE_SIZE = 10;

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male' | 'other'>('all');
  const [page, setPage] = useState(1);
  const [chartRange, setChartRange] = useState<3 | 6>(6);

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

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'user' | 'admin' }) => {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
      return data;
    },
    onSuccess: () => {
      toast.success('Đã cập nhật vai trò');
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Không thể cập nhật vai trò');
    },
  });

  const displayStats = overviewQuery.data?.overview;
  const displayFinancial = overviewQuery.data?.financialReport;
  const displayMonthlyFinancials = overviewQuery.data?.monthlyFinancials || [];
  const displayRecentUsers = overviewQuery.data?.recentUsers || [];
  const displayUsers = usersQuery.data?.items || [];
  const displayPagination = usersQuery.data?.pagination;

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setQ(searchText.trim());
  };

  const chartData = displayMonthlyFinancials.slice(-chartRange);
  const genderOther = Math.max((displayStats?.usersTotal ?? 0) - (displayStats?.usersFemale ?? 0) - (displayStats?.usersMale ?? 0), 0);
  const genderData = [
    { name: 'Nữ', value: displayStats?.usersFemale ?? 0, color: '#fb7185' },
    { name: 'Nam', value: displayStats?.usersMale ?? 0, color: '#60a5fa' },
    { name: 'Khác', value: genderOther, color: '#a78bfa' },
  ];
  const readRate = (displayStats?.notificationsTotal ?? 0) > 0
    ? (((displayStats?.notificationsTotal ?? 0) - (displayStats?.unreadNotifications ?? 0)) / (displayStats?.notificationsTotal ?? 0)) * 100
    : 0;
  const financeHealthData = [
    { name: 'Gross Margin', value: Math.max(Math.min(displayFinancial?.estimatedGrossMarginPct ?? 0, 100), 0), fill: '#f472b6' },
    { name: 'Paid Rate', value: Math.max(Math.min(displayFinancial?.assumptions.paidUserRate ?? 0, 100), 0), fill: '#818cf8' },
    { name: 'Read Rate', value: Math.max(Math.min(readRate, 100), 0), fill: '#34d399' },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="pointer-events-none absolute -top-10 -left-8 w-44 h-44 rounded-full bg-pink-200/30 blur-3xl" />
      <div className="pointer-events-none absolute top-32 right-0 w-52 h-52 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="rounded-3xl border border-pink-100 bg-gradient-to-r from-rose-50 via-pink-50 to-indigo-50 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-pink-500">Admin Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 mt-1">Trung tâm quản trị Hi App</h1>
            <p className="text-sm text-gray-600 mt-1">Theo dõi tăng trưởng người dùng, vận hành hệ thống và báo cáo tài chính.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Users: {displayStats?.usersTotal ?? 0}</Badge>
            <Badge variant="warning">Admins: {displayStats?.adminsTotal ?? 0}</Badge>
            <Badge variant="success">MRR: ${displayFinancial?.estimatedMrrUsd ?? 0}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {overviewQuery.isLoading ? (
          <Card className="col-span-2 lg:col-span-5 py-8">
            <Spinner size="sm" />
          </Card>
        ) : (
          <>
            {[
              {
                title: 'Tổng người dùng',
                value: displayStats?.usersTotal ?? 0,
                subtitle: `👩 ${displayStats?.usersFemale ?? 0} • 👨 ${displayStats?.usersMale ?? 0}`,
                icon: '👥',
                glow: 'from-pink-100 to-rose-50',
              },
              {
                title: 'Quản trị viên',
                value: displayStats?.adminsTotal ?? 0,
                subtitle: 'Tài khoản quản trị',
                icon: '🛡️',
                glow: 'from-indigo-100 to-purple-50',
              },
              {
                title: 'Dữ liệu sức khỏe',
                value: (displayStats?.cyclesTotal ?? 0) + (displayStats?.symptomsTotal ?? 0),
                subtitle: `${displayStats?.cyclesTotal ?? 0} chu kỳ • ${displayStats?.symptomsTotal ?? 0} triệu chứng`,
                icon: '🌸',
                glow: 'from-emerald-100 to-teal-50',
              },
              {
                title: 'Thông báo',
                value: displayStats?.notificationsTotal ?? 0,
                subtitle: `${displayStats?.unreadNotifications ?? 0} chưa đọc`,
                icon: '🔔',
                glow: 'from-amber-100 to-yellow-50',
              },
              {
                title: 'Tin nhắn AI',
                value: displayStats?.chatMessagesTotal ?? 0,
                subtitle: 'Tổng message hệ thống chat',
                icon: '🤖',
                glow: 'from-cyan-100 to-blue-50',
              },
            ].map((item) => (
              <Card key={item.title} className="relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
                <div className={`absolute inset-x-0 top-0 h-16 bg-gradient-to-r ${item.glow} opacity-70`} />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{item.title}</p>
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-800 mt-2">{item.value}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{item.subtitle}</p>
                </div>
              </Card>
            ))}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card variant="gradient" className="xl:col-span-2">
          <CardHeader className="mb-2">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <CardTitle className="text-base">Báo cáo tài chính (ước tính)</CardTitle>
                <p className="text-xs text-gray-500 mt-1">Doanh thu và chi phí AI được ước lượng từ hành vi sử dụng hiện tại.</p>
              </div>
              <div className="inline-flex items-center rounded-xl bg-white/80 p-1 border border-pink-100">
                {[3, 6].map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => setChartRange(range as 3 | 6)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      chartRange === range
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                        : 'text-gray-500 hover:bg-pink-50'
                    }`}
                  >
                    {range} tháng
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>

          {overviewQuery.isLoading ? (
            <Spinner className="py-8" />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl bg-white/80 border border-pink-100 p-3">
                  <p className="text-xs text-gray-500">MRR</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">${displayFinancial?.estimatedMrrUsd ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-pink-100 p-3">
                  <p className="text-xs text-gray-500">Chi phí AI / tháng</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">${displayFinancial?.estimatedAiCostMonthlyUsd ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-pink-100 p-3">
                  <p className="text-xs text-gray-500">Lợi nhuận gộp</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">${displayFinancial?.estimatedGrossProfitUsd ?? 0}</p>
                </div>
                <div className="rounded-xl bg-white/80 border border-pink-100 p-3">
                  <p className="text-xs text-gray-500">Biên lợi nhuận</p>
                  <p className="text-lg font-bold text-gray-800 mt-1">{displayFinancial?.estimatedGrossMarginPct ?? 0}%</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl border border-pink-100 bg-white/90 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Biểu đồ doanh thu vs chi phí (6 tháng)</p>
                    <span className="text-xs text-gray-500">Đơn vị: USD</span>
                  </div>

                  {chartData.length === 0 ? (
                    <p className="text-xs text-gray-500 py-6 text-center">Chưa có dữ liệu để vẽ biểu đồ</p>
                  ) : (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #fbcfe8', boxShadow: '0 8px 24px rgba(236,72,153,0.12)' }}
                            formatter={(value, name) => [Number(value ?? 0).toFixed(2), String(name)]}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Bar name="Doanh thu" dataKey="revenueUsd" fill="#34d399" radius={[6, 6, 0, 0]} />
                          <Bar name="Chi phí AI" dataKey="aiCostUsd" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-pink-100 bg-white/90 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Biểu đồ lợi nhuận ròng (Net)</p>
                    <span className="text-xs text-gray-500">Đơn vị: USD</span>
                  </div>

                  {chartData.length === 0 ? (
                    <p className="text-xs text-gray-500 py-6 text-center">Chưa có dữ liệu để vẽ biểu đồ</p>
                  ) : (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="netLineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#f472b6" />
                              <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #fbcfe8', boxShadow: '0 8px 24px rgba(168,85,247,0.12)' }}
                            formatter={(value) => [Number(value ?? 0).toFixed(2), 'Net']}
                          />
                          <Line
                            type="monotone"
                            dataKey="netUsd"
                            name="Lợi nhuận ròng"
                            stroke="url(#netLineGrad)"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#ec4899' }}
                            activeDot={{ r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                <div className="rounded-2xl border border-pink-100 bg-white/90 p-4 lg:col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-700">Tăng trưởng Users & Chat</p>
                    <span className="text-xs text-gray-500">Dual metric</span>
                  </div>
                  {chartData.length === 0 ? (
                    <p className="text-xs text-gray-500 py-6 text-center">Chưa có dữ liệu để vẽ biểu đồ</p>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="usersAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.03} />
                            </linearGradient>
                            <linearGradient id="chatAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ borderRadius: 12, border: '1px solid #dbeafe', boxShadow: '0 8px 24px rgba(96,165,250,0.12)' }}
                            formatter={(value, name) => [Number(value ?? 0).toFixed(0), String(name)]}
                          />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Area yAxisId="left" type="monotone" dataKey="newUsers" name="Users mới" stroke="#3b82f6" fill="url(#usersAreaGrad)" strokeWidth={2.5} />
                          <Area yAxisId="right" type="monotone" dataKey="chatMessages" name="Chat messages" stroke="#8b5cf6" fill="url(#chatAreaGrad)" strokeWidth={2.5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-pink-100 bg-white/90 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Cơ cấu người dùng</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={genderData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={72}
                          paddingAngle={2}
                        >
                          {genderData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [Number(value ?? 0).toFixed(0), String(name)]} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-pink-100 bg-white/90 p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">Chỉ số sức khỏe kinh doanh</p>
                  <span className="text-xs text-gray-500">0 - 100%</span>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="22%"
                      outerRadius="95%"
                      barSize={14}
                      data={financeHealthData}
                      startAngle={180}
                      endAngle={0}
                    >
                      <RadialBar background dataKey="value" cornerRadius={10} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, String(name)]} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-pink-100">
                      <th className="py-2 font-semibold">Tháng</th>
                      <th className="py-2 font-semibold">Users mới</th>
                      <th className="py-2 font-semibold">Chat</th>
                      <th className="py-2 font-semibold">Doanh thu ($)</th>
                      <th className="py-2 font-semibold">Chi phí AI ($)</th>
                      <th className="py-2 font-semibold">Net ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayMonthlyFinancials.map((item) => (
                      <tr key={item.month} className="border-b border-pink-50 last:border-none">
                        <td className="py-2 font-medium text-gray-700">{item.month}</td>
                        <td className="py-2 text-gray-600">{item.newUsers}</td>
                        <td className="py-2 text-gray-600">{item.chatMessages}</td>
                        <td className="py-2 text-emerald-600 font-semibold">{item.revenueUsd}</td>
                        <td className="py-2 text-amber-600 font-semibold">{item.aiCostUsd}</td>
                        <td className={`py-2 font-semibold ${item.netUsd >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{item.netUsd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardHeader className="mb-2">
            <CardTitle className="text-base">Giả định tài chính</CardTitle>
          </CardHeader>
          {overviewQuery.isLoading ? (
            <Spinner className="py-8" />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-gray-500">Paid conversion</span><span className="font-semibold text-gray-800">{displayFinancial?.assumptions.paidUserRate ?? 0}%</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">ARPU</span><span className="font-semibold text-gray-800">${displayFinancial?.arpuUsd ?? 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Churn / tháng</span><span className="font-semibold text-gray-800">{displayFinancial?.monthlyChurnRatePct ?? 0}%</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">LTV ước tính</span><span className="font-semibold text-gray-800">${displayFinancial?.estimatedLtvUsd ?? 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Infrastructure</span><span className="font-semibold text-gray-800">${displayFinancial?.infraCostUsd ?? 0}/tháng</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Msg / conversation</span><span className="font-semibold text-gray-800">{displayFinancial?.assumptions.avgMessagesPerConversation ?? 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">Tokens / conversation</span><span className="font-semibold text-gray-800">{displayFinancial?.assumptions.avgTokensPerConversation ?? 0}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-500">AI cost / 1K tokens</span><span className="font-semibold text-gray-800">${displayFinancial?.assumptions.aiCostPer1kTokens ?? 0}</span></div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2">
          <CardHeader className="mb-3">
            <CardTitle className="text-base">Quản lý người dùng</CardTitle>
          </CardHeader>

          <form onSubmit={onSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Tìm theo tên hoặc email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="md:col-span-2"
            />
            <select
              value={roleFilter}
              onChange={(e) => {
                setPage(1);
                setRoleFilter(e.target.value as 'all' | 'user' | 'admin');
              }}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <div className="flex gap-2">
              <select
                value={genderFilter}
                onChange={(e) => {
                  setPage(1);
                  setGenderFilter(e.target.value as 'all' | 'female' | 'male' | 'other');
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
              >
                <option value="all">Tất cả giới tính</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
              </select>
              <Button type="submit" variant="outline">Lọc</Button>
            </div>
          </form>

          {usersQuery.isLoading ? (
            <Spinner className="py-8" />
          ) : displayUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Không có dữ liệu người dùng</p>
          ) : (
            <div className="space-y-3">
              {displayUsers.map((user) => (
                <div key={user._id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-100 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{user.name}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={user.role === 'admin' ? 'warning' : 'info'}>{user.role.toUpperCase()}</Badge>
                      <Badge variant="gray">{user.gender}</Badge>
                      <Badge variant={user.onboardingCompleted ? 'success' : 'gray'}>
                        {user.onboardingCompleted ? 'Đã onboarding' : 'Chưa onboarding'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={user.role === 'admin' ? 'ghost' : 'secondary'}
                      size="sm"
                      disabled={false}
                      loading={updateRoleMutation.isPending && updateRoleMutation.variables?.userId === user._id}
                      onClick={() => updateRoleMutation.mutate({ userId: user._id, role: user.role === 'admin' ? 'user' : 'admin' })}
                    >
                      {user.role === 'admin' ? 'Hạ quyền User' : 'Nâng quyền Admin'}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500">
                  Trang {displayPagination?.page ?? 1}/{displayPagination?.totalPages ?? 1} • {displayPagination?.total ?? 0} người dùng
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!displayPagination || displayPagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!displayPagination || displayPagination.page >= displayPagination.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader className="mb-2">
            <CardTitle className="text-base">Người dùng mới gần đây</CardTitle>
          </CardHeader>
          {overviewQuery.isLoading ? (
            <Spinner className="py-8" />
          ) : displayRecentUsers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Chưa có dữ liệu</p>
          ) : (
            <div className="space-y-2.5">
              {displayRecentUsers.map((user) => (
                <div key={user._id} className="border border-gray-100 rounded-xl p-3">
                  <p className="font-semibold text-sm text-gray-800 truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={user.role === 'admin' ? 'warning' : 'info'} size="sm">{user.role}</Badge>
                    <Badge variant="gray" size="sm">{user.gender}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
