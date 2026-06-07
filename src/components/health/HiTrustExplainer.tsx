interface HiTrustExplainerProps {
  open: boolean;
  onClose: () => void;
  accent?: 'rose' | 'blue';
}

const items = [
  {
    title: 'Chu kỳ được tính từ dữ liệu đã xác nhận',
    body: 'Hi lấy khoảng cách giữa các ngày bắt đầu kỳ kinh đã ghi nhận thật. Dự đoán không được tự ghi thành kỳ mới.',
  },
  {
    title: 'Rụng trứng và cửa sổ thụ thai là ước tính',
    body: 'Mốc rụng trứng thường được ước tính khoảng 14 ngày trước kỳ tiếp theo. Cửa sổ thụ thai là khoảng 5 ngày trước đến 1 ngày sau rụng trứng.',
  },
  {
    title: 'Triệu chứng giúp phân tích xu hướng',
    body: 'Lượng kinh, tâm trạng và triệu chứng giúp Hi mô tả xu hướng theo phase, nhưng không tự xác nhận kỳ kinh và không dùng để chẩn đoán.',
  },
  {
    title: 'AI phân biệt dữ liệu và tham khảo',
    body: 'Hi AI chỉ dùng dữ liệu của bạn hoặc dữ liệu Người ấy đã chia sẻ. Dự đoán sức khỏe và gợi ý sản phẩm luôn là tham khảo, không thay thế bác sĩ.',
  },
];

export default function HiTrustExplainer({ open, onClose, accent = 'rose' }: HiTrustExplainerProps) {
  if (!open) return null;
  const gradient = accent === 'blue' ? 'from-sky-400 via-blue-500 to-violet-500' : 'from-sky-400 via-violet-500 to-pink-500';
  const soft = accent === 'blue' ? 'from-sky-50 to-blue-50' : 'from-pink-50 to-sky-50';

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/80 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className={`rounded-[1.6rem] bg-gradient-to-br ${soft} p-5`}>
          <span className={`inline-flex rounded-full bg-gradient-to-r ${gradient} px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg`}>
            Trust layer
          </span>
          <h2 className="hi-page-title mt-4 text-3xl">Hi tính toán thế nào?</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            Một lớp giải thích ngắn để bạn biết đâu là dữ liệu thật, đâu là dự đoán, và đâu là nội dung tham khảo.
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          {items.map((item, index) => (
            <div key={item.title} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-r ${gradient} text-sm font-black text-white`}>
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="hi-btn-primary mt-5 w-full rounded-2xl px-5 py-3 text-sm font-black"
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
