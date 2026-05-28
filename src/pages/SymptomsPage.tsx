import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import api from '../lib/api';
import { Symptom } from '../types';

interface SymptomForm {
  name: string;
  severity: number;
  date: string;
  notes: string;
}

const COMMON_SYMPTOMS = ['Đau bụng', 'Đau đầu', 'Mệt mỏi', 'Buồn nôn', 'Đầy hơi', 'Đau lưng', 'Chóng mặt', 'Tâm trạng thay đổi'];
const SEVERITY_GRADIENTS = ['from-emerald-400 to-teal-400', 'from-sky-400 to-blue-400', 'from-amber-400 to-orange-400', 'from-rose-400 to-pink-500', 'from-fuchsia-500 to-purple-500'];

const severityLabel = (severity: number) => ['', 'Rất nhẹ', 'Nhẹ', 'Vừa', 'Nặng', 'Rất nặng'][severity];
const severityColor = (severity: number): 'success' | 'info' | 'warning' | 'period' => {
  if (severity <= 1) return 'success';
  if (severity <= 2) return 'info';
  if (severity <= 3) return 'warning';
  return 'period';
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SymptomsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const isMale = user?.gender === 'male';
  const accent = isMale
    ? {
        text: 'text-blue-500',
        softText: 'text-blue-600',
        softBg: 'bg-blue-50',
        softHover: 'hover:bg-blue-50',
        border: 'border-blue-200',
        blob: 'bg-blue-200/50',
        iconBg: 'from-blue-100 to-indigo-100',
        heroSoft: 'from-blue-50 to-indigo-50',
        button: 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 focus:ring-blue-300',
        range: 'accent-blue-500',
      }
    : {
        text: 'text-rose-400',
        softText: 'text-pink-600',
        softBg: 'bg-pink-50',
        softHover: 'hover:bg-pink-50',
        border: 'border-pink-300',
        blob: 'bg-rose-200/50',
        iconBg: 'from-pink-100 to-violet-100',
        heroSoft: 'from-pink-50 to-rose-50',
        button: '',
        range: 'accent-rose-500',
      };
  const { register, handleSubmit, setValue, watch, reset } = useForm<SymptomForm>({
    defaultValues: { severity: 3, date: new Date().toISOString().split('T')[0], notes: '' },
  });
  const severity = watch('severity');
  const selectedName = watch('name');

  const { data: symptoms = [], isLoading } = useQuery<Symptom[]>({
    queryKey: ['symptoms'],
    queryFn: () => api.get('/symptoms').then((r) => r.data.symptoms),
  });

  const { mutate: createSymptom, isPending } = useMutation({
    mutationFn: (data: SymptomForm) => api.post('/symptoms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms'] });
      toast.success('Đã ghi triệu chứng!');
      reset({ severity: 3, date: new Date().toISOString().split('T')[0], notes: '', name: '' });
      setOpen(false);
    },
    onError: () => toast.error('Thêm triệu chứng thất bại'),
  });

  const { mutate: deleteSymptom } = useMutation({
    mutationFn: (id: string) => api.delete(`/symptoms/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['symptoms'] });
      toast.success('Đã xóa');
    },
  });

  const grouped = useMemo(() => {
    return symptoms.reduce((acc: Record<string, Symptom[]>, symptom) => {
      const date = formatDate(symptom.date);
      (acc[date] = acc[date] || []).push(symptom);
      return acc;
    }, {});
  }, [symptoms]);

  const avgSeverity = symptoms.length
    ? (symptoms.reduce((total, symptom) => total + symptom.severity, 0) / symptoms.length).toFixed(1)
    : '0';
  const latestSymptom = symptoms[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
        <div className={clsx('pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl', accent.blob)} />
        <div className="pointer-events-none absolute left-1/3 top-16 h-44 w-44 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className={clsx('material-symbols-outlined text-[20px]', accent.text)}>monitor_heart</span>
              <span>Nhật ký cơ thể</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Triệu chứng hôm nay</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
              Ghi lại cảm giác cơ thể theo ngày để dashboard và Hi AI hiểu bạn chính xác hơn.
            </p>
          </div>
          <Button onClick={() => setOpen(true)} className={clsx('w-full lg:w-auto', accent.button)}>
            <span className="material-symbols-outlined mr-2 text-[18px]">add</span>
            Ghi triệu chứng
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { icon: 'history', label: 'Tổng ghi nhận', value: `${symptoms.length}`, bg: accent.heroSoft, color: isMale ? 'text-blue-500' : 'text-pink-500' },
          { icon: 'speed', label: 'Mức độ TB', value: avgSeverity, bg: 'from-amber-50 to-orange-50', color: 'text-amber-500' },
          { icon: 'event_available', label: 'Gần nhất', value: latestSymptom ? formatDate(latestSymptom.date) : 'Chưa có', bg: 'from-emerald-50 to-teal-50', color: 'text-emerald-500' },
        ].map((stat) => (
          <Card key={stat.label} className={`border-white/80 bg-gradient-to-br ${stat.bg} shadow-sm`}>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                <span className={`material-symbols-outlined text-[24px] ${stat.color}`}>{stat.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="truncate text-lg font-extrabold text-slate-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Card className="py-12">
          <Spinner />
        </Card>
      ) : symptoms.length === 0 ? (
        <Card className="overflow-hidden border-white/80 bg-white/90 px-6 py-12 text-center shadow-sm">
          <div className={clsx('mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br', accent.iconBg, accent.softText)}>
            <span className="material-symbols-outlined text-[32px]">edit_note</span>
          </div>
          <p className="text-lg font-extrabold text-slate-900">Chưa có triệu chứng nào</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Bắt đầu bằng một ghi nhận nhỏ hôm nay. Những dữ liệu này sẽ giúp dự đoán chu kỳ và lời khuyên cá nhân hóa hơn.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-6">
            Ghi triệu chứng đầu tiên
          </Button>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, list]) => (
            <section key={date} className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">{date}</p>
                <span className={clsx('rounded-full px-3 py-1 text-xs font-bold', accent.softBg, accent.softText)}>{list.length} ghi nhận</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {list.map((symptom) => (
                  <div key={symptom._id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className={`h-12 w-1.5 rounded-full bg-gradient-to-b ${SEVERITY_GRADIENTS[Math.max(symptom.severity - 1, 0)]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-slate-800">{symptom.name}</span>
                        <Badge variant={severityColor(symptom.severity)} size="sm">{severityLabel(symptom.severity)}</Badge>
                      </div>
                      {symptom.notes && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{symptom.notes}</p>}
                    </div>
                    <button
                      onClick={() => deleteSymptom(symptom._id)}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-red-50 hover:text-red-400"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Ghi triệu chứng"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
            <Button form="sym-form" type="submit" loading={isPending}>Lưu</Button>
          </div>
        }
      >
        <form id="sym-form" onSubmit={handleSubmit((data) => createSymptom(data))} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Triệu chứng</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((symptom) => (
                <button
                  key={symptom}
                  type="button"
                  onClick={() => setValue('name', symptom)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                    selectedName === symptom
                      ? clsx(accent.border, accent.softBg, accent.softText)
                      : clsx('border-slate-200 bg-white text-slate-500', isMale ? 'hover:border-blue-200 hover:bg-blue-50' : 'hover:border-pink-200 hover:bg-pink-50')
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
            <Input placeholder="Hoặc nhập tên triệu chứng..." {...register('name', { required: true })} />
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">Mức độ</label>
              <span className={clsx('text-sm font-extrabold', accent.softText)}>{severityLabel(Number(severity))}</span>
            </div>
            <input type="range" min={1} max={5} step={1} className={clsx('w-full', accent.range)} {...register('severity', { valueAsNumber: true })} />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>Rất nhẹ</span>
              <span>Rất nặng</span>
            </div>
          </div>

          <Input label="Ngày" type="date" {...register('date')} />
          <Input label="Ghi chú" placeholder="Thêm mô tả ngắn..." {...register('notes')} />
        </form>
      </Modal>
    </div>
  );
}
