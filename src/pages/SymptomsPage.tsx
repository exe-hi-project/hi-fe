import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
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

const severityLabel = (s: number) => ['', 'Rất nhẹ', 'Nhẹ', 'Vừa', 'Nặng', 'Rất nặng'][s];
const severityColor = (s: number): 'success' | 'info' | 'warning' | 'period' => {
  if (s <= 1) return 'success';
  if (s <= 2) return 'info';
  if (s <= 3) return 'warning';
  return 'period';
};

export default function SymptomsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, setValue, watch, reset } = useForm<SymptomForm>({
    defaultValues: { severity: 3, date: new Date().toISOString().split('T')[0] },
  });
  const severity = watch('severity');

  const { data: symptoms = [], isLoading } = useQuery<Symptom[]>({
    queryKey: ['symptoms'],
    queryFn: () => api.get('/symptoms').then((r) => r.data.symptoms),
  });

  const { mutate: createSymptom, isPending } = useMutation({
    mutationFn: (data: SymptomForm) => api.post('/symptoms', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['symptoms'] });
      toast.success('Đã ghi triệu chứng!');
      reset({ severity: 3, date: new Date().toISOString().split('T')[0] });
      setOpen(false);
    },
    onError: () => toast.error('Thêm triệu chứng thất bại'),
  });

  const { mutate: deleteSymptom } = useMutation({
    mutationFn: (id: string) => api.delete(`/symptoms/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['symptoms'] }); toast.success('Đã xóa'); },
  });

  // Group by date
  const grouped = symptoms.reduce((acc: Record<string, Symptom[]>, s) => {
    const d = new Date(s.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' });
    (acc[d] = acc[d] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Triệu chứng 📝</h1>
          <p className="text-gray-500 text-sm mt-0.5">Ghi lại cảm giác cơ thể mỗi ngày</p>
        </div>
        <Button onClick={() => setOpen(true)}>+ Ghi triệu chứng</Button>
      </div>

      {isLoading ? (
        <Spinner className="py-8" />
      ) : symptoms.length === 0 ? (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">📝</div>
          <p className="font-semibold text-gray-700">Chưa có triệu chứng nào</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Hãy ghi lại cảm giác hôm nay</p>
          <Button onClick={() => setOpen(true)}>Ghi triệu chứng</Button>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, list]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{date}</p>
              <div className="space-y-2">
                {list.map((s) => (
                  <Card key={s._id} padding="sm" className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm">{s.name}</span>
                        <Badge variant={severityColor(s.severity)} size="sm">{severityLabel(s.severity)}</Badge>
                      </div>
                      {s.notes && <p className="text-xs text-gray-400 mt-0.5">{s.notes}</p>}
                    </div>
                    <button onClick={() => deleteSymptom(s._id!)} className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded">🗑️</button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Ghi triệu chứng"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
            <Button form="sym-form" type="submit" loading={isPending}>Lưu</Button>
          </div>
        }
      >
        <form id="sym-form" onSubmit={handleSubmit((d) => createSymptom(d))} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Triệu chứng</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMMON_SYMPTOMS.map((s) => (
                <button key={s} type="button" onClick={() => setValue('name', s)}
                  className="px-3 py-1 text-xs rounded-full border border-pink-200 text-rose-600 hover:bg-pink-50 transition-colors">
                  {s}
                </button>
              ))}
            </div>
            <Input placeholder="Hoặc nhập tên triệu chứng..." {...register('name', { required: true })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mức độ: <span className="text-rose-500 font-bold">{severityLabel(Number(severity))}</span>
            </label>
            <input type="range" min={1} max={5} step={1}
              className="w-full accent-rose-500"
              {...register('severity', { valueAsNumber: true })} />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Rất nhẹ</span><span>Rất nặng</span>
            </div>
          </div>
          <Input label="Ngày" type="date" {...register('date')} />
          <Input label="Ghi chú" placeholder="Thêm mô tả..." {...register('notes')} />
        </form>
      </Modal>
    </div>
  );
}
