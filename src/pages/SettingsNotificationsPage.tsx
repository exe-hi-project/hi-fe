import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { useAuthStore } from '../store/authStore';

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
      <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-100 rounded-full peer peer-checked:after:translate-x-[26px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:[background:linear-gradient(135deg,#ff8fab,#e9638f)] shadow-inner after:shadow-sm" />
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
        active ? activeClass : 'border-gray-100 bg-white text-slate-400 hover:border-pink-200'
      }`}
    >
      <span className="material-symbols-outlined text-2xl">{icon}</span>
      {label}
      {active && <div className="absolute -top-1.5 -right-1.5 size-3 rounded-full ring-2 ring-white bg-pink-400" />}
    </button>
  );
}

/* ── Page ── */
export default function SettingsNotificationsPage() {
  const { user } = useAuthStore();

  const [notify, setNotify] = useState({ period: true, fertility: false, dailyTips: true });
  const [share,  setShare]  = useState({ periodAlert: true, mood: true, careTips: false });
  const [ch,     setCh]     = useState({ push: true, email: true, sms: false });

  const firstName = user?.name?.split(' ').pop() ?? 'bạn';

  return (
    <div className="min-h-screen bg-[#fff5f7] overflow-x-hidden relative font-sans">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-pink-200/40  w-[500px] h-[500px] rounded-full top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-yellow-100/50 w-[400px] h-[400px] rounded-full bottom-[-80px] right-[-80px]" />
        <div className="lp-blob bg-purple-100/30 w-[350px] h-[350px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-6 pb-24 px-4 md:px-8 max-w-[1024px] mx-auto w-full">

          {/* Breadcrumb */}
          <nav className="flex flex-wrap gap-2 text-sm mb-8">
            <Link to="/female-dashboard" className="text-slate-400 hover:text-pink-500 font-medium transition-colors">Tổng quan</Link>
            <span className="text-slate-300 font-bold">/</span>
            <span className="text-pink-500 font-bold">Thông báo &amp; Cặp đôi</span>
          </nav>

          {/* Page title */}
          <div className="mb-10 max-w-2xl">
            <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-slate-900 mb-3">
              Cài đặt{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #e9638f, #f9a8c9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                thông báo &amp; cặp đôi
              </span>
            </h1>
            <p className="text-slate-500 text-base md:text-lg font-medium">
              Quản lý cách bạn nhận thông báo và kết nối với người ấy để cùng thấu hiểu.
            </p>
          </div>

          {/* ── Connection hero card ── */}
          <div className="w-full bg-white/90 backdrop-blur-sm rounded-[2.5rem] p-8 md:p-12 shadow-sm border border-white/60 relative overflow-hidden mb-8">
            {/* bg glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-40 animate-pulse pointer-events-none" />
            <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-16">

              {/* Avatar pair */}
              <div className="flex items-center justify-center w-full lg:w-auto py-2">
                {/* Your avatar */}
                <div className="relative flex flex-col items-center gap-3 z-10">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-[6px] border-white shadow-xl bg-gradient-to-br from-pink-200 to-purple-300 flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-5xl">person</span>
                  </div>
                  <span className="text-xs font-bold text-pink-600 bg-pink-50 px-4 py-1.5 rounded-full shadow-sm border border-pink-100">
                    {firstName}
                  </span>
                </div>

                {/* Heart connector */}
                <div className="flex flex-col items-center justify-center relative w-20 md:w-32 -mx-4 z-0">
                  <div className="absolute top-1/2 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-pink-300 to-transparent -translate-y-1/2 opacity-50" />
                  <div className="z-10 w-12 h-12 md:w-14 md:h-14 bg-white rounded-full border-4 border-pink-50 flex items-center justify-center shadow-[0_0_20px_rgba(255,126,182,0.35)]">
                    <span className="material-symbols-outlined text-2xl md:text-3xl text-[#ff4d7e]">favorite</span>
                  </div>
                </div>

                {/* Partner placeholder */}
                <div className="relative flex flex-col items-center gap-3 opacity-80 hover:opacity-100 transition-all cursor-pointer group z-10">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-[4px] border-dashed border-pink-300 flex items-center justify-center bg-gradient-to-br from-white to-pink-50 group-hover:border-pink-400 group-hover:scale-105 transition-all">
                    <span className="material-symbols-outlined text-4xl md:text-5xl text-pink-300 group-hover:text-pink-500 transition-colors">person_add</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 group-hover:text-pink-500 transition-colors">Người ấy</span>
                </div>
              </div>

              {/* Text + CTA */}
              <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-100/80 text-yellow-700 text-xs font-extrabold uppercase tracking-wider mb-3 shadow-sm border border-yellow-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping inline-block" />
                    Chưa kết nối
                  </div>
                  <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Kết nối yêu thương</h3>
                  <p className="text-slate-500 mt-3 max-w-lg text-lg leading-relaxed">
                    Chia sẻ chu kỳ và cảm xúc của bạn để người ấy thấu hiểu và chăm sóc bạn tốt hơn.{' '}
                    <span className="text-pink-600 font-semibold">100% Bảo mật.</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <button
                    className="group flex items-center gap-3 px-8 py-4 rounded-full font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-95 transition-all border border-white/20"
                    style={{ background: 'linear-gradient(135deg, #ff9a9e, #f9a8c9)' }}
                  >
                    <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">send</span>
                    Mời đối phương
                  </button>
                  <button className="group flex items-center gap-3 bg-white border-2 border-pink-100 hover:border-pink-300 hover:bg-pink-50 text-slate-700 px-8 py-4 rounded-full font-bold transition-all active:scale-95">
                    <span className="material-symbols-outlined text-xl text-slate-400 group-hover:text-pink-500 transition-colors">qr_code_scanner</span>
                    Quét mã QR
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Settings grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            {/* Personal AI notifications */}
            <div className="flex flex-col gap-5">
              <h3 className="text-xl font-bold text-slate-800 px-1 flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-xl text-pink-600">
                  <span className="material-symbols-outlined">notifications_active</span>
                </div>
                Thông báo AI cá nhân
              </h3>
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-white/80 overflow-hidden">
                {([
                  { key: 'period',    label: 'Dự đoán kỳ kinh sắp tới',         desc: 'Nhận thông báo 2 ngày trước khi bắt đầu.' },
                  { key: 'fertility', label: 'Cửa sổ thụ thai & Rụng trứng',     desc: 'Thông báo những ngày khả năng thụ thai cao.' },
                  { key: 'dailyTips', label: 'Lời khuyên sức khỏe hàng ngày',    desc: 'Tips về dinh dưỡng và vận động theo chu kỳ.' },
                ] as const).map(({ key, label, desc }, i, arr) => (
                  <div
                    key={key}
                    className={`p-6 flex items-center justify-between hover:bg-pink-50/40 transition-colors group ${i < arr.length - 1 ? 'border-b border-pink-50' : ''}`}
                  >
                    <div className="flex-1 pr-4">
                      <p className="text-base font-bold text-slate-800 group-hover:text-pink-600 transition-colors">{label}</p>
                      <p className="text-sm text-slate-400 mt-1 font-medium">{desc}</p>
                    </div>
                    <Toggle checked={notify[key]} onChange={(v) => setNotify((p) => ({ ...p, [key]: v }))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Partner sharing */}
            <div className="flex flex-col gap-5">
              <h3 className="text-xl font-bold text-slate-800 px-1 flex items-center gap-3">
                <div className="p-2 bg-pink-100 rounded-xl text-pink-600">
                  <span className="material-symbols-outlined">favorite</span>
                </div>
                Chia sẻ với đối phương
              </h3>
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-sm border border-white/80 overflow-hidden">
                {/* Dâu rụng */}
                <div className="p-6 flex items-center justify-between border-b border-pink-50 hover:bg-pink-50/40 transition-colors group">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold text-slate-800 group-hover:text-pink-600 transition-colors">Báo tin "Dâu rụng"</p>
                      <span className="px-2.5 py-0.5 rounded-lg bg-yellow-300 text-yellow-800 text-[10px] font-extrabold uppercase tracking-wide">Hot</span>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Tự động báo cho người ấy khi kỳ kinh bắt đầu.</p>
                  </div>
                  <Toggle checked={share.periodAlert} onChange={(v) => setShare((p) => ({ ...p, periodAlert: v }))} />
                </div>

                {/* Mood */}
                <div className="p-6 flex items-center justify-between border-b border-pink-50 hover:bg-pink-50/40 transition-colors group">
                  <div className="flex-1 pr-4">
                    <p className="text-base font-bold text-slate-800 group-hover:text-pink-600 transition-colors mb-1">Cập nhật tâm trạng</p>
                    <p className="text-sm text-slate-400 font-medium">Chia sẻ cảm xúc (Vui, Buồn, Cáu kỉnh) trong ngày.</p>
                  </div>
                  <Toggle checked={share.mood} onChange={(v) => setShare((p) => ({ ...p, mood: v }))} />
                </div>

                {/* Care tips — highlighted row */}
                <div className="p-6 flex items-center justify-between bg-gradient-to-r from-pink-50/80 to-yellow-50/50 border-l-[3px] border-l-pink-400 hover:from-pink-50 transition-colors group">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-pink-500 text-lg">spa</span>
                      <p className="text-base font-bold text-slate-800">Gợi ý cách chăm sóc</p>
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Gửi tips chăm sóc bạn cho người ấy (Mua chocolate, Massage...)</p>
                  </div>
                  <Toggle checked={share.careTips} onChange={(v) => setShare((p) => ({ ...p, careTips: v }))} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Notification channels ── */}
          <div className="bg-white/90 backdrop-blur-sm rounded-[2rem] p-8 shadow-sm border border-white/80 flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
            <div className="flex items-center gap-5 w-full md:w-auto">
              <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-100 flex-shrink-0">
                <span className="material-symbols-outlined text-3xl">mark_email_unread</span>
              </div>
              <div>
                <h4 className="text-xl font-bold text-slate-800">Kênh thông báo</h4>
                <p className="text-slate-400 text-sm mt-1 font-medium">Chọn nơi bạn muốn nhận các bản tin tổng hợp tuần.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 w-full md:w-auto justify-center md:justify-end">
              <ChannelBtn icon="smartphone" label="Push App" active={ch.push}
                activeClass="border-pink-400 bg-pink-50 text-pink-600"
                onClick={() => setCh((p) => ({ ...p, push: !p.push }))} />
              <ChannelBtn icon="email" label="Email" active={ch.email}
                activeClass="border-yellow-400 bg-yellow-50 text-yellow-700"
                onClick={() => setCh((p) => ({ ...p, email: !p.email }))} />
              <ChannelBtn icon="sms" label="SMS" active={ch.sms}
                activeClass="border-pink-400 bg-pink-50 text-pink-600"
                onClick={() => setCh((p) => ({ ...p, sms: !p.sms }))} />
            </div>
          </div>

          {/* ── Save ── */}
          <div className="flex justify-end">
            <button
              className="flex items-center gap-2 px-12 py-4 rounded-full font-bold text-base text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <span className="material-symbols-outlined">check_circle</span>
              Lưu thay đổi
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}
