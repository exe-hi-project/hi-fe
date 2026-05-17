import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../lib/api';

const TABS = ['Hồ sơ', 'AI & Cài đặt', 'Bạn đời'];

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cài đặt ⚙️</h1>
        <p className="text-gray-500 text-sm mt-0.5">Quản lý tài khoản và tuỳ chọn của bạn</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all duration-200 ${
              tab === i ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <ProfileTab />}
      {tab === 1 && <AITab />}
      {tab === 2 && <PartnerTab />}
    </div>
  );
}

function ProfileTab() {
  const { user, setUser } = useAuthStore();
  const { register, handleSubmit } = useForm({
    defaultValues: { name: user?.name ?? '', birthDate: user?.birthDate?.slice(0, 10) ?? '', height: user?.height ?? '', weight: user?.weight ?? '' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => api.put('/users/profile', data).then((r) => r.data.user),
    onSuccess: (user) => { setUser(user); toast.success('Đã cập nhật hồ sơ!'); },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  return (
    <Card>
      <CardHeader><CardTitle>Thông tin cá nhân</CardTitle></CardHeader>
      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <p className="text-xs mt-0.5 text-pink-500">{user?.gender === 'female' ? '👩 Nữ' : '👨 Nam'}</p>
          </div>
        </div>
        <Input label="Họ và tên" {...register('name')} />
        <Input label="Ngày sinh" type="date" {...register('birthDate')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Chiều cao (cm)" type="number" {...register('height', { valueAsNumber: true })} />
          <Input label="Cân nặng (kg)" type="number" {...register('weight', { valueAsNumber: true })} />
        </div>
        <Button type="submit" loading={isPending}>Lưu thay đổi</Button>
      </form>
    </Card>
  );
}

function AITab() {
  const { user, setUser } = useAuthStore();
  const { register, handleSubmit } = useForm({
    defaultValues: { aiPersonality: user?.aiPersonality ?? 'friendly', aiTone: user?.aiTone ?? 'casual' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: any) => api.put('/users/profile', data).then((r) => r.data.user),
    onSuccess: (user) => { setUser(user); toast.success('Đã cập nhật cài đặt AI!'); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Tuỳ chỉnh AI</CardTitle></CardHeader>
      <form onSubmit={handleSubmit((d) => mutate(d))} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tính cách AI</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'friendly', label: '😊 Thân thiện' },
              { value: 'professional', label: '👩‍⚕️ Chuyên nghiệp' },
              { value: 'empathetic', label: '🤗 Đồng cảm' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer hover:border-pink-200 transition-colors">
                <input type="radio" value={opt.value} {...register('aiPersonality')} className="accent-rose-500" />
                <span className="text-xs font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phong cách trả lời</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'casual', label: '💬 Thân mật' },
              { value: 'formal', label: '📋 Trang trọng' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer hover:border-pink-200 transition-colors">
                <input type="radio" value={opt.value} {...register('aiTone')} className="accent-rose-500" />
                <span className="text-xs font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
        <Button type="submit" loading={isPending}>Lưu cài đặt</Button>
      </form>
    </Card>
  );
}

function PartnerTab() {
  const { user, setUser } = useAuthStore();
  const [code, setCode] = useState('');
  const refreshProfile = async () => {
    const { data } = await api.get('/users/profile');
    return data.user;
  };

  const { mutate: connect, isPending: connecting } = useMutation({
    mutationFn: async () => {
      await api.post('/users/connect-partner', { partnerCode: code });
      return refreshProfile();
    },
    onSuccess: (u) => { setUser(u); toast.success('Kết nối thành công! 💑'); setCode(''); },
    onError: () => toast.error('Mã kết nối không đúng hoặc đã hết hạn'),
  });

  const { mutate: disconnect, isPending: disconnecting } = useMutation({
    mutationFn: async () => {
      await api.delete('/users/disconnect-partner');
      return refreshProfile();
    },
    onSuccess: (u) => { setUser(u); toast.success('Đã ngắt kết nối'); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Kết nối bạn đời 💑</CardTitle></CardHeader>
      <div className="space-y-5">
        {/* My partner code */}
        <div className="p-4 bg-pink-50 rounded-xl">
          <p className="text-xs text-gray-500 mb-1">Mã kết nối của bạn</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-rose-600 tracking-widest">{user?.partnerCode ?? '------'}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(user?.partnerCode ?? ''); toast.success('Đã sao chép!'); }}
              className="text-xs text-gray-400 hover:text-rose-500 transition-colors"
            >
              📋 Sao chép
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Chia sẻ mã này với bạn đời để kết nối</p>
        </div>

        {user?.partnerId ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
              <span className="text-2xl">💑</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Đang kết nối với bạn đời</p>
                <p className="text-xs text-gray-400">Bạn đang chia sẻ dữ liệu chu kỳ với bạn đời</p>
              </div>
            </div>
            <Button variant="danger" loading={disconnecting} onClick={() => disconnect()} fullWidth>
              Ngắt kết nối
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Nhập mã kết nối của bạn đời:</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã 6 ký tự"
                maxLength={6}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all"
              />
              <Button loading={connecting} disabled={code.length < 4} onClick={() => connect()}>
                Kết nối
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
