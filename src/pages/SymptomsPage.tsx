import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import type { DailyLog, SymptomDictionary, SymptomSeverity } from '../types/shared';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import api from '../lib/api';

interface SymptomForm {
  symptomId: number;
  severity: number;
  date: string;
  notes: string;
}

interface SymptomView {
  key: string;
  symptomId: number;
  name: string;
  severity: SymptomSeverity;
  severityScore: number;
  date: string;
  notes?: string;
}

const severityScore = (severity: SymptomSeverity) => severity === 'MILD' ? 1 : severity === 'MODERATE' ? 3 : 5;
const toSeverity = (score: number): SymptomSeverity => score <= 2 ? 'MILD' : score === 3 ? 'MODERATE' : 'SEVERE';
const severityLabel = (score: number) => score <= 2 ? 'Nhẹ' : score === 3 ? 'Vừa' : 'Nặng';
const severityColor = (score: number): 'success' | 'warning' | 'period' => score <= 2 ? 'success' : score === 3 ? 'warning' : 'period';
const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });

export default function SymptomsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const isMale = user?.gender === 'male';
  const accent = isMale ? 'text-blue-500' : 'text-pink-500';
  const { register, handleSubmit, setValue, watch, reset } = useForm<SymptomForm>({
    defaultValues: { severity: 3, date: new Date().toISOString().slice(0, 10), notes: '' },
  });
  const selectedId = watch('symptomId');
  const severity = watch('severity');

  const { data: dictionaries = [] } = useQuery<SymptomDictionary[]>({
    queryKey: ['symptom-dictionaries'],
    queryFn: () => api.get('/symptom-dictionaries').then(({ data }) => data.symptoms ?? []),
  });
  const { data: logs = [], isLoading } = useQuery<DailyLog[]>({
    queryKey: ['daily-logs'],
    queryFn: () => api.get('/daily-logs').then(({ data }) => data.dailyLogs ?? []),
  });

  const symptoms = useMemo<SymptomView[]>(() => logs.flatMap((log) =>
    (log.symptoms ?? []).map((symptom) => ({
      key: `${log.logDate}-${symptom.symptomId}`,
      symptomId: symptom.symptomId,
      name: symptom.symptomName ?? `Triệu chứng #${symptom.symptomId}`,
      severity: symptom.severity,
      severityScore: severityScore(symptom.severity),
      date: log.logDate,
      notes: log.notes,
    }))
  ), [logs]);

  const grouped = useMemo(() => symptoms.reduce((acc: Record<string, SymptomView[]>, symptom) => {
    const date = formatDate(symptom.date);
    (acc[date] = acc[date] || []).push(symptom);
    return acc;
  }, {}), [symptoms]);

  const { mutate: createSymptom, isPending } = useMutation({
    mutationFn: (form: SymptomForm) => api.put(`/daily-logs/${form.date}/symptoms/${form.symptomId}`, {
      severity: toSeverity(form.severity),
      notes: form.notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-insights'] });
      toast.success('Đã ghi triệu chứng');
      reset({ severity: 3, date: new Date().toISOString().slice(0, 10), notes: '' });
      setOpen(false);
    },
    onError: () => toast.error('Thêm triệu chứng thất bại'),
  });

  const { mutate: deleteSymptom } = useMutation({
    mutationFn: (symptom: SymptomView) => api.delete(`/daily-logs/${symptom.date}/symptoms/${symptom.symptomId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-logs'] });
      queryClient.invalidateQueries({ queryKey: ['cycle-insights'] });
      toast.success('Đã xóa');
    },
  });

  const averageSeverity = symptoms.length
    ? (symptoms.reduce((total, item) => total + item.severityScore, 0) / symptoms.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className={clsx('material-symbols-outlined text-[20px]', accent)}>monitor_heart</span>
              <span>Nhật ký cơ thể</span>
            </div>
            <h1 className="hi-page-title text-3xl">Triệu chứng theo ngày</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Theo dõi xu hướng cơ thể để hiểu chu kỳ tốt hơn. Đây không phải chẩn đoán y khoa.</p>
          </div>
          <Button onClick={() => setOpen(true)}>Ghi triệu chứng</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { label: 'Tổng ghi nhận', value: `${symptoms.length}` },
          { label: 'Mức độ TB', value: averageSeverity },
          { label: 'Gần nhất', value: symptoms[0] ? formatDate(symptoms[0].date) : 'Chưa có' },
        ].map((stat) => (
          <Card key={stat.label} className="border-white/80 bg-white/90 shadow-sm">
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{stat.value}</p>
          </Card>
        ))}
      </div>

      {isLoading ? <Card className="py-12"><Spinner /></Card> : symptoms.length === 0 ? (
        <Card className="px-6 py-12 text-center">
          <p className="text-lg font-extrabold text-slate-900">Chưa có triệu chứng nào</p>
          <Button onClick={() => setOpen(true)} className="mt-6">Ghi triệu chứng đầu tiên</Button>
        </Card>
      ) : Object.entries(grouped).map(([date, items]) => (
        <section key={date} className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-slate-400">{date}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((symptom) => (
              <div key={symptom.key} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-slate-800">{symptom.name}</span>
                    <Badge variant={severityColor(symptom.severityScore)} size="sm">{severityLabel(symptom.severityScore)}</Badge>
                  </div>
                  {symptom.notes && <p className="mt-1 text-xs text-slate-400">{symptom.notes}</p>}
                </div>
                <button onClick={() => deleteSymptom(symptom)} className="text-slate-300 hover:text-red-400">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Modal open={open} onClose={() => setOpen(false)} title="Ghi triệu chứng" footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
          <Button form="symptom-form" type="submit" loading={isPending}>Lưu</Button>
        </div>
      }>
        <form id="symptom-form" onSubmit={handleSubmit((data) => createSymptom(data))} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Triệu chứng</label>
            <div className="flex flex-wrap gap-2">
              {dictionaries.map((item) => (
                <button key={item.id} type="button" onClick={() => setValue('symptomId', item.id, { shouldValidate: true })}
                  className={clsx('rounded-full border px-3 py-1.5 text-xs font-bold', selectedId === item.id ? 'border-pink-300 bg-pink-50 text-pink-600' : 'border-slate-200 text-slate-500')}>
                  {item.name}
                </button>
              ))}
            </div>
            <input type="hidden" {...register('symptomId', { required: true, valueAsNumber: true })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Mức độ: {severityLabel(Number(severity))}</label>
            <input type="range" min={1} max={5} className="w-full accent-rose-500" {...register('severity', { valueAsNumber: true })} />
          </div>
          <Input label="Ngày" type="date" {...register('date', { required: true })} />
          <Input label="Ghi chú" placeholder="Thêm mô tả ngắn..." {...register('notes')} />
        </form>
      </Modal>
    </div>
  );
}
