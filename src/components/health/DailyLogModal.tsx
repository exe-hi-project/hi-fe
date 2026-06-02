import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { DailyLog, FlowIntensity, SymptomCategory, SymptomDictionary, UpsertDailyLogDto } from '@hi/shared';
import api from '../../lib/api';
import ResponsiveModal from '../ui/ResponsiveModal';

export type DailyLogMode = 'default' | 'periodStart';

interface DailyLogModalProps {
  open: boolean;
  mode: DailyLogMode;
  onClose: () => void;
  onSaved: () => void;
}

interface SymptomGroup {
  category: SymptomCategory;
  title: string;
  description: string;
  icon: string;
  accentClassName: string;
  singleSelect?: boolean;
}

const FLOW_OPTIONS: Array<{ value: FlowIntensity; label: string; icon: string }> = [
  { value: 'NONE', label: 'Không có', icon: 'water_drop' },
  { value: 'LIGHT', label: 'Ít', icon: 'water_drop' },
  { value: 'MEDIUM', label: 'Vừa', icon: 'humidity_mid' },
  { value: 'HEAVY', label: 'Nhiều', icon: 'humidity_high' },
];

const GROUPS: SymptomGroup[] = [
  { category: 'EMOTIONAL', title: 'Tâm trạng', description: 'Bạn có thể chọn nhiều cảm xúc trong ngày.', icon: 'mood', accentClassName: 'text-amber-500 bg-amber-50' },
  { category: 'PHYSICAL', title: 'Triệu chứng cơ thể', description: 'Ghi lại các dấu hiệu bạn đang cảm nhận.', icon: 'monitor_heart', accentClassName: 'text-rose-500 bg-rose-50' },
  { category: 'OTHER', title: 'Tiêu hóa', description: 'Các thay đổi tiêu hóa thường gặp trong chu kỳ.', icon: 'gastroenterology', accentClassName: 'text-fuchsia-500 bg-fuchsia-50' },
  { category: 'FLUID', title: 'Tiết dịch âm đạo', description: 'Chọn mô tả phù hợp nhất trong ngày.', icon: 'water_drop', accentClassName: 'text-violet-500 bg-violet-50', singleSelect: true },
];

const COMMON_NAMES = ['Đau bụng', 'Mệt mỏi', 'Đầy hơi', 'Đau đầu', 'Ngực đau', 'Mất ngủ'];

const ICON_BY_NAME: Record<string, string> = {
  'Đau bụng': 'sick',
  'Đau đầu': 'neurology',
  'Mệt mỏi': 'battery_low',
  'Đầy hơi': 'air',
  'Nổi mụn': 'dermatology',
  'Đau lưng': 'accessibility_new',
  'Ngực đau': 'favorite',
  'Buồn nôn': 'sentiment_dissatisfied',
  'Mất ngủ': 'bedtime',
  'Chóng mặt': 'motion_blur',
  'Thèm ăn': 'restaurant',
  'Ngứa âm đạo': 'medical_services',
  'Khô âm đạo': 'water_drop',
};

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function fromIsoDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(value: string, amount: number) {
  const date = fromIsoDate(value);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount));
}

