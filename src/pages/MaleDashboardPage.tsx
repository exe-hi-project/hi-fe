import { useState, useRef, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';

/* ── Helpers ── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Chào buổi sáng', icon: 'wb_sunny' };
  if (h < 18) return { text: 'Chào buổi chiều', icon: 'partly_cloudy_day' };
  return { text: 'Chào buổi tối', icon: 'nightlight' };
}

/* ── Fake partner data ── */
const PARTNER_NAME = 'Lan Anh';
const PARTNER_PHASE = 'Rụng trứng';
const PARTNER_DAY = 14;
const PARTNER_CYCLE_LEN = 28;
const PARTNER_DAYS_UNTIL_PERIOD = 14;

function getCareTips(phase: string): string[] {
  if (phase === 'Kinh nguyệt') return ['🌡️ Chuẩn bị túi chườm ấm', '🍫 Mua chocolate / đồ ăn em thích', '🤗 Nhẹ nhàng và thông cảm hơn'];
  if (phase === 'Rụng trứng')  return ['⚡ Năng lượng em đang ở đỉnh cao', '💑 Lên kế hoạch hẹn hò lãng mạn đi!', '🏃 Cùng em vận động thể thao'];
  if (phase === 'Nang trứng')  return ['✨ Em đang tự tin & hứng khởi', '🎯 Ủng hộ kế hoạch của em', '💬 Trò chuyện sâu hơn'];
  return ['🌙 Em cần nghỉ ngơi nhiều hơn', '☕ Pha cho em ly trà ấm nhé', '🎵 Cùng thư giãn với nhạc nhẹ'];
}

/* ── Activity bars ── */
const ACTIVITY_BARS = [
  { day: 'T2',      h: '70%', cls: 'bg-blue-200',  active: false },
  { day: 'T3',      h: '85%', cls: 'bg-blue-300',  active: false },
  { day: 'T4',      h: '60%', cls: 'bg-blue-200',  active: false },
  { day: 'Hôm\nnay',h:'90%', cls: 'bg-gradient-to-t from-blue-500 to-indigo-400', active: true },
  { day: 'T6',      h: '40%', cls: 'bg-blue-100',  active: false },
  { day: 'T7',      h: '30%', cls: 'bg-blue-100',  active: false },
  { day: 'CN',      h: '20%', cls: 'bg-blue-100',  active: false },
];

/* ── Mood options ── */
const MOOD_OPTIONS = [
  { id: 'energized', emoji: '💪', label: 'Mạnh mẽ',    bg: '#eff6ff', selBg: '#dbeafe', ring: '#93c5fd' },
  { id: 'tired',     emoji: '😴', label: 'Mệt mỏi',    bg: '#f5f3ff', selBg: '#ddd6fe', ring: '#a78bfa' },
  { id: 'focused',   emoji: '🎯', label: 'Tập trung',   bg: '#ecfdf5', selBg: '#a7f3d0', ring: '#34d399' },
  { id: 'stressed',  emoji: '😤', label: 'Căng thẳng',  bg: '#fff7ed', selBg: '#fed7aa', ring: '#fb923c' },
] as const;

/* ── AI ── */
const MALE_AI_INTRO: { role: 'ai' | 'user'; text: string }[] = [
  { role: 'ai', text: 'Chào anh! Mình là Hi AI 💙 Hôm nay anh cảm thấy thế nào?' },
  { role: 'ai', text: `Lan Anh đang ở giai đoạn ${PARTNER_PHASE} — Ngày ${PARTNER_DAY}. Năng lượng của cô ấy đang rất cao. Đây là thời điểm tuyệt vời để cùng nhau làm điều gì đó 💙` },
];
const MALE_AI_CHIPS = ['Hôm nay nên làm gì?', 'Tips chăm bạn gái?', 'Bạn gái đang ở phase nào?', 'Cách giảm stress?'];

/* ── Panel component ── */
function Panel({ open, onClose, title, icon, iconBg, children }: {
  open: boolean; onClose: () => void; title: string; icon: string; iconBg: string; children: React.ReactNode;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-[480px] bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════ */
export default function MaleDashboardPage() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  const firstName = user.name?.split(' ').pop() ?? 'bạn';
  const greeting = getGreeting();
  const careTips = getCareTips(PARTNER_PHASE);

  /* ── Panels ── */
  type PanelId = 'health' | 'mood' | 'chat' | null;
  const [panel, setPanel] = useState<PanelId>(null);
  const close = () => setPanel(null);

  /* ── Health log ── */
  const [health, setHealth] = useState({ workoutDone: false, sleepHours: 7, stressLevel: 3, energyLevel: 75 });
  const [healthSaved, setHealthSaved] = useState(false);
  const saveHealth = () => { setHealthSaved(true); setTimeout(() => { setHealthSaved(false); close(); }, 1500); };

  /* ── Mood ── */
  const [selectedMoods, setSelectedMoods] = useState<Set<string>>(new Set());
  const [moodNote, setMoodNote] = useState('');
  const [moodSaved, setMoodSaved] = useState(false);
  const toggleMood = (id: string) => setSelectedMoods(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const saveMood = () => { setMoodSaved(true); setTimeout(() => { setMoodSaved(false); close(); }, 1500); };

  /* ── Chat ── */
  type MsgRole = 'ai' | 'user';
  type Msg = { id: number; role: MsgRole; text: string };
  const [messages, setMessages] = useState<Msg[]>(MALE_AI_INTRO.map((m, i) => ({ ...m, id: i })));
  const [chatInput, setChatInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  const chatBottom = useRef<HTMLDivElement>(null);
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiTyping]);

  const sendMessage = (text = chatInput.trim()) => {
    if (!text) return;
    setMessages(p => [...p, { id: Date.now(), role: 'user', text }]);
    setChatInput('');
    setAiTyping(true);
    setTimeout(() => {
      const t = text.toLowerCase();
      let reply = 'Mình đã ghi nhận! Bạn có muốn tìm hiểu thêm không? 💙';
      if (t.includes('hôm nay') || t.includes('làm gì'))
        reply = `Hôm nay ${PARTNER_NAME} đang ở giai đoạn ${PARTNER_PHASE}. ${careTips[1].slice(2)} Hãy dành thời gian chất lượng cho nhau nhé! 💙`;
      else if (t.includes('tips') || t.includes('chăm'))
        reply = `Tips hôm nay: ${careTips.map(t2 => t2.slice(2)).join(', ')}. Sự quan tâm chân thành luôn được đánh giá cao! 🌟`;
      else if (t.includes('phase') || t.includes('bạn gái') || t.includes('giai đoạn'))
        reply = `${PARTNER_NAME} đang ở Ngày ${PARTNER_DAY} — giai đoạn ${PARTNER_PHASE}. Kỳ kinh tiếp theo sau ${PARTNER_DAYS_UNTIL_PERIOD} ngày. 📅`;
      else if (t.includes('stress') || t.includes('căng thẳng'))
        reply = 'Hít thở sâu 4-7-8, đi bộ 15 phút, hoặc nghe nhạc nhẹ. Nếu stress kéo dài hãy chia sẻ với người thân nhé! 🧘';
      setMessages(p => [...p, { id: Date.now() + 1, role: 'ai', text: reply }]);
      setAiTyping(false);
    }, 1200);
  };

  const circumference = 2 * Math.PI * 40;
  const energyOffset = circumference * (1 - health.energyLevel / 100);

  return (
    <div className="min-h-screen bg-[#f0f7ff] overflow-x-hidden relative font-sans">
      {/* Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-blue-200/40   w-[500px] h-[500px] rounded-full top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-indigo-100/50  w-[400px] h-[400px] rounded-full bottom-[-80px] right-[-80px]" />
        <div className="lp-blob bg-cyan-100/30    w-[350px] h-[350px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1400px] mx-auto w-full">

          {/* Greeting */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                <span className="material-symbols-outlined text-yellow-500 text-[20px]">{greeting.icon}</span>
                <span>{greeting.text}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                {firstName},{' '}
                <span className="font-medium" style={{ background: 'linear-gradient(90deg,#60a5fa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  hôm nay bạn mạnh mẽ! 💙
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-white/80">
              <span className="text-sm font-semibold text-slate-500">Dự báo hôm nay:</span>
              <span className="px-3 py-1 rounded-lg bg-blue-100  text-blue-700  text-xs font-bold uppercase tracking-wide">Năng lượng cao</span>
              <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wide">Tập trung tốt</span>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* ── 1. Partner cycle hero card ── */}
            <div className="md:col-span-2 row-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-7 relative overflow-hidden shadow-sm border border-white/80">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-70 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-rose-100 to-transparent rounded-full blur-2xl opacity-60 pointer-events-none" />

              {/* Header */}
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-pink-500 text-[22px]">favorite</span>
                    <h3 className="text-lg font-bold text-slate-800">Sức khỏe của {PARTNER_NAME}</h3>
                    <span className="flex h-2.5 w-2.5 relative ml-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500" />
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm ml-7">Theo dõi chu kỳ — Cập nhật tự động</p>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide text-pink-600 bg-pink-50 border border-pink-100">{PARTNER_PHASE}</span>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                {/* Cycle ring */}
                <div className="relative size-48 flex-shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#fce7f3" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#cycleGrad)" strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - PARTNER_DAY / PARTNER_CYCLE_LEN)}
                      strokeLinecap="round" />
                    <defs>
                      <linearGradient id="cycleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#e879f9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ngày chu kỳ</span>
                    <span className="text-4xl font-extrabold text-slate-900">{PARTNER_DAY}</span>
                    <span className="text-[11px] text-slate-400 font-medium">/ {PARTNER_CYCLE_LEN} ngày</span>
                    <span className="text-pink-500 text-xs font-bold mt-1">{PARTNER_PHASE}</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  {/* Phase status */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-pink-100/70" style={{ background: 'linear-gradient(135deg,#fdf2f8,#fae8ff)' }}>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-pink-500 text-[22px]">water_drop</span>
                      <div>
                        <p className="text-[10px] text-pink-500 font-extrabold uppercase tracking-wider">Giai đoạn hiện tại</p>
                        <p className="text-xl font-extrabold text-slate-900">{PARTNER_PHASE}</p>
                      </div>
                    </div>
                    <span className="text-3xl">
                      {PARTNER_PHASE === 'Rụng trứng' ? '🌸' : PARTNER_PHASE === 'Kinh nguyệt' ? '🌡️' : '✨'}
                    </span>
                  </div>

                  {/* Countdown to next period */}
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-rose-400 text-[18px]">calendar_month</span>
                        Kỳ kinh tiếp theo
                      </span>
                      <span className="text-lg font-extrabold text-rose-500">{PARTNER_DAYS_UNTIL_PERIOD} ngày</span>
                    </div>
                    <div className="h-2.5 bg-rose-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(PARTNER_DAY / PARTNER_CYCLE_LEN) * 100}%`, background: 'linear-gradient(90deg,#fb7185,#f472b6)' }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                      <span>Ngày 1</span>
                      <span>Ngày {PARTNER_CYCLE_LEN}</span>
                    </div>
                  </div>

                  {/* Care tips */}
                  <div className="rounded-2xl p-4 border border-pink-100" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' }}>
                    <p className="text-[10px] font-extrabold text-pink-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">tips_and_updates</span>
                      Gợi ý chăm sóc hôm nay
                    </p>
                    <ul className="space-y-2">
                      {careTips.map((tip, i) => (
                        <li key={i} className="text-sm text-slate-600 font-medium">{tip}</li>
                      ))}
                    </ul>
                  </div>

                  <button onClick={() => setPanel('chat')} className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white transition-all hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg,#fb7185,#e879f9)', boxShadow: '0 6px 20px rgba(251,113,133,0.35)' }}>
                    <span className="material-symbols-outlined text-lg">auto_awesome</span>
                    Hỏi Hi AI hôm nay nên làm gì
                  </button>
                </div>
              </div>
            </div>

            {/* ── 2. My health compact card ── */}
            <div className="md:col-span-1 md:row-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-200/20 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-[22px]">person</span>
                    Sức khỏe của bạn
                  </h3>
                  <button onClick={() => setPanel('health')} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>

                {/* Mini energy ring */}
                <div className="flex justify-center mb-5">
                  <div className="relative size-28">
                    <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="maleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#818cf8" />
                        </linearGradient>
                      </defs>
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e0f2fe" strokeWidth="10" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="url(#maleGrad)" strokeWidth="10"
                        strokeDasharray={circumference} strokeDashoffset={energyOffset} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-extrabold text-slate-900">{health.energyLevel}%</span>
                      <span className="text-blue-500 text-[10px] font-bold">Năng lượng</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Sleep */}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-indigo-400 text-[16px]">bedtime</span>
                        Giấc ngủ
                      </span>
                      <span className="font-bold text-indigo-500">{health.sleepHours}h</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(health.sleepHours / 9) * 100}%`, background: 'linear-gradient(90deg,#818cf8,#6366f1)' }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{health.sleepHours >= 7 ? 'Ngủ đủ giấc 👏' : 'Nên ngủ thêm'}</p>
                  </div>

                  {/* Stress */}
                  <div>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-cyan-400 text-[16px]">psychology</span>
                        Stress
                      </span>
                      <span className="font-bold text-cyan-500">{['','Rất thấp','Thấp','TB','Cao','Cao!'][health.stressLevel]}</span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(health.stressLevel / 5) * 100}%`, background: 'linear-gradient(90deg,#67e8f9,#22d3ee)' }} />
                    </div>
                  </div>

                  {/* Workout */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-blue-500 text-[18px]">sports_gymnastics</span>
                      <div>
                        <p className="text-[10px] text-blue-600 font-extrabold uppercase">Chuỗi tập</p>
                        <p className="text-base font-bold text-slate-900">5 ngày 🔥</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={() => setPanel('health')} className="mt-4 w-full py-2.5 bg-white border border-blue-100 text-blue-500 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
                Ghi nhật ký
              </button>
            </div>

            {/* ── 3. Quick Mood ── */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80 flex flex-col">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-400 text-[22px]">edit_note</span>
                Nhật ký nhanh
              </h3>
              <p className="text-sm text-slate-500 mb-4">Bạn cảm thấy thế nào?</p>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {MOOD_OPTIONS.map(({ id, emoji, label, bg, selBg, ring }) => {
                  const active = selectedMoods.has(id);
                  return (
                    <button key={id} onClick={() => toggleMood(id)}
                      className="flex flex-col items-center justify-center py-5 rounded-2xl transition-all duration-200 border-2"
                      style={{ background: active ? selBg : bg, borderColor: active ? ring : 'transparent', boxShadow: active ? `0 4px 16px ${ring}99` : '0 2px 8px rgba(0,0,0,0.04)', transform: active ? 'scale(1.04)' : 'scale(1)' }}
                    >
                      <span className="text-3xl mb-1.5">{emoji}</span>
                      <span className="text-xs font-bold text-slate-700">{label}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPanel('mood')} className="mt-4 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors text-center py-1.5">
                Ghi chi tiết →
              </button>
            </div>

            {/* ── 4. Hi AI advice (dark blue) ── */}
            <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-36 h-36 rounded-full blur-[60px] opacity-30 pointer-events-none" style={{ background: 'linear-gradient(135deg,#60a5fa,#818cf8)' }} />
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className="material-symbols-outlined text-blue-400 text-[22px]">auto_awesome</span>
                <h3 className="font-bold text-sm text-slate-200">Lời khuyên từ Hi AI</h3>
              </div>
              <div className="flex-grow flex flex-col justify-center relative z-10">
                <p className="text-base font-medium leading-snug mb-4">
                  {PARTNER_PHASE === 'Rụng trứng'
                    ? `"Hôm nay ${PARTNER_NAME} đang rất năng động! Đây là lúc tuyệt vời để lên kế hoạch hẹn hò 💙"`
                    : PARTNER_PHASE === 'Kinh nguyệt'
                    ? '"Người ấy cần sự quan tâm hơn hôm nay. Một cử chỉ nhỏ cũng có ý nghĩa lớn!"'
                    : '"Duy trì thói quen tốt và dành thời gian chất lượng với người ấy!"'}
                </p>
                <button onClick={() => setPanel('chat')} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                  Hỏi Hi AI thêm <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* ── 5. Activity chart ── */}
            <div className="md:col-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-[22px]">bar_chart</span>
                  Hoạt động tuần này
                </h3>
                <select className="bg-gray-50 border-none text-xs font-bold rounded-lg py-1 px-3 text-slate-600 cursor-pointer hover:bg-gray-100 outline-none">
                  <option>7 ngày qua</option>
                  <option>30 ngày qua</option>
                </select>
              </div>
              <div className="h-36 w-full flex items-end justify-between gap-2 px-2">
                {ACTIVITY_BARS.map(({ day, h, cls, active }) => (
                  <div key={day} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
                    <div className={`relative w-full bg-gray-100 rounded-t-xl rounded-b-sm h-32 flex items-end overflow-hidden ${active ? 'ring-2 ring-blue-400 ring-offset-2' : ''}`}>
                      <div className={`w-full ${cls} transition-colors rounded-t-xl`} style={{ height: h }} />
                    </div>
                    <span className={`text-[10px] font-bold text-center whitespace-pre ${active ? 'text-slate-900' : 'text-slate-400'}`}>{day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 6. Mini calendar (partner's cycle) ── */}
            <div className="md:col-span-2 bg-blue-50/50 rounded-3xl p-6 shadow-sm border border-blue-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-500 text-[22px]">calendar_month</span>
                  Chu kỳ của {PARTNER_NAME} — Tháng 3
                </h3>
                <Link to="/male-settings/notifications" className="text-xs font-bold text-slate-500 hover:text-blue-500 transition-colors">Cài đặt</Link>
              </div>
              <div className="flex-1 grid grid-cols-7 gap-1 text-center mb-2">
                {['H','T','W','T','F','S','S'].map((d, i) => (
                  <div key={i} className="text-[10px] uppercase font-bold text-slate-400 mb-2">{d}</div>
                ))}
                {[10, 11, 12, 13, 14, 15, 16].map(d => {
                  const isToday = d === PARTNER_DAY;
                  const isOvul = d >= 13 && d <= 16;
                  return (
                    <div key={d}
                      className={`h-8 flex items-center justify-center rounded-lg text-sm ${isToday ? 'font-bold text-white shadow-lg' : isOvul ? 'text-slate-800 border border-pink-200 bg-pink-50' : 'text-slate-400'}`}
                      style={isToday ? { background: 'linear-gradient(135deg,#f9a8c9,#d4a8e8)' } : undefined}
                    >
                      {d}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 justify-center mt-2">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Rụng trứng</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Kinh nguyệt</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-300 inline-block" /> Nang/Hoàng thể</div>
              </div>
            </div>

            {/* ── 7. Community FAQ ── */}
            <div className="md:col-span-4 bg-white/90 backdrop-blur-sm rounded-3xl p-7 shadow-sm border border-white/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Câu hỏi thường gặp</h3>
                  <p className="text-slate-500 text-sm">Cộng đồng đang thảo luận gì?</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-400">Chủ đề hot:</span>
                  {['#SucKhoe', '#CuocSong', '#CuuTinhYeu'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-slate-600 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { cat: 'Cặp đôi', q: 'Làm gì khi bạn gái đang trong kỳ kinh?', desc: 'Đây là những điều bạn nên và không nên làm để cô ấy cảm thấy được yêu thương...' },
                  { cat: 'Sức khoẻ', q: 'Cách tăng năng lượng hiệu quả trong tuần?', desc: 'Ngủ đủ 7–8 tiếng, ăn sáng đầy đủ, và tập thể dục 30 phút mỗi ngày là chìa khóa...' },
                ].map(({ cat, q, desc }) => (
                  <button key={q} onClick={() => { setChatInput(q); setPanel('chat'); }}
                    className="group p-4 rounded-2xl bg-gray-50 hover:bg-blue-50/50 border border-transparent hover:border-blue-100 transition-all cursor-pointer text-left w-full">
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-white rounded-md text-[10px] font-bold text-blue-500 shadow-sm border border-blue-100">{cat}</span>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-blue-400 transition-colors text-[18px]">arrow_outward</span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors text-sm">{q}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{desc}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setPanel('chat')} className="block w-full mt-5 py-3 border border-gray-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all text-center">
                Khám phá thêm cùng Hi AI
              </button>
            </div>

            {/* ── 8. Upgrade Plans ── */}
            <div className="md:col-span-4 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#e0e7ff 50%,#ecfdf5 100%)' }}>
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle,#93c5fd,transparent)' }} />
              <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle,#a5b4fc,transparent)' }} />

              <div className="relative z-10 px-7 pt-7 pb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-7">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[22px] text-blue-500">workspace_premium</span>
                      <h3 className="text-xl font-extrabold text-slate-900">Nâng cấp trải nghiệm của bạn</h3>
                    </div>
                    <p className="text-slate-500 text-sm">Chọn gói phù hợp để mở khoá toàn bộ tính năng Hi ✨</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    <span className="text-xs font-bold text-slate-600">Ưu đãi tháng 3 — Tiết kiệm 30%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Free */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/90 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Gói hiện tại</p>
                        <h4 className="text-xl font-extrabold text-slate-900">Thường</h4>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400 text-[26px]">favorite_border</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-1 mb-5"><span className="text-3xl font-extrabold text-slate-800">Miễn phí</span></div>
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {['Theo dõi sức khoẻ cơ bản','Nhật ký hoạt động','Xem chu kỳ đối tác','Hi AI (5 câu hỏi / ngày)','Đồng bộ & chia sẻ với đối tác'].map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                          <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-slate-400 text-[14px]">check</span></span>{f}
                        </li>
                      ))}
                      {['Phân tích sâu AI','Báo cáo PDF hàng tháng'].map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400 line-through">
                          <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-slate-300 text-[14px]">close</span></span>{f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 cursor-default border border-slate-200">Đang sử dụng</button>
                  </div>

                  {/* Premium */}
                  <div className="rounded-2xl p-6 flex flex-col relative overflow-hidden border border-blue-200/60 shadow-lg" style={{ background: 'linear-gradient(150deg,#eff6ff,#e0e7ff,#f5f3ff)' }}>
                    <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-extrabold text-white uppercase tracking-widest" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>Phổ biến nhất ⭐</div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-0.5 text-blue-500">Gói đề xuất</p>
                        <h4 className="text-xl font-extrabold text-slate-900">Premium</h4>
                      </div>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                        <span className="material-symbols-outlined text-white text-[26px]">workspace_premium</span>
                      </div>
                    </div>
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className="text-3xl font-extrabold text-slate-900">29.000₫</span>
                      <span className="text-sm font-bold text-slate-400 mb-1">/ tháng</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-5">Hoặc 290.000₫ / năm — <span className="font-bold text-emerald-500">tiết kiệm 17%</span></p>
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {['Tất cả tính năng gói Thường','Phân tích sức khoẻ chuyên sâu AI','Hỏi Hi AI không giới hạn','Báo cáo PDF hàng tháng','Nhắc nhở theo chu kỳ bạn gái','Hỗ trợ ưu tiên 24/7'].map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}><span className="material-symbols-outlined text-white text-[14px]">check</span></span>{f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-3.5 rounded-xl text-sm font-extrabold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 8px 24px rgba(59,130,246,0.40)' }}>
                      <span className="material-symbols-outlined text-[18px]">bolt</span>
                      Nâng cấp ngay — Dùng thử 7 ngày miễn phí
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-2">Huỷ bất cứ lúc nào · Không cần thẻ tín dụng</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>

        <footer className="bg-white/60 border-t border-white/40 py-6 px-4 md:px-8 backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-400">
            <p>© 2025 Hi Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-blue-500 transition-colors cursor-pointer">Privacy</span>
              <span className="hover:text-blue-500 transition-colors cursor-pointer">Help Center</span>
              <Link to="/male-settings/notifications" className="hover:text-blue-500 transition-colors">Settings</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* ═══ Panels ═══ */}

      {/* Panel 1: Health Log */}
      <Panel open={panel === 'health'} onClose={close} title="Nhật ký sức khỏe" icon="fitness_center" iconBg="bg-blue-100 text-blue-500">
        <div style={{ background: 'linear-gradient(160deg,#f0f9ff 0%,#e0e7ff 100%)' }}>

          {/* Energy */}
          <div className="px-6 py-4 border-b border-blue-50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">⚡ Mức năng lượng</label>
              <span className="text-sm font-extrabold text-blue-500">{health.energyLevel}%</span>
            </div>
            <input type="range" min={0} max={100} value={health.energyLevel}
              onChange={e => setHealth(p => ({ ...p, energyLevel: +e.target.value }))}
              className="w-full h-2 rounded-full cursor-pointer appearance-none" style={{ accentColor: '#3b82f6' }} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Kiệt sức</span><span>Tràn năng lượng</span></div>
          </div>

          {/* Sleep */}
          <div className="px-6 py-4 border-b border-blue-50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">🌙 Giờ ngủ</label>
              <span className="text-sm font-extrabold text-indigo-500">{health.sleepHours}h</span>
            </div>
            <input type="range" min={4} max={10} step={0.5} value={health.sleepHours}
              onChange={e => setHealth(p => ({ ...p, sleepHours: +e.target.value }))}
              className="w-full h-2 rounded-full cursor-pointer appearance-none" style={{ accentColor: '#6366f1' }} />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>4h</span><span>10h</span></div>
          </div>

          {/* Stress */}
          <div className="px-6 py-4 border-b border-blue-50">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">🧠 Mức căng thẳng</label>
              <span className="text-sm font-extrabold text-cyan-500">{['','Rất thấp','Thấp','Trung bình','Cao','Rất cao'][health.stressLevel]}</span>
            </div>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(v => (
                <button key={v} onClick={() => setHealth(p => ({ ...p, stressLevel: v }))}
                  className="flex-1 h-3 rounded-full transition-all duration-300"
                  style={{ background: v <= health.stressLevel ? 'linear-gradient(90deg,#67e8f9,#22d3ee)' : '#e2e8f0', transform: v === health.stressLevel ? 'scaleY(1.4)' : 'scaleY(1)' }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Rất thấp</span><span>Rất cao</span></div>
          </div>

          {/* Workout */}
          <div className="px-6 py-4 border-b border-blue-50">
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-3">🏋️ Hôm nay có tập luyện không?</p>
            <div className="flex gap-3">
              {(['Có rồi! 💪', 'Chưa, bận quá'] as const).map((label, i) => (
                <button key={label} onClick={() => setHealth(p => ({ ...p, workoutDone: i === 0 }))}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all border-2"
                  style={health.workoutDone === (i === 0)
                    ? { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: 'white', borderColor: 'transparent', boxShadow: '0 4px 14px rgba(59,130,246,0.35)' }
                    : { background: 'white', color: '#94a3b8', borderColor: '#e2e8f0' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="px-6 py-6">
            <button onClick={saveHealth}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 text-white"
              style={{ background: healthSaved ? '#22c55e' : 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: healthSaved ? 'none' : '0 8px 24px rgba(59,130,246,0.35)' }}>
              <span className="material-symbols-outlined">{healthSaved ? 'check_circle' : 'save'}</span>
              {healthSaved ? 'Đã lưu!' : 'Lưu nhật ký'}
            </button>
          </div>
        </div>
      </Panel>

      {/* Panel 2: Mood detail */}
      <Panel open={panel === 'mood'} onClose={close} title="Nhật ký tâm trạng" icon="edit_note" iconBg="bg-indigo-100 text-indigo-500">
        <div style={{ background: 'linear-gradient(160deg,#f0f9ff 0%,#e0e7ff 100%)' }}>
          <div className="px-6 pt-4 pb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">Hôm nay</p>
              <p className="text-sm font-bold text-slate-700">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            </div>
            {selectedMoods.size > 0 && (
              <div className="px-3 py-1.5 rounded-full text-xs font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                {selectedMoods.size} trạng thái
              </div>
            )}
          </div>

          <div className="px-5 py-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Cảm xúc hôm nay</p>
            <div className="grid grid-cols-2 gap-3">
              {MOOD_OPTIONS.map(({ id, emoji, label, bg, selBg, ring }) => {
                const active = selectedMoods.has(id);
                return (
                  <button key={id} onClick={() => toggleMood(id)}
                    className="flex flex-col items-center py-5 rounded-2xl transition-all duration-200 border-2"
                    style={{ background: active ? selBg : bg, borderColor: active ? ring : 'transparent', boxShadow: active ? `0 8px 20px ${ring}55` : '0 2px 8px rgba(0,0,0,0.06)', transform: active ? 'scale(1.05)' : 'scale(1)' }}>
                    <span className="text-3xl mb-1">{emoji}</span>
                    <span className={`text-xs font-bold ${active ? 'text-slate-800' : 'text-slate-500'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 pb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📝</span>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Ghi chú</span>
              </div>
              <textarea value={moodNote} onChange={e => setMoodNote(e.target.value)}
                placeholder="Hôm nay bạn nghĩ gì? Sự kiện nổi bật..."
                rows={3} className="w-full text-sm text-slate-700 resize-none outline-none bg-transparent placeholder-blue-200 leading-relaxed" />
            </div>
          </div>

          <div className="px-5 pb-8">
            <button onClick={saveMood}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all"
              style={{ background: moodSaved ? '#22c55e' : 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: moodSaved ? 'none' : '0 10px 28px rgba(59,130,246,0.40)' }}>
              <span className="material-symbols-outlined">{moodSaved ? 'check_circle' : 'save'}</span>
              {moodSaved ? 'Đã lưu! 💙' : 'Lưu tâm trạng'}
            </button>
          </div>
        </div>
      </Panel>

      {/* Panel 3: AI Chat */}
      <Panel open={panel === 'chat'} onClose={close} title="Hi AI Chat" icon="auto_awesome" iconBg="bg-blue-100 text-blue-500">
        <div className="flex flex-col h-full">
          {/* AI strip */}
          <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  <span className="material-symbols-outlined text-white text-[20px]">auto_awesome</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">Hi AI 💙</p>
                <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />Sẵn sàng trò chuyện
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-medium">Người ấy</p>
              <p className="text-[10px] font-bold text-pink-400">{PARTNER_PHASE} · Ngày {PARTNER_DAY}</p>
            </div>
          </div>

          {/* Chips */}
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto flex-shrink-0" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', borderBottom: '1px solid #dbeafe' }}>
            {MALE_AI_CHIPS.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#dbeafe,#e0e7ff)', color: '#3730a3', border: '1px solid #c7d2fe' }}>
                ✨ {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0" style={{ background: 'linear-gradient(160deg,#f8fbff 0%,#eef2ff 100%)' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                    <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                  </div>
                )}
                <div className="max-w-[75%] px-4 py-3 text-sm font-medium leading-relaxed rounded-2xl"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg,#1e3a5f,#312e81)', color: '#dbeafe',
                    borderBottomRightRadius: 4, boxShadow: '0 4px 14px rgba(30,58,95,0.30)',
                  } : {
                    background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', color: '#1e3a8a',
                    borderBottomLeftRadius: 4, boxShadow: '0 4px 14px rgba(59,130,246,0.12)',
                  }}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex-shrink-0 flex items-center justify-center border border-blue-200">
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">person</span>
                  </div>
                )}
              </div>
            ))}
            {aiTyping && (
              <div className="flex items-end gap-2">
                <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                </div>
                <div className="px-4 py-3 rounded-2xl flex gap-1.5 items-center" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)', borderBottomLeftRadius: 4 }}>
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#60a5fa', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#6366f1', animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatBottom} />
          </div>

          {/* Input */}
          <div className="px-4 py-4 flex-shrink-0 border-t border-blue-50" style={{ background: 'linear-gradient(135deg,#eff6ff,#e0e7ff)' }}>
            <div className="flex gap-3 items-end p-1 rounded-2xl border-2 border-blue-200/60 bg-white/80 backdrop-blur-sm">
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Nhập câu hỏi..." rows={1}
                className="flex-1 px-3 py-2 text-sm text-slate-700 resize-none outline-none bg-transparent placeholder-blue-300 leading-relaxed max-h-24" />
              <button onClick={() => sendMessage()} disabled={!chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0 mb-0.5 mr-0.5"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: chatInput.trim() ? '0 4px 12px rgba(59,130,246,0.35)' : 'none' }}>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
