import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '../layout/Navbar';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { usePartnerConnection } from '../../hooks/usePartnerConnection';

type Variant = 'female' | 'male';
type AiResponseStyle = 'FRIENDLY' | 'PLAYFUL' | 'SCIENTIFIC' | 'CONCISE' | 'CARE_PARTNER';

interface NotificationSettings {
  periodUpcomingEnabled: boolean;
  fertilityWindowEnabled: boolean;
  dailyHealthTipsEnabled: boolean;
  partnerPeriodAlertEnabled: boolean;
  partnerMoodUpdatesEnabled: boolean;
  partnerCareTipsEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  reminderDaysBefore: number;
  symptomDailyReminderEnabled: boolean;
  symptomReminderTime: string;
  partnerEndOfDayNudgeEnabled: boolean;
  partnerNudgeTime: string;
  aiResponseStyle: AiResponseStyle;
  dailyQuestionsEnabled: boolean;
}

interface PartnerCyclesResponse {
  partner?: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
    gender?: string;
  } | null;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  periodUpcomingEnabled: true,
  fertilityWindowEnabled: false,
  dailyHealthTipsEnabled: true,
  partnerPeriodAlertEnabled: true,
  partnerMoodUpdatesEnabled: true,
  partnerCareTipsEnabled: false,
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  reminderDaysBefore: 3,
  symptomDailyReminderEnabled: true,
  symptomReminderTime: '20:00',
  partnerEndOfDayNudgeEnabled: true,
  partnerNudgeTime: '21:00',
  aiResponseStyle: 'FRIENDLY',
  dailyQuestionsEnabled: true,
};

const aiStyles: Array<{ value: AiResponseStyle; label: string; desc: string }> = [
  { value: 'FRIENDLY', label: 'Ấm áp', desc: 'Gần gũi, dịu dàng, dễ nghe.' },
  { value: 'PLAYFUL', label: 'Nhí nhảnh', desc: 'Vui nhẹ, có năng lượng hơn.' },
  { value: 'SCIENTIFIC', label: 'Khoa học', desc: 'Rõ nguồn logic, ít cảm tính.' },
  { value: 'CONCISE', label: 'Ngắn gọn', desc: 'Đi thẳng vào ý chính.' },
  { value: 'CARE_PARTNER', label: 'Chăm Người ấy', desc: 'Gợi ý quan tâm tinh tế.' },
];

function Toggle({ checked, onChange, accent }: { checked: boolean; onChange: (value: boolean) => void; accent: Variant }) {
  const gradient = accent === 'male'
    ? 'peer-checked:[background:linear-gradient(135deg,#60a5fa,#6366f1,#a78bfa)]'
    : 'peer-checked:[background:linear-gradient(135deg,#60a5fa,#c084fc,#f472b6)]';

  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={`h-8 w-14 rounded-full bg-slate-200 shadow-inner transition-all after:absolute after:left-1 after:top-1 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:after:translate-x-6 ${gradient}`} />
    </label>
  );
}

function SettingRow({
  title,
  desc,
  checked,
  onChange,
  accent,
  hot,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  accent: Variant;
  hot?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-3xl border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-black text-slate-900">{title}</p>
          {hot && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">HOT</span>}
        </div>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} accent={accent} />
    </div>
  );
}

function ChannelButton({
  label,
  icon,
  active,
  disabled,
  onClick,
  accent,
}: {
  label: string;
  icon: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  accent: Variant;
}) {
  const activeClass = accent === 'male'
    ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-blue-100'
    : 'border-pink-200 bg-pink-50 text-pink-600 shadow-pink-100';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${
        active ? activeClass : 'border-slate-100 bg-white text-slate-500'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
      {label}
      {disabled && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Sắp hỗ trợ</span>}
    </button>
  );
}

