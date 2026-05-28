import React from 'react';
import { Link } from 'react-router-dom';

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-br from-pink-50 via-white to-pink-100/30 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-xl shadow-pink-100/50 backdrop-blur-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl text-red-500 animate-pulse">
          ✕
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-gray-900 font-sans">
          Thanh toán bị hủy
        </h1>
        <p className="mt-3 text-base text-gray-500 font-sans">
          Giao dịch thanh toán nâng cấp tài khoản của bạn đã bị hủy hoặc không thành công. Không có khoản phí nào bị trừ.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to="/settings"
            className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-pink-500/25 hover:from-pink-600 hover:to-pink-700 hover:shadow-pink-600/30 active:scale-[0.98] transition-all duration-200"
          >
            Thử lại
          </Link>
          <Link
            to="/female-dashboard"
            className="flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all duration-200"
          >
            Về Dashboard của tôi
          </Link>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <p className="text-xs text-gray-400">
            Cần hỗ trợ? Vui lòng liên hệ bộ phận hỗ trợ qua email{' '}
            <a href="mailto:support@hiapp.vn" className="font-medium text-pink-500 hover:underline">
              support@hiapp.vn
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
