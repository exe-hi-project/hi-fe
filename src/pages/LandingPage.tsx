import { Link } from 'react-router-dom';
import HiLogo from '../components/ui/HiLogo';
import Navbar from '../components/layout/Navbar';

const REVIEWER_AVATARS = {
  minhAnh:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAR6nn9Zmt6nRUd0uocBvkgNtqZYgvR2I4IrzWU2yxfoYKo5qNzMOLWLYMR3zqDwE8SuVfnBOyH6u67gkU61URhXwIsMT67Xn9vt54DhY-rKWZa7zzoXVLVR5unuoPVMChaJaBrUh-YsuNCipUYdHlGFNQ2GUwIZr6Y-cpvi_zRNONkKfht-st-2NRMhlJBs-RiohYnfr9e46ezVPW2rcbW37Z0nGUrp5wo5TztmrpK8-9HuwGiI3Vsx60yxBoM7WZJ8H9I4tqGAA',
  tuanKiet:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDiZtEh-VzLz5b4U5h1sLdv5kkW3mxF9C0jrmH9xNMEcOBKIlSeqWDeQhKYQir_Q_XdkWTfpvkIrMVfzJIPWhvzx-lLgnKA2sS2FcKalo07V7W-4RX-DoclqLFAZ2stWmXjat3F6o30mcr2rr33mA_ohn1p6s6lAOih_61VGd7gQI1xWsMNPsvjeOjN6kfRTjG4mRlQUb2PIcmQwoYw0v0sSGGbfqhT3MQjTbv0V8JOIR2wGhQv7zhXu1Dq9D4ZBajjf3bPqsS6dw',
  lanPhuong:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBTLdb6hLmr7a5pfqlDkDhLu-qp7y2Nvb-pnbn_ugo-b41dDa0-IKfepGeqZfsWXTUo6AcxUa5pEIcWjqUYNSHLqiyO842T1thHPgjY1nvTJfdltNS3cq1J2gDGvJe_bj4nOOnKKTJQDBZeMZoracxPuMuF5wSMFxfUbDw1oDpunL8Urs1iQs2YDxx4Bhv49xpyTuKCjeGc0T2dAdtejPmhd3TapyLoEVfhs1mVTJgCjcrNkPWxv7NeU-OPetEAHTD6xtzG8uHFBg',
};

const HERO_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCju_uSN3rteKuNHWyOVRpau0ElyKBszmOtARuQ3iwLyNeRKajgYEY70iElhVfzxZZQ-TSgdyUpTK8ulvAyNq0RP5qObDtkM5VTcBEcjFq4it2zw-HqDE_xhqvhc-S_wL1ukhsW4JMovEEEydTT6ZoensHwZuNGXThn6a6cRFBTEqw6NOxGMQIy655KZEYW8FeOQ2iCMNswpx0L-uVf_vX7KsRumy7FLpbcvfuzbdu7J_EfJdfASphZ-xJlVJfKKqmYoQ2wx7xVNw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBjWKm9JzAowsjM0riJVMo6ATYWbKk7-a39TSHgzSTDv7upOG15fdI6mSCHQkSNTbtjgzSfVrlK7sdpggHyu2RIkSPyt52uPeWZzFQuyXNmOd57r5Rq19qlo4u038lquEMEc0KOAHReJY6fuapoQ3gzLOn6zmhtOItPwQ9-JDuaDjYTDSH8IXF0tGuCr7a1pds6NQc80jHj2_n57qurmhdjrekTOGkdnijdhlBFGhew5xvwXRnw_Kc0iY6AI1nI_Ja0PM_OMBQdBg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDrHggSBJ7kuTMD-hhbtQvAv77BRutVr5vKS_Pdsei5vMlUlfSlgSnG4Sr9JDQuwRwv50rffloePA103YE8jvdKL0M9PktbgksP0l8DHwodP8dU51DG3ayJ5wNXyiioP1g0dypXJVS5rD3AJDTqtwboP9HLMrkOGma3OJXDfjBsx35DPkdHzMP5N9QfcHtmeneBCZkkoVwKeqCt7N1HD2_hw8TJxtbyFixX8-zg8Vwy1znOGLKn8P49N6kMrwQawCSA_CsmI8IVtA',
];