export default function NotificationSettingsPanel({ variant }: { variant: Variant }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [partnerCode, setPartnerCode] = useState('');
  const { connectPartner, disconnectPartner } = usePartnerConnection();

  const isMale = variant === 'male';
  const dashboardPath = isMale ? '/male-dashboard' : '/female-dashboard';
  const pageGradient = isMale ? 'from-sky-50 via-white to-blue-50' : 'from-pink-50 via-white to-sky-50';
  const accentText = isMale ? 'text-blue-600' : 'text-pink-500';
  const saveGradient = isMale ? 'from-sky-400 via-blue-500 to-violet-500' : 'from-sky-400 via-violet-500 to-pink-500';
  const hasPartner = Boolean(user?.partnerId);

  const settingsQuery = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => api.get('/users/notification-settings').then(({ data }) => data.settings as Partial<NotificationSettings>),
  });

  const partnerQuery = useQuery({
    queryKey: ['partner-cycles', 'settings'],
    queryFn: () => api.get('/users/partner-cycles').then(({ data }) => data as PartnerCyclesResponse),
    enabled: hasPartner,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings({ ...DEFAULT_SETTINGS, ...settingsQuery.data, smsEnabled: false });
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () => api.put('/users/notification-settings', { ...settings, smsEnabled: false }),
    onSuccess: ({ data }) => {
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings, smsEnabled: false });
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
      toast.success('Đã lưu cài đặt thông báo & AI');
    },
    onError: () => toast.error('Lưu cài đặt thất bại, thử lại sau nhé'),
  });

  const rows = useMemo(() => [
    {
      key: 'periodUpcomingEnabled' as const,
      title: 'Dự đoán kỳ sắp tới',
      desc: 'Nhắc trước kỳ dự kiến theo số ngày bạn chọn.',
    },
    {
      key: 'fertilityWindowEnabled' as const,
      title: 'Cửa sổ thụ thai & rụng trứng',
      desc: 'Thông báo những ngày khả năng thụ thai ước tính cao.',
    },
    {
      key: 'dailyHealthTipsEnabled' as const,
      title: 'Lời khuyên sức khỏe hằng ngày',
      desc: 'Một lời hỏi thăm nhỏ mỗi sáng để chăm sóc bản thân đều hơn.',
    },
    {
      key: 'symptomDailyReminderEnabled' as const,
      title: 'Nhắc ghi triệu chứng trong kỳ',
      desc: 'Gửi web/email theo giờ bạn chọn nếu hôm nay chưa ghi nhật ký.',
      hot: true,
    },
    {
      key: 'dailyQuestionsEnabled' as const,
      title: 'Câu hỏi hằng ngày của chúng mình',
      desc: 'Nhận một câu hỏi chung mỗi ngày và mở câu trả lời khi cả hai đã hoàn thành.',
      hot: true,
    },
    {
      key: 'partnerPeriodAlertEnabled' as const,
      title: 'Báo tin kỳ cho Người ấy',
      desc: 'Cho phép Hi nhắc Người ấy khi bạn sắp tới kỳ, nếu hai bạn đã kết nối.',
    },
    {
      key: 'partnerMoodUpdatesEnabled' as const,
      title: 'Cập nhật tâm trạng',
      desc: 'Gửi cảm xúc nhanh đã chọn sang Người ấy bằng thông báo trong app.',
    },
    {
      key: 'partnerCareTipsEnabled' as const,
      title: 'Gợi ý chăm sóc',
      desc: 'Gợi ý những hành động nhẹ nhàng để Người ấy biết cách quan tâm đúng lúc.',
    },
    {
      key: 'partnerEndOfDayNudgeEnabled' as const,
      title: 'Nhắc cuối ngày cho cả hai',
      desc: 'Nếu bạn nữ gần/tới kỳ mà chưa cập nhật, Hi nhắc cả hai bằng lời nhẹ nhàng.',
    },
  ], []);

  const update = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const copyCode = async () => {
    if (!user?.partnerCode) return;
    await navigator.clipboard.writeText(user.partnerCode);
    toast.success('Đã sao chép mã mời');
  };

  const submitPartnerCode = () => {
    if (!partnerCode.trim()) {
      toast.error('Nhập mã mời của Người ấy trước nhé');
      return;
    }
    connectPartner.mutate(partnerCode);
  };

  const partnerName = partnerQuery.data?.partner?.name || 'Người ấy';

  return (
    <div className={`min-h-screen bg-gradient-to-br ${pageGradient} font-sans text-slate-900`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -left-28 top-10 h-96 w-96 rounded-full blur-3xl ${isMale ? 'bg-sky-200/50' : 'bg-pink-200/50'}`} />
        <div className={`absolute -right-20 bottom-20 h-[30rem] w-[30rem] rounded-full blur-3xl ${isMale ? 'bg-blue-200/40' : 'bg-violet-200/40'}`} />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
          <nav className="mb-7 flex items-center gap-2 text-sm font-bold">
            <Link to={dashboardPath} className="text-slate-400 transition hover:text-slate-900">Tổng quan</Link>
            <span className="text-slate-300">/</span>
            <span className={accentText}>Thông báo & cặp đôi</span>
          </nav>

          <section className="mb-8 overflow-hidden rounded-[2.25rem] border border-white/70 bg-white/85 shadow-sm backdrop-blur">
            <div className="grid gap-8 p-7 md:grid-cols-[0.95fr_1.05fr] md:p-10">
              <div className="flex items-center justify-center">
                <div className="relative flex items-center gap-4">
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-blue-200 to-violet-300 text-white shadow-xl ring-4 ring-white">
                    <span className="material-symbols-outlined text-5xl">person</span>
                  </div>
                  <div className="h-1 w-16 rounded-full bg-gradient-to-r from-blue-200 to-pink-200" />
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-pink-200 to-violet-300 text-white shadow-xl ring-4 ring-white">
                    <span className="material-symbols-outlined text-5xl">person</span>
                  </div>
                  <div className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white bg-white text-pink-500 shadow-lg">
                    <span className="material-symbols-outlined">favorite</span>
                  </div>
                </div>
              </div>

              <div>
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${hasPartner ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  <span className={`h-2 w-2 rounded-full ${hasPartner ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  {hasPartner ? 'Đã kết nối' : 'Chưa kết nối'}
                </span>
                <h1 className="hi-page-title mt-4 text-3xl md:text-5xl">
                  {hasPartner ? `Đồng hành cùng ${partnerName}` : 'Kết nối với Người ấy'}
                </h1>
                <p className="mt-3 max-w-xl text-base font-semibold leading-relaxed text-slate-500">
                  Kết nối để chia sẻ thông báo chu kỳ, cảm xúc nhanh và những gợi ý chăm sóc đúng lúc. Hi chỉ chia sẻ dữ liệu bạn cho phép.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button type="button" className="hi-btn-primary rounded-2xl px-5 py-3 text-sm font-black">
                    <span className="material-symbols-outlined mr-2 align-middle text-lg">send</span>
                    Mời Người ấy
                  </button>
                  <button type="button" onClick={() => toast('QR sẽ được mở ở bản kế tiếp nhé')} className="hi-btn-secondary rounded-2xl px-5 py-3 text-sm font-black">
                    <span className="material-symbols-outlined mr-2 align-middle text-lg">qr_code_scanner</span>
                    Quét mã QR
                  </button>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Mã mời của bạn</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-3xl font-black tracking-[0.25em] text-slate-900">{user?.partnerCode || '---'}</p>
                    <button type="button" onClick={copyCode} className="hi-btn-secondary rounded-2xl px-4 py-2 text-xs font-black">
                      Sao chép
                    </button>
                  </div>
                  {!hasPartner && (
                    <div className="mt-4 flex gap-2">
                      <input
                        value={partnerCode}
                        onChange={(event) => setPartnerCode(event.target.value.toUpperCase())}
                        placeholder="Nhập mã Người ấy"
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-blue-300"
                      />
                      <button type="button" onClick={submitPartnerCode} disabled={connectPartner.isPending} className="hi-btn-primary rounded-2xl px-4 py-3 text-sm font-black">
                        Kết nối
                      </button>
                    </div>
                  )}
                  {hasPartner && (
                    <button type="button" onClick={() => disconnectPartner.mutate()} disabled={disconnectPartner.isPending} className="hi-btn-danger mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black">
                      Ngắt kết nối
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="space-y-4">
              {rows.map((row) => (
                <SettingRow
                  key={row.key}
                  title={row.title}
                  desc={row.desc}
                  checked={Boolean(settings[row.key])}
                  onChange={(value) => update(row.key, value)}
                  accent={variant}
                  hot={row.hot}
                />
              ))}
            </section>

            <aside className="space-y-5">
              <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-black text-slate-900">Kênh thông báo</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">SMS chưa mở trong MVP nên Hi khóa lựa chọn này.</p>
                <div className="mt-5 grid gap-3">
                  <ChannelButton label="Push App" icon="notifications_active" active={settings.pushEnabled} onClick={() => update('pushEnabled', !settings.pushEnabled)} accent={variant} />
                  <ChannelButton label="Email" icon="mail" active={settings.emailEnabled} onClick={() => update('emailEnabled', !settings.emailEnabled)} accent={variant} />
                  <ChannelButton label="SMS" icon="sms" active={false} disabled onClick={() => undefined} accent={variant} />
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-black text-slate-900">Giờ nhắc</h2>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Nhắc trước kỳ</span>
                    <select
                      value={settings.reminderDaysBefore}
                      onChange={(event) => update('reminderDaysBefore', Number(event.target.value))}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                    >
                      {[1, 2, 3, 5, 7].map((day) => <option key={day} value={day}>{day} ngày trước</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Giờ nhắc ghi triệu chứng</span>
                    <input type="time" value={settings.symptomReminderTime} onChange={(event) => update('symptomReminderTime', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-pink-300" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Giờ nhắc cuối ngày cho cặp đôi</span>
                    <input type="time" value={settings.partnerNudgeTime} onChange={(event) => update('partnerNudgeTime', event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none focus:border-pink-300" />
                  </label>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-black text-slate-900">Phong cách Hi AI</h2>
                <div className="mt-4 grid gap-2">
                  {aiStyles.map((style) => {
                    const active = settings.aiResponseStyle === style.value;
                    return (
                      <button
                        type="button"
                        key={style.value}
                        onClick={() => update('aiResponseStyle', style.value)}
                        className={`rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
                          active
                            ? `border-transparent bg-gradient-to-r ${saveGradient} text-white shadow-lg`
                            : 'border-slate-100 bg-white text-slate-600'
                        }`}
                      >
                        <p className="text-sm font-black">{style.label}</p>
                        <p className={`mt-1 text-xs font-semibold ${active ? 'text-white/80' : 'text-slate-400'}`}>{style.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || settingsQuery.isLoading}
                className="hi-btn-primary w-full rounded-3xl px-6 py-4 text-base font-black disabled:cursor-wait"
              >
                {saveMutation.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
              </button>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
