import { useState, useRef, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import Navbar from '../components/layout/Navbar';
import api from '../lib/api';

/* ─── types & helpers ───────────────────────────────── */
interface CycleData { _id?: string; startDate: string; cycleLength: number; periodLength: number; }

function getCycleInfo(cycle: CycleData) {
  const today = new Date();
  const start = new Date(cycle.startDate);
  const cycleDay = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);
  const cycleLen = cycle.cycleLength || 28;
  const daysUntilPeriod = cycleLen - cycleDay;
  let phase = 'Hoàng thể'; let fertilityPct = 15;
  if (cycleDay <= cycle.periodLength) { phase = 'Kinh nguyệt'; fertilityPct = 5; }
  else if (cycleDay <= 13)            { phase = 'Nang trứng';  fertilityPct = 30; }
  else if (cycleDay <= 16)            { phase = 'Rụng trứng';  fertilityPct = 90; }
  return { cycleDay, phase, daysUntilPeriod, fertilityPct, cycleLen };
}

/* ─── greeting helpers ──────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Chào buổi sáng', icon: 'wb_sunny' };
  if (h < 18) return { text: 'Chào buổi chiều', icon: 'partly_cloudy_day' };
  return { text: 'Chào buổi tối', icon: 'nightlight' };
}

/* ─── static data ───────────────────────────────────── */
function getWeekBars() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const todayIndex = (new Date().getDay() + 6) % 7;
  return days.map((day, i) => ({
    day,
    h: i === todayIndex ? '70%' : i < todayIndex ? '20%' : '0%',
    cls: i === todayIndex ? 'bg-pink-400' : i < todayIndex ? 'bg-purple-200' : 'bg-gray-100',
    active: i === todayIndex,
  }));
}

const SYMPTOMS_LIST = [
  { id: 'cramps',   emoji: '😣', label: 'Đau bụng', bg: '#fce7f3', selFrom: '#fb7185', selTo: '#f472b6' },
  { id: 'headache', emoji: '🤕', label: 'Đau đầu',  bg: '#ede9fe', selFrom: '#a78bfa', selTo: '#8b5cf6' },
  { id: 'bloating', emoji: '🫃', label: 'Đầy hơi',  bg: '#fef3c7', selFrom: '#fbbf24', selTo: '#f59e0b' },
  { id: 'fatigue',  emoji: '😴', label: 'Mệt mỏi',  bg: '#dbeafe', selFrom: '#60a5fa', selTo: '#3b82f6' },
  { id: 'acne',     emoji: '😮', label: 'Nổi mụn',  bg: '#fce7f3', selFrom: '#f472b6', selTo: '#db2777' },
  { id: 'backpain', emoji: '🧍', label: 'Đau lưng',  bg: '#d1fae5', selFrom: '#34d399', selTo: '#10b981' },
  { id: 'tender',   emoji: '💛', label: 'Ngực đau',  bg: '#fef9c3', selFrom: '#facc15', selTo: '#eab308' },
  { id: 'nausea',   emoji: '🤢', label: 'Buồn nôn',  bg: '#dcfce7', selFrom: '#4ade80', selTo: '#22c55e' },
  { id: 'insomnia', emoji: '🌙', label: 'Mất ngủ',   bg: '#e0e7ff', selFrom: '#818cf8', selTo: '#6366f1' },
];

const AI_INTRO: { role: 'ai' | 'user'; text: string; product?: { image: string; name: string; price: string; desc: string; shopeeUrl: string } }[] = [
  { role: 'ai' as const, text: 'Xin chào! Mình là Hi AI 🌸 Hôm nay bạn cảm thấy thế nào?' },
  { role: 'ai' as const, text: 'Hãy hỏi mình bất cứ điều gì về chu kỳ, sức khỏe sinh sản, hoặc cảm xúc của bạn nhé 💕' },
  { role: 'user' as const, text: 'Bụng mình đang đau quá 😢 có cách nào giảm đau không?' },
  {
    role: 'ai' as const,
    text: 'Mình hiểu cảm giác đó rồi 💕 Đau bụng kinh là điều rất bình thường. Một trong những cách hiệu quả nhất là dùng túi chườm ấm — nhiệt giúp giãn cơ tử cung và giảm đau nhanh chóng. Mình tìm được sản phẩm này trên Shopee cho bạn nè! 🛍️',
    product: {
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=240&fit=crop',
      name: 'Túi Chườm Ấm Điện Thông Minh – Giảm Đau Bụng Kinh',
      price: '₫189.000',
      desc: 'Nhiệt ổn định 3 mức · Vỏ nhung siêu mềm · Pin sạc USB · Tự ngắt an toàn',
      shopeeUrl: 'https://shopee.vn/search?keyword=t%C3%BAi+ch%C6%B0%E1%BB%9Dm+%E1%BA%A5m+gi%E1%BA%A3m+%C4%91au+b%E1%BB%A5ng+kinh',
    },
  },
];

const AI_CHIPS = ['Hôm nay nên ăn gì?', 'Tại sao tôi hay cáu?', '😣 Giảm đau bụng ngay?', 'Khi nào kỳ kinh tới?'];

