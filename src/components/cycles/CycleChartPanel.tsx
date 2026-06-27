import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import type { CycleInsights, CycleRecord } from '../../types/shared';

type Props =
  | {
      kind: 'trend';
      insights?: CycleInsights | null;
      avgLen: number;
      avgPeriod: number;
    }
  | {
      kind: 'length-bars';
      cycles: CycleRecord[];
    };

export default function CycleChartPanel(props: Props) {
  if (props.kind === 'trend') {
    const { insights, avgLen, avgPeriod } = props;
    const data = (insights?.cycleTrendPoints ?? []).slice(-8).map((point) => {
      const dateObj = new Date(`${point.startDate.slice(0, 10)}T00:00:00`);
      return {
        name: dateObj.toLocaleDateString('vi-VN', { month: 'short' }),
        'Chu kỳ': point.cycleLength ?? avgLen ?? 28,
        'Kinh nguyệt': point.periodLength ?? avgPeriod ?? 5,
        fullDate: dateObj.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }),
        isOutlier: point.outlier,
      };
    });

    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f472b6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
          <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const dataPoint = payload[0].payload;
                return (
                  <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-pink-100 text-xs font-bold text-slate-700">
                    <p className="text-slate-400 mb-1">{dataPoint.fullDate}</p>
                    <p className="flex items-center gap-1.5 text-pink-500">
                      <span className="w-2 h-2 rounded-full bg-pink-400" />
                      Chu kỳ: {dataPoint['Chu kỳ']} ngày
                    </p>
                    <p className="flex items-center gap-1.5 text-violet-500">
                      <span className="w-2 h-2 rounded-full bg-violet-400" />
                      Kinh nguyệt: {dataPoint['Kinh nguyệt']} ngày
                    </p>
                    {dataPoint.isOutlier && (
                      <p className="text-[10px] text-amber-500 mt-1 font-extrabold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        Chu kỳ bất thường
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area type="monotone" dataKey="Chu kỳ" stroke="#f472b6" strokeWidth={2} fillOpacity={1} fill="url(#trendGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  const data = [...props.cycles].reverse().slice(-6).map((cycle) => {
    const dateObj = new Date(cycle.startDate);
    return {
      name: dateObj.toLocaleDateString('vi-VN', { month: 'short' }),
      'Chu kỳ': cycle.cycleLength || 28,
      'Kinh nguyệt': cycle.periodLength || 5,
      fullDate: dateObj.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
        <RechartsTooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const dataPoint = payload[0].payload;
              return (
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-2xl shadow-lg border border-pink-100 text-xs font-bold text-slate-700">
                  <p className="text-slate-400 mb-1">Bắt đầu: {dataPoint.fullDate}</p>
                  <p className="flex items-center gap-1.5 text-pink-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-pink-400" />
                    Chu kỳ: {dataPoint['Chu kỳ']} ngày
                  </p>
                  <p className="flex items-center gap-1.5 text-rose-500">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-400" />
                    Kinh nguyệt: {dataPoint['Kinh nguyệt']} ngày
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="Chu kỳ" fill="#f472b6" radius={[4, 4, 0, 0]} maxBarSize={20} />
        <Bar dataKey="Kinh nguyệt" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