export default function LandingPage() {
  return (
    <div className="lp-root">
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="lp-blob bg-rose-100 w-[500px] h-[500px] rounded-full absolute top-[-100px] left-[-100px]" />
        <div className="lp-blob bg-sky-100 w-[400px] h-[400px] rounded-full absolute bottom-[-50px] right-[-50px]" />
        <div className="lp-blob bg-yellow-100 w-[300px] h-[300px] rounded-full absolute top-[40%] left-[30%] opacity-40" />
      </div>

      <div className="relative flex min-h-screen w-full flex-col z-10">
        {/* ── Shared Navbar ── */}
        <div className="pt-4 pb-4">
          <Navbar showAnchors />
        </div>

        {/* ── Hero Section ── */}
        <div className="px-4 md:px-10 flex flex-1 justify-center py-5 md:py-10">
          <div className="flex flex-col max-w-[1100px] flex-1">
            <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-16 py-8">

              {/* Text block */}
              <div className="flex flex-col gap-6 flex-1 text-center md:text-left z-10">
                <div className="flex flex-col gap-4">
                  {/* Badge */}
                  <div className="inline-flex self-center md:self-start items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm w-fit">
                    <span className="material-symbols-outlined text-pink-400 text-sm" style={{ fontSize: '16px' }}>favorite</span>
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Yêu thương trọn vẹn</span>
                  </div>

                  <h1 className="text-slate-900 text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[1.2] tracking-tight">
                    Hiểu mình, Hiểu người,{' '}
                    <span className="bg-gradient-to-r from-blue-500 to-pink-400 bg-clip-text text-transparent">
                      Yêu thương trọn vẹn
                    </span>
                  </h1>

                  <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-[500px] mx-auto md:mx-0">
                    Ứng dụng theo dõi sức khỏe và kết nối tình cảm thông minh. Cùng nhau thấu hiểu chu kỳ, chia sẻ cảm xúc và xây dựng mối quan hệ bền vững.
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
                  <Link
                    to="/register"
                    className="lp-btn-gradient flex min-w-[140px] cursor-pointer items-center justify-center rounded-full h-12 px-6 text-white text-base font-bold tracking-wide"
                  >
                    Đăng ký ngay
                  </Link>
                  <a
                    href="#features"
                    className="lp-btn-white flex min-w-[140px] cursor-pointer items-center justify-center rounded-full h-12 px-6 bg-white border border-slate-200 text-slate-900 text-base font-bold tracking-wide"
                  >
                    Tìm hiểu thêm
                  </a>
                </div>

                {/* Social proof */}
                <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                  <div className="flex -space-x-3">
                    {HERO_AVATARS.map((src, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white bg-cover bg-center"
                        style={{ backgroundImage: `url("${src}")` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Được tin dùng bởi <span className="font-bold text-slate-900">10,000+</span> cặp đôi
                  </p>
                </div>
              </div>

              {/* Hero image */}
              <div className="flex-1 w-full flex justify-center z-10">
                <div className="relative w-full max-w-[500px] aspect-square">
                  {/* Glow */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-pink-100 rounded-full opacity-60 blur-2xl animate-pulse" />

                  <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-lg lp-glass p-2 lp-hover-lift">
                    <div
                      className="w-full h-full rounded-[2rem] bg-cover bg-center"
                      style={{ backgroundImage: 'url(/images/landP.png)' }}
                    />

                    {/* Floating status card */}
                    <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-lg border border-white/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                          <span className="material-symbols-outlined">favorite</span>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium">Hôm nay</p>
                          <p className="text-sm text-slate-900 font-bold">Chu kỳ ổn định, tâm trạng vui vẻ ✨</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Feature Section ── */}
        <div id="features" className="px-4 md:px-10 flex flex-1 justify-center py-16 md:py-24 bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col max-w-[1100px] flex-1">
            <div className="flex flex-col items-center gap-12">
              <div className="flex flex-col gap-3 text-center max-w-[700px]">
                <h2 className="text-slate-900 text-3xl md:text-4xl font-black leading-tight tracking-tight">
                  Mọi tính năng bạn cần
                </h2>
                <p className="text-slate-500 text-lg font-normal leading-relaxed">
                  Hi trang bị đầy đủ công cụ để cả hai cùng thấu hiểu, chăm sóc và yêu thương nhau mỗi ngày.
                </p>
              </div>

              {/* Row 1 — 3 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
                {/* Theo dõi chu kỳ */}
                <div className="group flex flex-col gap-5 rounded-2xl border border-pink-100 bg-pink-50/50 p-7 lp-hover-lift hover:bg-pink-50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white text-pink-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">calendar_month</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 text-lg font-bold">Theo dõi chu kỳ</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Ghi nhận và theo dõi chu kỳ kinh nguyệt chính xác, dự đoán ngày tiếp theo và pha rụng trứng.</p>
                  </div>
                </div>

                {/* Nhắc nhở */}
                <div className="group flex flex-col gap-5 rounded-2xl border border-purple-100 bg-purple-50/50 p-7 lp-hover-lift hover:bg-purple-50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white text-purple-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">notifications_active</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 text-lg font-bold">Nhắc nhở thông minh</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Thông báo dịu dàng về chu kỳ, uống thuốc, ngày đặc biệt — gửi đến cả bạn lẫn người ấy.</p>
                  </div>
                </div>

                {/* AI Phân tích */}
                <div className="group flex flex-col gap-5 rounded-2xl border border-sky-100 bg-sky-50/50 p-7 lp-hover-lift hover:bg-sky-50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white text-sky-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">psychology</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 text-lg font-bold">AI Phân tích</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Trí tuệ nhân tạo dự đoán chu kỳ, phân tích tâm trạng và đưa ra gợi ý cá nhân hóa chính xác.</p>
                  </div>
                </div>
              </div>

              {/* Row 2 — 4 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full">
                {/* Love Translator */}
                <div className="group flex flex-col gap-5 rounded-2xl border border-rose-100 bg-rose-50/50 p-7 lp-hover-lift hover:bg-rose-50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white text-rose-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">translate</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 text-lg font-bold">Love Translator</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Giúp người ấy "dịch" cảm xúc và hiểu bạn hơn qua từng giai đoạn chu kỳ.</p>
                  </div>
                </div>

                {/* Kết nối yêu thương */}
                <div className="group flex flex-col gap-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-7 lp-hover-lift hover:bg-blue-50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white text-blue-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">favorite</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 text-lg font-bold">Kết nối yêu thương</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Đồng bộ dữ liệu để cả hai cùng chia sẻ và người ấy nhận gợi ý quan tâm đúng lúc.</p>
                  </div>
                </div>

                {/* Lời khuyên mỗi ngày */}
                <div className="group flex flex-col gap-5 rounded-2xl border border-yellow-100 bg-yellow-50/50 p-7 lp-hover-lift hover:bg-yellow-50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white text-yellow-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">tips_and_updates</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 text-lg font-bold">Lời khuyên mỗi ngày</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Nhận lời khuyên sức khỏe và cảm xúc cá nhân hóa hằng ngày từ AI.
                    </p>
                  </div>
                </div>

                {/* Gợi ý sản phẩm */}
                <div className="group flex flex-col gap-5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-7 lp-hover-lift hover:bg-emerald-50 transition-all duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-white text-emerald-500 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[28px]">shopping_bag</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-slate-900 text-lg font-bold">Gợi ý sản phẩm</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">Đề xuất sản phẩm chăm sóc sức khỏe phù hợp với từng giai đoạn chu kỳ của bạn.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <div id="reviews" className="px-4 md:px-10 flex flex-1 justify-center py-16 md:py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent pointer-events-none" />
          <div className="flex flex-col max-w-[1100px] flex-1 z-10">
            <h2 className="text-slate-900 text-2xl md:text-3xl font-bold mb-10 text-center">
              Cặp đôi nói gì về Harmony Cycle?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Review 1 */}
              <div className="lp-glass p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full bg-cover bg-center bg-no-repeat shadow-inner"
                    style={{ backgroundImage: `url("${REVIEWER_AVATARS.minhAnh}")` }}
                  />
                  <div>
                    <p className="text-slate-900 font-bold">Minh Anh</p>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-slate-900 text-base italic">
                  "Giao diện siêu dễ thương! Từ lúc dùng app, anh người yêu mình tinh tế hơn hẳn mỗi khi mình đến ngày."
                </p>
              </div>

              {/* Review 2 */}
              <div className="lp-glass p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full bg-cover bg-center bg-no-repeat shadow-inner"
                    style={{ backgroundImage: `url("${REVIEWER_AVATARS.tuanKiet}")` }}
                  />
                  <div>
                    <p className="text-slate-900 font-bold">Tuấn Kiệt</p>
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-slate-900 text-base italic">
                  "Cực kỳ hữu ích cho cánh mày râu. Thông báo nhắc nhở rất khéo léo, giúp mình biết cách chăm sóc cô ấy tốt hơn."
                </p>
              </div>

              {/* Review 3 */}
              <div className="lp-glass p-6 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full bg-cover bg-center bg-no-repeat shadow-inner"
                    style={{ backgroundImage: `url("${REVIEWER_AVATARS.lanPhuong}")` }}
                  />
                  <div>
                    <p className="text-slate-900 font-bold">Lan Phương</p>
                    <div className="flex text-yellow-400">
                      {[...Array(4)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                      <span className="material-symbols-outlined text-gray-300" style={{ fontSize: '16px' }}>star</span>
                    </div>
                  </div>
                </div>
                <p className="text-slate-900 text-base italic">
                  "Màu sắc nhẹ nhàng, không bị rối mắt. AI dự đoán khá chuẩn xác, mình rất thích tính năng nhật ký cảm xúc."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA Section ── */}
        <div className="px-4 md:px-10 py-16 flex justify-center">
          <div className="w-full max-w-[1100px] rounded-[2.5rem] bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 p-8 md:p-16 text-center relative overflow-hidden shadow-lg">
            {/* Decorative */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-white opacity-40 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-2xl translate-x-1/3 translate-y-1/3" />

            <div className="relative z-10 flex flex-col items-center gap-6">
              <h2 className="text-slate-900 text-3xl md:text-5xl font-black tracking-tight max-w-[800px]">
                Bắt đầu hành trình thấu hiểu ngay hôm nay
              </h2>
              <p className="text-slate-500 text-lg md:text-xl font-medium max-w-[600px]">
                Đăng ký miễn phí và trải nghiệm sự khác biệt trong mối quan hệ của bạn.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
                <Link
                  to="/register"
                  className="lp-btn-gradient flex min-w-[200px] cursor-pointer items-center justify-center rounded-full h-14 px-8 text-white text-lg font-bold"
                >
                  Đăng ký ngay
                </Link>
              </div>
              <p className="text-sm text-slate-500 mt-2">Không cần thẻ tín dụng • Hủy bất kỳ lúc nào</p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="bg-white/60 backdrop-blur-sm border-t border-slate-100">
          <div className="max-w-[1100px] mx-auto px-4 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <HiLogo size={30} />
              <span
                className="font-black text-lg tracking-tight"
                style={{ background: 'linear-gradient(135deg, #7ecae8 0%, #c9a8e0 48%, #f9a8c9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >Hi, Lover</span>
            </Link>
            <div className="flex gap-8 text-sm font-medium text-slate-500">
              <a href="#" className="hover:text-blue-500 transition-colors">Điều khoản</a>
              <a href="#" className="hover:text-blue-500 transition-colors">Bảo mật</a>
              <a href="#" className="hover:text-blue-500 transition-colors">Liên hệ</a>
            </div>
            <div className="text-sm text-slate-500">© 2025 Harmony Cycle. All rights reserved.</div>
          </div>
        </footer>

      </div>
    </div>
  );
}
