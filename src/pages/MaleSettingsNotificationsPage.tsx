import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import { usePartnerConnection } from '../hooks/usePartnerConnection';
import api from '../lib/api';

/* ── Reusable toggle ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-[26px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:[background:linear-gradient(135deg,#60a5fa,#6366f1)] shadow-inner after:shadow-sm" />
    </label>
  );
}

/* ── Channel pill button ── */
function ChannelBtn({
  icon, label, active, activeClass, onClick,
}: { icon: string; label: string; active: boolean; activeClass: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-3 rounded-2xl border-2 font-bold transition-all flex items-center gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 ${
        active ? activeClass : 'border-gray-100 bg-white text-slate-400 hover:border-blue-200'
      }`}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
      {label}
      {active && <div className="absolute -top-1.5 -right-1.5 size-3 rounded-full ring-2 ring-white bg-blue-400" />}
    </button>
  );
}

/* ── Page ── */
export default function MaleSettingsNotificationsPage() {
  const { user, setUser } = useAuthStore();
  const { connectPartner, disconnectPartner } = usePartnerConnection();

  const [notify, setNotify] = useState({ periodAlert: user?.periodReminder ?? true, ovulation: true, phaseTips: false });
  const [share,  setShare]  = useState({ workoutSchedule: user?.partnerNotifications ?? true, moodStress: false, careRequests: true });
  const [ch,     setCh]     = useState({ push: true, email: false, sms: false });
  const [partnerCode, setPartnerCode] = useState('');

  const saveSettingsMutation = useMutation({
    mutationFn: () => api.put('/users/profile', {
      periodReminder: notify.periodAlert,
      partnerNotifications: share.workoutSchedule,
    }),
    onSuccess: () => toast.success('Đã lưu cài đặt thông báo'),
    onError: () => toast.error('Lưu thất bại, thử lại sau'),
  });

  const firstName = user?.name?.split(' ').pop() ?? 'bạn';
  const hasPartner = !!user?.partnerId;

  // Fetch partner name when connected
  const { data: partnerQueryData } = useQuery({
    queryKey: ['partner-cycles'],
    queryFn: () => api.get('/users/partner-cycles').then(r => r.data as { partner?: { name?: string } }),
    enabled: hasPartner,
    staleTime: 60_000,
  });
  const partnerDisplayName = partnerQueryData?.partner?.name ?? 'Đã kết nối';

  // Poll profile every 5 s when not connected — picks up partner connection initiated by the other side
  useQuery({
    queryKey: ['profile-connection-poll'],
    queryFn: async () => {
      const { data } = await api.get('/users/profile');
      const profileUser = data.user;
      if (profileUser?.partnerId && !user?.partnerId) {
        setUser(profileUser);
        toast.success('Bạn đã được kết nối bởi người ấy! 💑');
      }
      return profileUser;
    },
    enabled: !hasPartner,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });

  const inviteCode = user?.partnerCode || '------';
  const isConnecting = connectPartner.isPending;
  const isDisconnecting = disconnectPartner.isPending;

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partnerCode.trim()) {
      toast.error('Vui lòng nhập mã kết nối');
      return;
    }
    connectPartner.mutate(partnerCode, {
      onSuccess: () => setPartnerCode(''),
    });
  };

  const copyInviteCode = async () => {
    if (!user?.partnerCode) {
      toast.error('Chưa có mã mời');
      return;
    }
    try {
      await navigator.clipboard.writeText(user.partnerCode);
      toast.success('Đã sao chép mã mời');
    } catch {
      toast.error('Không thể sao chép mã mời');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f7ff] overflow-x-hidden relative font-sans">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-blue-200/40   w-[500px] h-[500px] rounded-full top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-indigo-100/50  w-[400px] h-[400px] rounded-full bottom-[-80px] right-[-80px]" />
        <div className="lp-blob bg-cyan-100/30    w-[350px] h-[350px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-6 pb-24 px-4 md:px-8 max-w-[1024px] mx-auto w-full">

          {/* Breadcrumb */}
          <nav className="flex flex-wrap gap-2 text-sm mb-8">
            <Link to="/male-dashboard" className="text-slate-400 hover:text-blue-500 font-medium transition-colors">Tổng quan</Link>
            <span className="text-slate-300 font-bold">/</span>
            <span className="text-blue-500 font-bold">Thông báo &amp; Cặp đôi</span>
          </nav>

          {/* Page title */}
          <div className="mb-10 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 mb-3">
              Cài đặt{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                thông báo &amp; cặp đôi
              </span>
            </h1>
            <p className="text-slate-500 text-base md:text-lg font-medium">
              Theo dõi chu kỳ người ấy và quản lý thông báo để chăm sóc cô ấy đúng lúc.
            </p>
          </div>

          {/* ── Connection hero card ── */}
          <div className="w-full bg-white/90 backdrop-blur-sm rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-white/60 relative overflow-hidden mb-8">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full blur-3xl opacity-40 animate-pulse pointer-events-none" />
            <div className="absolute top-10 left-10 w-32 h-32 bg-cyan-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">

              {/* Avatar pair */}
              <div className="flex items-center justify-center w-full lg:w-auto py-2">
                <div className="relative flex flex-col items-center gap-3 z-10">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-[6px] border-white shadow-xl bg-gradient-to-br from-blue-200 to-indigo-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-5xl">person</span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full shadow-sm border border-blue-100">
                    {firstName}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center relative w-20 md:w-32 -mx-4 z-0">
                  <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-blue-300 to-transparent -translate-y-1/2 opacity-50" />
                  <div className="z-10 w-12 h-12 md:w-14 md:h-14 bg-white rounded-full border-4 border-blue-50 flex items-center justify-center shadow-[0_0_20px_rgba(96,165,250,0.35)]">
                    <span className="material-symbols-outlined text-2xl md:text-3xl text-[#3b82f6]">favorite</span>
                  </div>
                </div>

                <div className="relative flex flex-col items-center gap-3 opacity-90 hover:opacity-100 transition-all cursor-pointer group z-10">
                  <div className={`w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-all ${
                    hasPartner
                      ? 'border-[6px] border-white shadow-xl bg-gradient-to-br from-blue-200 to-indigo-300'
                      : 'border-[4px] border-dashed border-blue-300 bg-gradient-to-br from-white to-blue-50 group-hover:border-blue-400 group-hover:scale-105'
                  }`}>
                    <span className={`material-symbols-outlined text-4xl md:text-5xl transition-colors ${
                      hasPartner ? 'text-white' : 'text-blue-300 group-hover:text-blue-500'
                    }`}>
                      {hasPartner ? 'person' : 'person_add'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                    {hasPartner ? partnerDisplayName : 'Người ấy'}
                  </span>
                </div>
              </div>

              {/* Text + CTA */}
              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
                <div>
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider mb-3 shadow-sm border ${
                    hasPartner
                      ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
                      : 'bg-blue-100/80 text-blue-700 border-blue-200'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${hasPartner ? 'bg-emerald-400' : 'bg-blue-400 animate-ping'}`} />
                    {hasPartner ? 'Đã kết nối' : 'Chưa kết nối'}
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Đồng hành cùng người ấy</h3>
                  <p className="text-slate-500 mt-3 max-w-lg text-lg leading-relaxed">
                    Kết nối để nhận thông báo chu kỳ, tâm trạng và biết cách chăm sóc cô ấy mỗi ngày.{' '}
                    <span className="text-blue-600 font-semibold">100% Bảo mật.</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <button
                    type="button"
                    onClick={copyInviteCode}
                    className="group flex items-center gap-3 px-8 py-4 rounded-full font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all border border-white/20"
                    style={{ background: 'linear-gradient(135deg,#60a5fa,#6366f1)' }}
                  >
                    <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">send</span>
                    Mời người ấy
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('Nhập mã người ấy ở ô bên dưới để kết nối')}
                    className="group flex items-center gap-3 bg-white border-2 border-blue-100 hover:border-blue-300 hover:bg-blue-50 text-slate-700 px-8 py-4 rounded-full font-bold transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xl text-slate-400 group-hover:text-blue-500 transition-colors">qr_code_scanner</span>
                    Quét mã QR
                  </button>
                </div>
                <div className="w-full max-w-xl bg-white/80 rounded-3xl border border-blue-100 p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Mã mời của bạn</p>
                      <p className="text-2xl font-black tracking-[0.2em] text-slate-900">{inviteCode}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyInviteCode}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      Sao chép
                    </button>
                  </div>

                  {!hasPartner ? (
                    <form onSubmit={handleConnect} className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={partnerCode}
                        onChange={(event) => setPartnerCode(event.target.value)}
                        className="min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                        placeholder="NHẬP MÃ NGƯỜI ẤY"
                        disabled={isConnecting}
                      />
                      <button
                        type="submit"
                        disabled={isConnecting}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#60a5fa,#6366f1)' }}
                      >
                        <span className="material-symbols-outlined text-[18px]">{isConnecting ? 'progress_activity' : 'favorite'}</span>
                        {isConnecting ? 'Đang kết nối...' : 'Kết nối'}
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => disconnectPartner.mutate()}
                      disabled={isDisconnecting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="material-symbols-outlined text-[18px]">link_off</span>
                      {isDisconnecting ? 'Đang ngắt kết nối...' : 'Ngắt kết nối'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Settings grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            {/* Notifications about partner */}
            <div className="flex flex-col gap-5">
              <h3 className="text-xl font-bold text-slate-800 px-1 flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-xl text-pink-500">
                  <span className="material-symbols-outlined">favorite</span>
                </div>
                Thông báo về người ấy
              </h3>
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-white/80 overflow-hidden">
                {([
                  { key: 'periodAlert', label: 'Kỳ kinh sắp tới của cô ấy',    desc: 'Nhận thông báo 2 ngày trước — chuẩn bị chăm sóc cô ấy.' },
                  { key: 'ovulation',   label: 'Cửa sổ rụng trứng',            desc: 'Biết những ngày cô ấy ở giai đoạn rụng trứng.' },
                  { key: 'phaseTips',   label: 'Tips chăm sóc theo giai đoạn', desc: 'Gợi ý hành động phù hợp với chu kỳ của cô ấy.' },
                ] as const).map(({ key, label, desc }, i, arr) => (
                  <div
                    key={key}
                    className={`p-6 flex items-center justify-between hover:bg-pink-50/40 transition-colors group ${i < arr.length - 1 ? 'border-b border-pink-50' : ''}`}
                  >
                    <div className="flex-1 pr-4">
                      <p className="text-base font-bold text-slate-800 group-hover:text-pink-500 transition-colors">{label}</p>
                      <p className="text-sm text-slate-400 mt-1 font-medium">{desc}</p>
                    </div>
                    <Toggle checked={notify[key]} onChange={(v) => setNotify((p) => ({ ...p, [key]: v }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Sharing with partner */}
            <div className="flex flex-col gap-5">
              <h3 className="text-xl font-bold text-slate-800 px-1 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl text-blue-600">
                  <span className="material-symbols-outlined">share</span>
                </div>
                Chia sẻ với người ấy
              </h3>
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-white/80 overflow-hidden">
                <div className="p-6 flex items-center justify-between border-b border-blue-50 hover:bg-blue-50/40 transition-colors group">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors">Lịch tập luyện của bạn</p>
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-extrabold uppercase tracking-wide">Mới</span>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Để cô ấy biết khi nào bạn tập gym hay chạy bộ.</p>
                  </div>
                  <Toggle checked={share.workoutSchedule} onChange={(v) => setShare((p) => ({ ...p, workoutSchedule: v }))} />
                </div>

                <div className="p-6 flex items-center justify-between border-b border-blue-50 hover:bg-blue-50/40 transition-colors group">
                  <div className="flex-1 pr-4">
                    <p className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors mb-1">Tâm trạng &amp; stress</p>
                    <p className="text-sm text-slate-400 font-medium">Chia sẻ mức căng thẳng hàng ngày với người ấy.</p>
                  </div>
                  <Toggle checked={share.moodStress} onChange={(v) => setShare((p) => ({ ...p, moodStress: v }))} />
                </div>

                <div className="p-6 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/50 border-l-[3px] border-l-blue-400 hover:from-blue-50 transition-colors group">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-blue-500 text-lg">volunteer_activism</span>
                      <p className="text-base font-bold text-slate-800">Nhận gợi ý chăm sóc</p>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Hi AI gửi tips "hôm nay nên làm gì cho cô ấy" dựa theo chu kỳ.</p>
                  </div>
                  <Toggle checked={share.careRequests} onChange={(v) => setShare((p) => ({ ...p, careRequests: v }))} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Notification channels ── */}
          <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-8 shadow-sm border border-white/80 flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex-shrink-0">
                <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-800">Kênh thông báo</h4>
                <p className="text-slate-400 text-sm mt-1 font-medium">Chọn nơi bạn muốn nhận các cập nhật về người ấy.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto justify-center md:justify-end">
              <ChannelBtn icon="smartphone" label="Push App" active={ch.push}
                activeClass="border-blue-400 bg-blue-50 text-blue-600"
                onClick={() => setCh((p) => ({ ...p, push: !p.push }))} />
              <ChannelBtn icon="email" label="Email" active={ch.email}
                activeClass="border-indigo-400 bg-indigo-50 text-indigo-700"
                onClick={() => setCh((p) => ({ ...p, email: !p.email }))} />
              <ChannelBtn icon="sms" label="SMS" active={ch.sms}
                activeClass="border-cyan-400 bg-cyan-50 text-cyan-600"
                onClick={() => setCh((p) => ({ ...p, sms: !p.sms }))} />
            </div>
          </div>

          {/* ── Save ── */}
          <div className="flex justify-end">
            <button
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2 px-12 py-4 rounded-full font-bold text-base text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}
            >
              <span className="material-symbols-outlined">{saveSettingsMutation.isPending ? 'progress_activity' : 'check_circle'}</span>
              {saveSettingsMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}