function formatDate(value: string) {
  return fromIsoDate(value).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getIcon(symptom: SymptomDictionary) {
  if (symptom.category === 'EMOTIONAL') return 'mood';
  if (symptom.category === 'FLUID') return 'water_drop';
  if (symptom.category === 'OTHER') return 'gastroenterology';
  return ICON_BY_NAME[symptom.name] ?? 'monitor_heart';
}

export default function DailyLogModal({ open, mode, onClose, onSaved }: DailyLogModalProps) {
  const queryClient = useQueryClient();
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<number>>(new Set());
  const [flowIntensity, setFlowIntensity] = useState<FlowIntensity>('NONE');
  const [hasClots, setHasClots] = useState(false);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedDate(today);
      setSearch('');
    }
  }, [open, today]);

  const dictionaryQuery = useQuery<SymptomDictionary[]>({
    queryKey: ['symptom-dictionaries'],
    queryFn: () => api.get('/symptom-dictionaries').then(({ data }) => data.symptoms ?? []),
    enabled: open,
  });

  const logQuery = useQuery<DailyLog | null>({
    queryKey: ['daily-log', selectedDate],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/daily-logs/${selectedDate}`);
        return data.dailyLog as DailyLog;
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404)) return null;
        throw error;
      }
    },
    enabled: open,
    retry: false,
  });

  useEffect(() => {
    if (!open || logQuery.isLoading || logQuery.isFetching) return;
    const log = logQuery.data;
    setFlowIntensity(log?.flowIntensity ?? 'NONE');
    setHasClots(log?.hasClots ?? false);
    setNotes(log?.notes ?? '');
    setSelectedSymptoms(new Set(log?.symptoms?.map((symptom) => symptom.symptomId) ?? []));
  }, [logQuery.data, logQuery.isFetching, logQuery.isLoading, open, selectedDate]);

  const dictionary = dictionaryQuery.data ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase('vi-VN');
  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    symptoms: dictionary.filter((symptom) => symptom.category === group.category && (!normalizedSearch || symptom.name.toLocaleLowerCase('vi-VN').includes(normalizedSearch))),
  })).filter((group) => group.symptoms.length > 0);
  const commonSymptoms = COMMON_NAMES
    .map((name) => dictionary.find((symptom) => symptom.name === name))
    .filter((symptom): symptom is SymptomDictionary => !!symptom);

  const toggleSymptom = (symptom: SymptomDictionary) => {
    setSelectedSymptoms((current) => {
      const next = new Set(current);
      if (next.has(symptom.id)) {
        next.delete(symptom.id);
        return next;
      }
      if (symptom.category === 'FLUID') {
        dictionary.filter((item) => item.category === 'FLUID').forEach((item) => next.delete(item.id));
      }
      next.add(symptom.id);
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === 'periodStart' && flowIntensity === 'NONE') {
        throw new Error('Hãy chọn lượng kinh để xác nhận kỳ kinh bắt đầu hôm nay.');
      }
      if (flowIntensity === 'NONE' && !hasClots && selectedSymptoms.size === 0 && !notes.trim()) {
        throw new Error('Hãy chọn ít nhất một thông tin trước khi lưu nhật ký.');
      }
      const payload: UpsertDailyLogDto = {
        flowIntensity,
        hasClots,
        confirmPeriodStart: mode === 'periodStart',
        notes: notes.trim(),
        symptoms: Array.from(selectedSymptoms).map((symptomId) => ({ symptomId, severity: 'MILD' })),
      };
      await api.put(`/daily-logs/${selectedDate}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['daily-log', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['cycle-insights'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success('Đã lưu nhật ký sức khỏe');
      onSaved();
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu nhật ký sức khỏe');
    },
  });

  const footer = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50">
        Hủy
      </button>
      <button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || (mode === 'periodStart' && flowIntensity === 'NONE')}
        className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saveMutation.isPending ? 'Đang lưu...' : mode === 'periodStart' ? 'Xác nhận bắt đầu kỳ' : 'Lưu nhật ký'}
      </button>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={mode === 'periodStart' ? 'Bắt đầu kỳ hôm nay' : 'Nhật ký sức khỏe'}
      description={mode === 'periodStart' ? 'Ghi lượng kinh thực tế để xác nhận Ngày 1 của kỳ mới.' : 'Chọn những thay đổi bạn ghi nhận trong ngày.'}
      icon="monitor_heart"
      maxWidthClassName="sm:max-w-5xl"
      bodyClassName="bg-slate-50/80"
      footer={footer}
    >
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            disabled={mode === 'periodStart'}
            className="flex size-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-rose-50 disabled:opacity-25"
            aria-label="Ngày trước"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-500">{selectedDate === today ? 'Hôm nay' : 'Nhật ký ngày'}</p>
            <p className="mt-1 text-sm font-extrabold capitalize text-slate-800">{formatDate(selectedDate)}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            disabled={mode === 'periodStart' || selectedDate >= today}
            className="flex size-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-rose-50 disabled:opacity-25"
            aria-label="Ngày sau"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        {mode === 'default' && (
          <div className="mt-3 flex justify-center">
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 outline-none transition-colors focus:border-rose-300"
              aria-label="Chọn ngày nhật ký"
            />
          </div>
        )}
        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <span className="material-symbols-outlined text-[20px] text-slate-400">search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm triệu chứng"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6">
        {logQuery.isLoading || dictionaryQuery.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-3xl bg-white" />)}
          </div>
        ) : (
          <>
            {!search && commonSymptoms.length > 0 && (
              <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-rose-500">history</span>
                  <h3 className="text-sm font-extrabold text-slate-800">Thường ghi gần đây</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map((symptom) => <SymptomChip key={symptom.id} symptom={symptom} active={selectedSymptoms.has(symptom.id)} onClick={() => toggleSymptom(symptom)} />)}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start gap-2">
                <span className="material-symbols-outlined rounded-xl bg-rose-50 p-2 text-rose-500">water_drop</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Lượng kinh nguyệt</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Ước tính lượng kinh trung bình trong ngày.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {FLOW_OPTIONS.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    onClick={() => setFlowIntensity(option.value)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${flowIntensity === option.value ? 'border-rose-400 bg-rose-500 text-white' : 'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-300'}`}
                  >
                    <span className="material-symbols-outlined text-[17px]">{option.icon}</span>
                    {option.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setHasClots((current) => !current)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${hasClots ? 'border-rose-400 bg-rose-500 text-white' : 'border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-300'}`}
                >
                  <span className="material-symbols-outlined text-[17px]">bloodtype</span>
                  Cục máu đông
                </button>
              </div>
            </section>

            {visibleGroups.map((group) => (
              <section key={group.category} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start gap-2">
                  <span className={`material-symbols-outlined rounded-xl p-2 ${group.accentClassName}`}>{group.icon}</span>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">{group.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.symptoms.map((symptom) => <SymptomChip key={symptom.id} symptom={symptom} active={selectedSymptoms.has(symptom.id)} onClick={() => toggleSymptom(symptom)} />)}
                </div>
              </section>
            ))}

            {visibleGroups.length === 0 && search && (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300">search_off</span>
                <p className="mt-2 text-sm font-bold text-slate-600">Không tìm thấy triệu chứng phù hợp</p>
              </div>
            )}

            <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-500">edit_note</span>
                <h3 className="text-sm font-extrabold text-slate-800">Ghi chú</h3>
              </div>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Thêm cảm giác, triệu chứng khác hoặc điều bạn muốn nhớ..."
                className="w-full resize-none rounded-2xl bg-slate-50 px-3 py-3 text-sm leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-rose-200"
              />
            </section>
          </>
        )}
      </div>
    </ResponsiveModal>
  );
}

function SymptomChip({ symptom, active, onClick }: { symptom: SymptomDictionary; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-[0.98] ${active ? 'border-rose-400 bg-rose-500 text-white shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-rose-200 hover:bg-rose-50'}`}
    >
      <span className="material-symbols-outlined text-[17px]">{getIcon(symptom)}</span>
      {symptom.name}
    </button>
  );
}