/* ─── Calendar helpers ──────────────────────────────── */
const MONTHS_VN = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
const CAL_DAYS  = ['T2','T3','T4','T5','T6','T7','CN'];
function getFirstDayMon(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/* ─── Panel drawer ──────────────────────────────────── */
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
      <div onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />
      <div className={`fixed top-0 right-0 h-full z-50 w-full max-w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-slate-500 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}

/* ─── Main component ─────────────────────────────────── */
export default function FemaleDashboardPage() {
  const { user } = useAuthStore();
  if (user?.gender !== 'female') return <Navigate to="/dashboard" replace />;

  const firstName = user?.name?.split(' ').pop() ?? 'bạn';
  const greeting  = getGreeting();

  /* ── Cycle query ── */
  const queryClient = useQueryClient();
  const cycleQuery = useQuery({
    queryKey: ['cycles'],
    queryFn: async () => {
      const { data } = await api.get('/cycles');
      return data as { success: boolean; cycles: CycleData[] };
    },
  });
  const latestCycle = cycleQuery.data?.cycles?.[0] ?? null;
  const cycleInfo = latestCycle ? getCycleInfo(latestCycle) : null;
  const cycleDay       = cycleInfo?.cycleDay       ?? 0;
  const phase          = cycleInfo?.phase          ?? '—';
  const daysUntilPeriod = cycleInfo?.daysUntilPeriod ?? 0;
  const fertilityPct   = cycleInfo?.fertilityPct   ?? 0;
  const cycleLen       = cycleInfo?.cycleLen       ?? 28;

  const circumference = 251.2;
  const dashoffset = circumference - (latestCycle ? (cycleDay / cycleLen) * circumference : circumference);
  const today = new Date();
  const monthLabel = today.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  /* ── Panel state ── */
  type PanelId = 'cycle' | 'chat' | 'symptoms' | null;
  const [panel, setPanel] = useState<PanelId>(null);
  const close = () => setPanel(null);

  /* ── Cycle editor state ── */
  const [editStart, setEditStart] = useState('');
  const [editLen, setEditLen] = useState(28);
  const [editPeriodLen, setEditPeriodLen] = useState(5);
  const [cycleSaved, setCycleSaved] = useState(false);
  const [editCalYear, setEditCalYear] = useState(today.getFullYear());
  const [editCalMonth, setEditCalMonth] = useState(today.getMonth());

  useEffect(() => {
    if (latestCycle) {
      setEditStart(latestCycle.startDate.slice(0, 10));
      setEditLen(latestCycle.cycleLength ?? 28);
      setEditPeriodLen(latestCycle.periodLength ?? 5);
      const d = new Date(latestCycle.startDate);
      setEditCalYear(d.getFullYear());
      setEditCalMonth(d.getMonth());
    }
  }, [latestCycle?._id]);

  const editPrevMonth = () => { if (editCalMonth === 0) { setEditCalMonth(11); setEditCalYear(y => y - 1); } else setEditCalMonth(m => m - 1); };
  const editNextMonth = () => { if (editCalMonth === 11) { setEditCalMonth(0); setEditCalYear(y => y + 1); } else setEditCalMonth(m => m + 1); };

  const saveCycleMutation = useMutation({
    mutationFn: async (payload: { startDate: string; cycleLength: number; periodLength: number }) => {
      if (latestCycle?._id) {
        const { data } = await api.put(`/cycles/${latestCycle._id}`, payload);
        return data;
      }
      const { data } = await api.post('/cycles', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      setCycleSaved(true);
      setTimeout(() => { setCycleSaved(false); close(); }, 1000);
    },
  });

  const saveCycle = () => {
    saveCycleMutation.mutate({
      startDate: new Date(editStart).toISOString(),
      cycleLength: editLen,
      periodLength: editPeriodLen,
    });
  };

  /* ── Symptom state ── */
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set());
  const [flow, setFlow] = useState(2);
  const [symptomNote, setSymptomNote] = useState('');
  const [symptomSaved, setSymptomSaved] = useState(false);
  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const saveSymptoms = () => {
    setSymptomSaved(true);
    setTimeout(() => { setSymptomSaved(false); close(); }, 1000);
  };

  /* ── Chat state ── */
  type MsgRole = 'ai' | 'user';
  type ProductCard = { image: string; name: string; price: string; desc: string; shopeeUrl: string };
  type Msg = { id: number; role: MsgRole; text: string; product?: ProductCard };
  const [messages, setMessages] = useState<Msg[]>(AI_INTRO.map((m, i) => ({ ...m, id: i })));
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
      let reply = 'Mình đã ghi nhận! Bạn có muốn tìm hiểu thêm về sức khỏe của mình không? 💕';
      if (t.includes('ăn') || t.includes('thực phẩm') || t.includes('dinh dưỡng'))
        reply = `Trong giai đoạn ${phase}, bạn nên ăn: rau lá xanh đậm (spinach, kale), cá hồi giàu omega-3, và uống đủ 2L nước mỗi ngày. 🥗`;
      else if (t.includes('cáu') || t.includes('cảm xúc') || t.includes('tâm trạng'))
        reply = 'Sự thay đổi cảm xúc trong giai đoạn này là hoàn toàn bình thường! Progesterone giảm làm tâm trạng nhạy cảm hơn. Thử hít thở sâu và đi dạo 15 phút nhé 🌸';
      else if (t.includes('kinh') || t.includes('kỳ'))
        reply = `Kỳ kinh tiếp theo của bạn dự kiến sau ${daysUntilPeriod <= 0 ? 'hôm nay' : `${daysUntilPeriod} ngày`}. Giai đoạn hiện tại: ${phase}. 📅`;
      else if (t.includes('rụng trứng') || t.includes('thụ thai'))
        reply = `Khả năng thụ thai của bạn hiện ở mức ${fertilityPct >= 80 ? 'Rất cao' : fertilityPct >= 40 ? 'Trung bình' : 'Thấp'} (${fertilityPct}%). ${fertilityPct >= 80 ? 'Đây là thời điểm thích hợp nếu bạn đang lên kế hoạch có con!' : ''} 💫`;
      else if (t.includes('đau') || t.includes('mệt') || t.includes('triệu chứng'))
        reply = 'Đau và mệt mỏi có thể do biến động nội tiết tố. Hãy nghỉ ngơi đủ giấc, dùng túi chườm ấm và tránh caffeine. Nếu đau kéo dài hãy gặp bác sĩ nhé! 🩺';
      setMessages(p => [...p, { id: Date.now() + 1, role: 'ai', text: reply }]);
      setAiTyping(false);
    }, 1200);
  };

  const hasPartner = !!user?.partnerId;

  return (
    <div className="min-h-screen bg-[#f8f6f7] overflow-x-hidden relative font-sans">
      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-pink-200/40  w-[500px] h-[500px] rounded-full top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-yellow-100/50 w-[400px] h-[400px] rounded-full bottom-[-80px] right-[-80px]" />
        <div className="lp-blob bg-blue-100/30  w-[350px] h-[350px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Navbar ── */}
        <Navbar />

        {/* ── Main ── */}
        <main className="flex-grow pt-6 pb-16 px-4 md:px-8 max-w-[1400px] mx-auto w-full">

          {/* Greeting row */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm font-medium">
                <span className="material-symbols-outlined text-yellow-500 text-[20px]">{greeting.icon}</span>
                <span>{greeting.text}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
                {firstName},{' '}
                <span
                  className="font-medium"
                  style={{
                    background: 'linear-gradient(90deg, #e9638f, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  hôm nay bạn tỏa sáng! ✨
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-sm border border-white/80">
              <span className="text-sm font-semibold text-slate-500">Dự báo hôm nay:</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wide">Năng lượng cao</span>
              <span className="px-3 py-1 rounded-lg bg-blue-100  text-blue-700  text-xs font-bold uppercase tracking-wide">Da đẹp</span>
            </div>
          </div>

          {/* ── Card grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            {/* ── 1. Cycle Status ── */}
            <div className="md:col-span-2 row-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-7 relative overflow-hidden shadow-sm border border-white/80">
              <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-pink-100 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-pink-400 text-[22px]">water_drop</span>
                    Trạng thái chu kỳ
                  </h3>
                  <p className="text-slate-400 text-sm">Cập nhật lúc 8:00 sáng nay</p>
                </div>
                <button
                  onClick={() => setPanel('cycle')}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-pink-50 flex items-center justify-center text-slate-400 hover:text-pink-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </button>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                {/* Donut */}
                <div className="relative size-48 flex-shrink-0">
                  <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="url(#femGrad)" strokeWidth="8"
                      strokeDasharray={circumference}
                      strokeDashoffset={cycleDay ? dashoffset : circumference}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="femGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f9a8c9" />
                        <stop offset="100%" stopColor="#d4a8e8" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ngày</span>
                    <span className="text-4xl font-extrabold text-slate-900">{cycleDay || '--'}</span>
                    <span className="text-pink-500 text-sm font-bold mt-1">{phase}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 w-full space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-slate-600">Khả năng thụ thai</span>
                      <span className="font-bold text-pink-500">
                        {fertilityPct >= 80 ? 'Rất cao' : fertilityPct >= 40 ? 'Trung bình' : 'Thấp'}
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${fertilityPct}%`, background: 'linear-gradient(90deg,#f9a8c9,#d4a8e8)' }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {phase === 'Rụng trứng'
                        ? 'Đỉnh điểm rụng trứng — hãy theo dõi sát hôm nay.'
                        : phase === 'Nang trứng'
                        ? 'Giai đoạn chuẩn bị, năng lượng đang tăng dần.'
                        : 'Cơ hội thụ thai ở mức thấp trong giai đoạn này.'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-yellow-50/70 border border-yellow-100/70">
                      <p className="text-[10px] text-yellow-700 font-bold uppercase mb-1">Kỳ kinh tới</p>
                      <p className="text-xl font-bold text-slate-900">
                        {daysUntilPeriod !== null ? (daysUntilPeriod <= 0 ? 'Hôm nay' : `${daysUntilPeriod} ngày`) : '--'}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100/70">
                      <p className="text-[10px] text-blue-700 font-bold uppercase mb-1">Giai đoạn</p>
                      <p className="text-xl font-bold text-slate-900">{phase}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPanel('cycle')}
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">edit_calendar</span>
                    Chỉnh sửa kỳ kinh
                  </button>
                </div>
              </div>
            </div>

            {/* ── 2. Partner card ── */}
            <div className="md:col-span-1 md:row-span-2 bg-gradient-to-b from-blue-50 to-white rounded-3xl p-6 shadow-sm border border-blue-100 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-blue-200/20 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between mb-5 relative z-10">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[22px]">favorite</span>
                    Đối tác
                  </h3>
                  {hasPartner && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                    </span>
                  )}
                </div>

                {hasPartner ? (
                  <div className="flex flex-col items-center text-center mb-5">
                    <div className="relative mb-3">
                      <div className="size-20 rounded-full border-4 border-white shadow-md bg-gradient-to-br from-blue-200 to-purple-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-white">person</span>
                      </div>
                      <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-sm">
                        <span className="material-symbols-outlined text-pink-500 text-sm">notifications_active</span>
                      </div>
                    </div>
                    <h4 className="font-bold text-lg text-slate-900">Minh Hùng</h4>
                    <p className="text-xs text-slate-400">Đã kết nối</p>
                    <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-white mt-4 shadow-sm w-full">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-2">Trạng thái đã gửi</p>
                      <div className="flex items-start gap-3">
                        <span className="text-xl">🥺</span>
                        <p className="text-sm text-slate-700 font-medium leading-snug text-left">
                          "Em đang trong ngày {phase.toLowerCase()}, cảm xúc hơi nhạy cảm xíu..."
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center py-6 gap-3">
                    <div className="size-16 rounded-full bg-blue-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-blue-300">person_add</span>
                    </div>
                    <p className="text-sm text-slate-500">Chưa kết nối với ai</p>
                    <Link to="/settings" className="text-xs font-bold text-blue-500 hover:underline">
                      Kết nối ngay →
                    </Link>
                  </div>
                )}
              </div>
              <button
                onClick={() => setPanel('chat')}
                className="w-full py-2.5 bg-white border border-blue-100 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                Gửi lời nhắn
              </button>
            </div>

            {/* ── 3. Quick Journal ── */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80 flex flex-col">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500 text-[22px]">edit_note</span>
                Nhật ký nhanh
              </h3>
              <p className="text-sm text-slate-500 mb-4">Bạn cảm thấy thế nào lúc này?</p>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {([
                  { id: 'happy',   emoji: '🤩', label: 'Vui vẻ',   bg: '#fef9c3', selBg: '#fde68a', ring: '#fbbf24' },
                  { id: 'fatigue', emoji: '😫', label: 'Mệt mỏi',  bg: '#eff6ff', selBg: '#dbeafe', ring: '#93c5fd' },
                  { id: 'cramps',  emoji: '😣', label: 'Đau bụng', bg: '#fff1f2', selBg: '#ffe4e6', ring: '#fda4af' },
                  { id: 'flow',    emoji: '🩸', label: 'Ra nhiều', bg: '#fff5f5', selBg: '#fee2e2', ring: '#f87171' },
                ] as const).map(({ id, emoji, label, bg, selBg, ring }) => {
                  const active = selectedSymptoms.has(id);
                  return (
                    <button
                      key={id}
                      onClick={() => toggleSymptom(id)}
                      className="flex flex-col items-center justify-center py-5 rounded-2xl transition-all duration-200 border-2"
                      style={{
                        background: active ? selBg : bg,
                        borderColor: active ? ring : 'transparent',
                        boxShadow: active ? `0 4px 16px ${ring}99` : '0 2px 8px rgba(0,0,0,0.04)',
                        transform: active ? 'scale(1.04)' : 'scale(1)',
                      }}
                    >
                      <span className="text-3xl mb-1.5">{emoji}</span>
                      <span className="text-xs font-bold text-slate-700">{label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPanel('symptoms')}
                className="mt-4 text-xs font-bold text-pink-500 hover:text-pink-600 transition-colors text-center py-1.5"
              >
                Ghi chi tiết →
              </button>
            </div>

            {/* ── 4. Hi AI advice (dark) ── */}
            <div className="bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col relative overflow-hidden text-white">
              <div
                className="absolute top-0 right-0 w-36 h-36 rounded-full blur-[60px] opacity-30 pointer-events-none"
                style={{ background: 'linear-gradient(135deg,#f9a8c9,#d4a8e8)' }}
              />
              <div className="flex items-center gap-2 mb-4 relative z-10">
                <span className="material-symbols-outlined text-pink-400 text-[22px]">auto_awesome</span>
                <h3 className="font-bold text-sm text-slate-200">Lời khuyên từ Hi AI</h3>
              </div>
              <div className="flex-grow flex flex-col justify-center relative z-10">
                <p className="text-base font-medium leading-snug mb-4">
                  {phase === 'Rụng trứng'
                    ? '"Estrogen đang ở mức cao nhất. Đây là thời điểm tuyệt vời để bắt đầu dự án mới và kết nối sâu hơn với người ấy!"'
                    : phase === 'Kinh nguyệt'
                    ? '"Hãy nghỉ ngơi và tự chăm sóc bản thân. Nhiệt và trà gừng sẽ giúp bạn cảm thấy dễ chịu hơn."'
                    : '"Giai đoạn này rất tốt để học điều mới và giao tiếp xã hội. Năng lượng của bạn đang tăng dần!"'}
                </p>
                <button
                  onClick={() => setPanel('chat')}
                  className="text-xs font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
                >
                  Hỏi Hi AI thêm <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* ── 5. Emotion chart (md col-span-2) ── */}
            <div className="md:col-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/80">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500 text-[22px]">bar_chart</span>
                  Biểu đồ cảm xúc tuần này
                </h3>
                <select className="bg-gray-50 border-none text-xs font-bold rounded-lg py-1 px-3 text-slate-600 cursor-pointer hover:bg-gray-100 outline-none">
                  <option>7 ngày qua</option>
                  <option>30 ngày qua</option>
                </select>
              </div>
              <div className="h-36 w-full flex items-end justify-between gap-2 px-2">
                {getWeekBars().map(({ day, h, cls, active }) => (
                  <div key={day} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
                    <div
                      className={`relative w-full bg-gray-100 rounded-t-xl rounded-b-sm h-32 flex items-end overflow-hidden ${
                        active ? 'ring-2 ring-pink-400 ring-offset-2' : ''
                      }`}
                    >
                      <div className={`w-full ${cls} transition-colors rounded-t-xl`} style={{ height: h }} />
                    </div>
                    <span className={`text-[10px] font-bold text-center whitespace-pre ${active ? 'text-slate-900' : 'text-slate-400'}`}>
                      {day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 6. Mini Calendar ── */}
            <div className="md:col-span-2 bg-yellow-50/50 rounded-3xl p-6 shadow-sm border border-yellow-100">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-[22px]">calendar_month</span>
                  Lịch chu kỳ — {monthLabel}
                </h3>
                <Link to="/calendar" className="text-xs font-bold text-slate-500 hover:text-pink-500 transition-colors">
                  Xem toàn bộ
                </Link>
              </div>
              <div className="flex justify-between items-center gap-2 mb-4">
                <button className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-slate-400">chevron_left</span>
                </button>
                <div className="flex-1 grid grid-cols-7 gap-1 text-center">
                  {['H', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="text-[10px] uppercase font-bold text-slate-400 mb-2">{d}</div>
                  ))}
                  {[10, 11, 12, 13, 14, 15, 16].map((d) => {
                    const isToday = d === cycleDay;
                    const isFertile = d >= 13 && d <= 16;
                    const isSafe = d === 12 || d === 13;
                    return (
                      <div
                        key={d}
                        className={`h-8 flex items-center justify-center rounded-lg text-sm transition-all
                          ${d <= 11 ? 'text-slate-400' : ''}
                          ${isSafe ? 'text-slate-800 bg-white shadow-sm border border-yellow-100' : ''}
                          ${isToday ? 'font-bold text-white shadow-lg' : ''}
                          ${!isToday && isFertile && !isSafe ? 'text-slate-800 border border-pink-200 bg-pink-50' : ''}
                        `}
                        style={isToday ? { background: 'linear-gradient(135deg,#f9a8c9,#d4a8e8)' } : undefined}
                      >
                        {d}
                      </div>
                    );
                  })}
                </div>
                <button className="p-1 hover:bg-white/50 rounded-full transition-colors">
                  <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500 justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" /> Rụng trứng
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white border border-yellow-200 inline-block" /> An toàn
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Kinh nguyệt
                </div>
              </div>
            </div>

            {/* ── 7. Community FAQ (full width) ── */}
            <div className="md:col-span-4 bg-white/90 backdrop-blur-sm rounded-3xl p-7 shadow-sm border border-white/80">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">Câu hỏi thường gặp</h3>
                  <p className="text-slate-500 text-sm">Cộng đồng đang thảo luận gì?</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-400">Chủ đề hot:</span>
                  {['#ChuKy', '#SucKhoe', '#TinhYeu'].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-slate-600 cursor-pointer hover:bg-pink-50 hover:text-pink-600 transition-colors"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    cat: 'Sức khỏe',
                    q: 'Tại sao tôi cảm thấy đau lưng khi rụng trứng?',
                    desc: 'Đau lưng giữa chu kỳ thường do sự thay đổi nội tiết tố và nang trứng vỡ ra...',
                  },
                  {
                    cat: 'Dinh dưỡng',
                    q: 'Thực phẩm nên ăn để tăng khả năng thụ thai?',
                    desc: 'Các loại đậu, rau lá xanh đậm và chất béo lành mạnh là chìa khóa...',
                  },
                ].map(({ cat, q, desc }) => (
                  <button
                    key={q}
                    onClick={() => { setChatInput(q); setPanel('chat'); }}
                    className="group p-4 rounded-2xl bg-gray-50 hover:bg-pink-50/50 border border-transparent hover:border-pink-100 transition-all cursor-pointer text-left w-full"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2 py-1 bg-white rounded-md text-[10px] font-bold text-pink-500 shadow-sm border border-pink-100">
                        {cat}
                      </span>
                      <span className="material-symbols-outlined text-slate-300 group-hover:text-pink-400 transition-colors text-[18px]">
                        arrow_outward
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 mb-1 group-hover:text-pink-600 transition-colors text-sm">{q}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{desc}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPanel('chat')}
                className="block w-full mt-5 py-3 border border-gray-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-pink-50 hover:border-pink-200 hover:text-pink-600 transition-all text-center"
              >
                Khám phá thêm cùng Hi AI
              </button>
            </div>

            {/* ── 8. Upgrade Plans (full width) ── */}
            <div className="md:col-span-4 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#fdf2f8 0%,#ede9fe 50%,#e0f2fe 100%)' }}>
              {/* Decorative blobs */}
              <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle,#f9a8d4,transparent)' }} />
              <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle,#c4b5fd,transparent)' }} />

              <div className="relative z-10 px-7 pt-7 pb-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-7">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[22px]" style={{ color: '#f472b6' }}>workspace_premium</span>
                      <h3 className="text-xl font-extrabold text-slate-900">Nâng cấp trải nghiệm của bạn</h3>
                    </div>
                    <p className="text-slate-500 text-sm">Chọn gói phù hợp để mở khoá toàn bộ tính năng Hi ✨</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/70 backdrop-blur-sm rounded-full px-4 py-2 border border-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    <span className="text-xs font-bold text-slate-600">Ưu đãi tháng 3 — Tiết kiệm 30%</span>
                  </div>
                </div>

                {/* Plans */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* Free plan */}
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
                    <div className="flex items-end gap-1 mb-5">
                      <span className="text-3xl font-extrabold text-slate-800">Miễn phí</span>
                    </div>
                    <ul className="space-y-2.5 flex-1 mb-6">
                      {[
                        'Theo dõi chu kỳ cơ bản',
                        'Nhật ký triệu chứng',
                        'Lịch chu kỳ 3 tháng',
                        'Hi AI (5 câu hỏi / ngày)',
                        'Đồng bộ & chia sẻ với đối tác',
                      ].map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                          <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-slate-400 text-[14px]">check</span>
                          </span>
                          {f}
                        </li>
                      ))}
                      {[
                        'Phân tích sức khoẻ chuyên sâu',
                        'Báo cáo PDF hàng tháng',
                      ].map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-400 line-through">
                          <span className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-slate-300 text-[14px]">close</span>
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 cursor-default border border-slate-200">
                      Đang sử dụng
                    </button>
                  </div>

                  {/* Premium plan */}
                  <div className="rounded-2xl p-6 flex flex-col relative overflow-hidden border border-pink-200/60 shadow-lg" style={{ background: 'linear-gradient(150deg,#fff0f8,#f5f0ff,#ede9fe)' }}>
                    {/* Popular badge */}
                    <div
                      className="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-extrabold text-white uppercase tracking-widest"
                      style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}
                    >
                      Phổ biến nhất ⭐
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: '#f472b6' }}>Gói đề xuất</p>
                        <h4 className="text-xl font-extrabold text-slate-900">Premium</h4>
                      </div>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}>
                        <span className="material-symbols-outlined text-white text-[26px]">workspace_premium</span>
                      </div>
                    </div>

                    <div className="flex items-end gap-1.5 mb-1">
                      <span className="text-3xl font-extrabold text-slate-900">29.000₫</span>
                      <span className="text-sm font-bold text-slate-400 mb-1">/ tháng</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-5">Hoặc 290.000₫ / năm — <span className="font-bold text-emerald-500">tiết kiệm 17%</span></p>

                    <ul className="space-y-2.5 flex-1 mb-6">
                      {[
                        'Tất cả tính năng gói Thường',
                        'Phân tích sức khoẻ chuyên sâu AI',
                        'Hỏi Hi AI không giới hạn',
                        'Báo cáo sức khoẻ PDF hàng tháng',
                        'Nhắc nhở thông minh theo chu kỳ',
                        'Hỗ trợ ưu tiên 24/7',
                      ].map(f => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}>
                            <span className="material-symbols-outlined text-white text-[14px]">check</span>
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button
                      className="w-full py-3.5 rounded-xl text-sm font-extrabold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
                      style={{
                        background: 'linear-gradient(135deg,#f472b6,#a78bfa)',
                        boxShadow: '0 8px 24px rgba(244,114,182,0.40)',
                      }}
                    >
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

        {/* ── Footer ── */}
        <footer className="bg-white/60 border-t border-white/40 py-6 px-4 md:px-8 backdrop-blur-sm">
          <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-400">
            <p>© 2025 Hi Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-pink-500 transition-colors cursor-pointer">Privacy</span>
              <span className="hover:text-pink-500 transition-colors cursor-pointer">Help Center</span>
              <Link to="/settings" className="hover:text-pink-500 transition-colors">Settings</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* ═══ Panels ═══ */}

      {/* ── Panel 1: Cycle Editor ── */}
      <Panel open={panel === 'cycle'} onClose={close} title="Chỉnh sửa chu kỳ" icon="edit_calendar" iconBg="bg-pink-100 text-pink-500">

        {/* ─ Summary strip ─ */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)' }}>
          <div className="text-center">
            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest mb-0.5">Bắt đầu kỳ kinh</p>
            <p className="text-xl font-extrabold text-slate-800">
              {editStart ? `${editStart.slice(8)}/${editStart.slice(5,7)}/${editStart.slice(0,4)}` : '--/--'}
            </p>
          </div>
          <div className="flex-1 flex flex-col items-center px-3">
            <div className="flex items-center w-full">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,#f472b6,#a78bfa)' }} />
              <span className="mx-2 text-xs font-extrabold text-violet-400">{editLen}n</span>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,#a78bfa,#f472b6)' }} />
            </div>
            <p className="text-[9px] text-slate-400 mt-1 font-medium">độ dài chu kỳ</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-0.5">Kỳ kinh tiếp</p>
            <p className="text-xl font-extrabold text-slate-800">
              {editStart ? (() => {
                const n = new Date(new Date(editStart + 'T00:00:00').getTime() + editLen * 86400000);
                return `${String(n.getDate()).padStart(2,'0')}/${String(n.getMonth()+1).padStart(2,'0')}`;
              })() : '--/--'}
            </p>
          </div>
        </div>

        {/* ─ Instruction ─ */}
        <div className="px-6 pt-4 pb-1">
          <p className="text-xs text-slate-500 font-medium">
            <span className="inline-block w-4 h-4 rounded-full mr-1.5 align-middle" style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }} />
            Nhấn vào ngày đầu tiên của kỳ kinh gần nhất
          </p>
        </div>

        {/* ─ Calendar ─ */}
        <div className="px-4 pb-3">
          {/* Month nav */}
          <div className="flex items-center justify-between py-3">
            <button
              onClick={editPrevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-slate-500"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-slate-800">{MONTHS_VN[editCalMonth]} {editCalYear}</span>
            <button
              onClick={editNextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-slate-500"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {CAL_DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-1">
            {(() => {
              const total = getDaysInMonth(editCalYear, editCalMonth);
              const first = getFirstDayMon(editCalYear, editCalMonth);
              const cells: (number | null)[] = Array(first).fill(null);
              for (let d = 1; d <= total; d++) cells.push(d);
              while (cells.length % 7 !== 0) cells.push(null);

              const startDate = editStart ? new Date(editStart + 'T00:00:00') : null;
              const todayStr = new Date().toISOString().slice(0, 10);

              return cells.map((day, idx) => {
                if (!day) return <div key={idx} />;

                const dStr = `${editCalYear}-${String(editCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isSelected = dStr === editStart;
                const isToday = dStr === todayStr;

                let cycleDayNum = -1;
                if (startDate) {
                  const cellDate = new Date(editCalYear, editCalMonth, day);
                  const diff = Math.floor((cellDate.getTime() - startDate.getTime()) / 86400000);
                  if (diff >= 0) cycleDayNum = (diff % editLen) + 1;
                }

                const isPeriod = cycleDayNum >= 1 && cycleDayNum <= editPeriodLen;
                const isFollic = cycleDayNum > editPeriodLen && cycleDayNum < 13;
                const isOvul   = cycleDayNum >= 13 && cycleDayNum <= 16;
                const isLuteal = cycleDayNum > 16 && cycleDayNum <= editLen;

                let bgStyle: React.CSSProperties = {};
                let extraCls = 'text-slate-700 hover:bg-pink-50';

                if (isSelected) {
                  bgStyle = { background: 'linear-gradient(135deg,#f472b6,#a78bfa)' };
                  extraCls = 'text-white shadow-md';
                } else if (isPeriod) {
                  bgStyle = { background: 'rgba(251,113,133,0.20)' };
                  extraCls = 'text-rose-500 font-semibold';
                } else if (isOvul) {
                  bgStyle = { background: 'rgba(52,211,153,0.22)' };
                  extraCls = 'text-emerald-600 font-semibold';
                } else if (isFollic) {
                  bgStyle = { background: 'rgba(252,211,77,0.25)' };
                  extraCls = 'text-amber-600 font-semibold';
                } else if (isLuteal) {
                  bgStyle = { background: 'rgba(167,139,250,0.20)' };
                  extraCls = 'text-violet-500 font-semibold';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => setEditStart(dStr)}
                    className={`h-9 w-full flex items-center justify-center text-xs rounded-xl transition-all duration-150 ${
                      isToday && !isSelected ? 'ring-2 ring-pink-400 ring-offset-1' : ''
                    } ${extraCls}`}
                    style={Object.keys(bgStyle).length ? bgStyle : undefined}
                  >
                    {day}
                  </button>
                );
              });
            })()}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 pb-1 flex-wrap justify-center">
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'rgba(251,113,133,0.55)' }} />Kinh nguyệt
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'rgba(252,211,77,0.7)' }} />Nang trứng
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'rgba(52,211,153,0.55)' }} />Rụng trứng
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'rgba(167,139,250,0.55)' }} />Hoàng thể
            </span>
          </div>
        </div>

        {/* ─ Sliders ─ */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-5">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Độ dài chu kỳ lúc trước</label>
              <span className="text-sm font-extrabold text-pink-500">{editLen} ngày</span>
            </div>
            <input
              type="range" min={21} max={40} value={editLen}
              onChange={e => setEditLen(+e.target.value)}
              className="w-full h-2 rounded-full cursor-pointer appearance-none"
              style={{ accentColor: '#f472b6' }}
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>21</span><span>40</span></div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Số ngày kinh nguyệt kỳ trước</label>
              <span className="text-sm font-extrabold text-rose-500">{editPeriodLen} ngày</span>
            </div>
            <input
              type="range" min={2} max={8} value={editPeriodLen}
              onChange={e => setEditPeriodLen(+e.target.value)}
              className="w-full h-2 rounded-full cursor-pointer appearance-none"
              style={{ accentColor: '#fb7185' }}
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>2</span><span>8</span></div>
          </div>
        </div>

        {/* ─ Save ─ */}
        <div className="px-6 pb-8">
          <button
            onClick={saveCycle}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 text-white"
            style={{ background: cycleSaved ? '#22c55e' : 'linear-gradient(135deg,#f472b6,#a78bfa)', boxShadow: cycleSaved ? 'none' : '0 8px 24px rgba(244,114,182,0.35)' }}
          >
            <span className="material-symbols-outlined">{cycleSaved ? 'check_circle' : 'save'}</span>
            {cycleSaved ? 'Đã lưu!' : 'Lưu chu kỳ'}
          </button>
        </div>

      </Panel>

      {/* ── Panel 2: Symptoms ── */}
      <Panel open={panel === 'symptoms'} onClose={close} title="Ghi triệu chứng" icon="monitor_heart" iconBg="bg-rose-100 text-rose-500">
        <div style={{ background: 'linear-gradient(160deg,#fff5f9 0%,#f8f4ff 100%)' }}>

          {/* Date context bar */}
          <div className="px-6 pt-4 pb-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold text-rose-400 uppercase tracking-widest">Hôm nay</p>
              <p className="text-sm font-bold text-slate-700">
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            {selectedSymptoms.size > 0 && (
              <div className="px-3 py-1.5 rounded-full text-xs font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#fb7185,#a78bfa)' }}>
                {selectedSymptoms.size} triệu chứng
              </div>
            )}
          </div>

          {/* Symptom grid */}
          <div className="px-5 pt-3 pb-4">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Chọn triệu chứng</p>
            <div className="grid grid-cols-3 gap-2.5">
              {SYMPTOMS_LIST.map(({ id, emoji, label, bg, selFrom, selTo }) => {
                const active = selectedSymptoms.has(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleSymptom(id)}
                    className="flex flex-col items-center justify-center py-4 rounded-2xl transition-all duration-200 relative overflow-hidden"
                    style={{
                      background: active
                        ? `linear-gradient(135deg,${selFrom},${selTo})`
                        : bg,
                      transform: active ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: active
                        ? `0 8px 20px ${selFrom}55`
                        : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    {active && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                        <span className="text-white text-[9px] font-black leading-none">✓</span>
                      </div>
                    )}
                    <span className="text-2xl mb-1.5" style={{ filter: active ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}>{emoji}</span>
                    <span className={`text-[10px] font-bold text-center leading-tight ${active ? 'text-white' : 'text-slate-600'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flow indicator */}
          <div className="px-5 pb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🩸</span>
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Lượng kinh</span>
                </div>
                <span className="text-sm font-extrabold" style={{ color: '#f472b6' }}>
                  {['', 'Rất ít', 'Ít', 'Vừa', 'Nhiều', 'Rất nhiều'][flow]}
                </span>
              </div>
              <div className="flex gap-1.5 mb-2">
                {[1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => setFlow(v)}
                    className="flex-1 h-3 rounded-full transition-all duration-300"
                    style={{
                      background: v <= flow
                        ? `linear-gradient(90deg,#fb7185,#f472b6,#a78bfa)`
                        : '#e5e7eb',
                      transform: v === flow ? 'scaleY(1.4)' : 'scaleY(1)',
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>Rất ít</span><span>Rất nhiều</span></div>
            </div>
          </div>

          {/* Note */}
          <div className="px-5 pb-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">📝</span>
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wide">Ghi chú thêm</span>
              </div>
              <textarea
                value={symptomNote}
                onChange={e => setSymptomNote(e.target.value)}
                placeholder="Cảm xúc, mức năng lượng, điều gì đó khác..."
                rows={3}
                className="w-full text-sm text-slate-700 resize-none outline-none bg-transparent placeholder-pink-200 leading-relaxed"
              />
            </div>
          </div>

          {/* Save */}
          <div className="px-5 pb-8">
            <button
              onClick={saveSymptoms}
              className="w-full py-4 rounded-2xl font-bold text-base text-white flex items-center justify-center gap-2 transition-all"
              style={{
                background: symptomSaved ? '#22c55e' : 'linear-gradient(135deg,#fb7185,#f472b6,#a78bfa)',
                boxShadow: symptomSaved ? 'none' : '0 10px 28px rgba(244,114,182,0.45)',
              }}
            >
              <span className="material-symbols-outlined">{symptomSaved ? 'check_circle' : 'favorite'}</span>
              {symptomSaved ? 'Đã lưu! 💕' : 'Lưu triệu chứng'}
            </button>
          </div>
        </div>
      </Panel>

      {/* ── Panel 3: Hi AI Chat ── */}
      <Panel open={panel === 'chat'} onClose={close} title="Hi AI Chat" icon="auto_awesome" iconBg="bg-purple-100 text-purple-500">
        <div className="flex flex-col h-full">

          {/* AI identity strip */}
          <div className="px-5 py-3 flex-shrink-0 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)' }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}>
                  <span className="material-symbols-outlined text-white text-[20px]">auto_awesome</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">Hi AI 🌸</p>
                <p className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  Sẵn sàng trò chuyện
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-medium">Hôm nay</p>
              <p className="text-[10px] font-bold text-pink-400">{phase} · Ngày {cycleDay}</p>
            </div>
          </div>

          {/* Suggestion chips */}
          <div className="px-4 py-2.5 flex gap-2 overflow-x-auto flex-shrink-0" style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f0ff)', borderBottom: '1px solid #fce7f3' }}>
            {AI_CHIPS.map(chip => (
              <button
                key={chip}
                onClick={() => sendMessage(chip)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg,#fce7f3,#ede9fe)', color: '#9333ea', border: '1px solid #e9d5ff' }}
              >
                ✨ {chip}
              </button>
            ))}
          </div>

          {/* Message list */}
          <div
            className="flex-1 overflow-y-auto px-4 py-5 space-y-4 min-h-0"
            style={{ background: 'linear-gradient(160deg,#fff9fb 0%,#f8f4ff 100%)' }}
          >
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div
                    className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                    style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}
                  >
                    <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                  </div>
                )}
                <div
                  className="max-w-[75%] px-4 py-3 text-sm font-medium leading-relaxed rounded-2xl"
                  style={msg.role === 'user' ? {
                    background: 'linear-gradient(135deg,#312e81,#4c1d95)',
                    color: '#f3e8ff',
                    borderBottomRightRadius: 4,
                    boxShadow: '0 4px 14px rgba(76,29,149,0.30)',
                  } : {
                    background: 'linear-gradient(135deg,#fff0f8,#f5f0ff)',
                    color: '#581c87',
                    borderBottomLeftRadius: 4,
                    boxShadow: '0 4px 14px rgba(244,114,182,0.15)',
                  }}
                >
                  {msg.text}
                  {msg.product && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-pink-100 bg-white shadow-md">
                      <img
                        src={msg.product.image}
                        alt={msg.product.name}
                        className="w-full h-36 object-cover"
                      />
                      <div className="p-3">
                        <p className="font-bold text-slate-800 text-sm leading-snug mb-1">{msg.product.name}</p>
                        <p className="text-xs text-slate-500 mb-2">{msg.product.desc}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-extrabold text-rose-500">{msg.product.price}</span>
                          <a
                            href={msg.product.shopeeUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 active:opacity-80"
                            style={{ background: 'linear-gradient(135deg,#f97316,#ee4d2d)' }}
                          >
                            🛒 Mua trên Shopee
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex-shrink-0 flex items-center justify-center border border-violet-200">
                    <span className="material-symbols-outlined text-violet-400 text-[16px]">person</span>
                  </div>
                )}
              </div>
            ))}

            {aiTyping && (
              <div className="flex items-end gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#f472b6,#a78bfa)' }}
                >
                  <span className="material-symbols-outlined text-white text-[15px]">auto_awesome</span>
                </div>
                <div
                  className="px-4 py-3 rounded-2xl flex gap-1.5 items-center"
                  style={{ background: 'linear-gradient(135deg,#fff0f8,#f5f0ff)', borderBottomLeftRadius: 4 }}
                >
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f472b6', animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#c084fc', animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#818cf8', animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatBottom} />
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 flex-shrink-0" style={{ background: 'white', borderTop: '1px solid #fce7f3' }}>
            <div
              className="flex gap-2 items-end rounded-2xl px-1 py-1"
              style={{ background: 'linear-gradient(135deg,#fff5f8,#f8f0ff)', border: '1.5px solid #e9d5ff' }}
            >
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Hỏi Hi AI về chu kỳ của bạn..."
                rows={1}
                className="flex-1 px-3 py-2.5 bg-transparent text-slate-800 text-sm resize-none outline-none max-h-28 leading-relaxed"
                style={{ caretColor: '#f472b6' }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                style={{
                  background: chatInput.trim()
                    ? 'linear-gradient(135deg,#f472b6,#a78bfa)'
                    : '#e5e7eb',
                  boxShadow: chatInput.trim() ? '0 4px 14px rgba(244,114,182,0.45)' : 'none',
                }}
              >
                <span className="material-symbols-outlined text-white text-[18px]">send</span>
              </button>
            </div>
            <p className="text-center text-[10px] text-slate-300 mt-1.5 font-medium">Enter để gửi · Shift+Enter xuống dòng</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
