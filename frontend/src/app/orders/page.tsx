'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Package, ChevronRight, ArrowLeft, Loader2, Star } from 'lucide-react';
import { fetchOrders } from '@/lib/api';
import { getTelegramWebApp } from '@/lib/telegram';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  ACCEPTED: 'Принят',
  ASSEMBLING: 'Собирается',
  READY: 'Готов',
  DELIVERING: 'Доставляется',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  ACCEPTED: 'bg-blue-500/20 text-blue-400',
  ASSEMBLING: 'bg-purple-500/20 text-purple-400',
  READY: 'bg-green-500/20 text-green-400',
  DELIVERING: 'bg-cyan-500/20 text-cyan-400',
  DELIVERED: 'bg-emerald-500/20 text-emerald-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.BackButton?.show();
      webapp.BackButton?.onClick(() => router.push('/'));
    }
    loadOrders();
    return () => { webapp?.BackButton?.hide(); };
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(Array.isArray(data) ? [...data] : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Мои заказы</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={48} className="text-gray-300" />
            <p className="text-gray-500 text-[15px] font-medium">Заказов пока нет</p>
          </div>
        ) : (
          orders.map((order: any) => (
            <button
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="w-full bg-white border border-gray-100 shadow-sm hover:shadow-md rounded-3xl p-5 text-left transition-all active:scale-[0.98] flex flex-col gap-3"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-gray-900 font-extrabold text-[16px] tracking-tight">
                  Заказ #{order.id}
                </span>
                <span
                  className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="flex items-center justify-between w-full px-0.5">
                <div className="flex items-center gap-1.5 text-gray-500 text-[13px] font-medium">
                  <Clock size={14} />
                  <span>{formatDate(order.createdAt)}</span>
                </div>
                <div className="text-gray-500 text-[13px] font-medium bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                  {order.items?.length || 0} {order.items?.length === 1 ? 'товар' : 'товаров'}
                </div>
              </div>

              {/* Rating */}
              {order.status === 'DELIVERED' && order.rating && (
                <div className="w-full px-0.5">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={`${
                          order.rating >= star
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                    {order.review && (
                      <span className="text-gray-400 text-[12px] font-medium truncate ml-1 max-w-[140px]">
                        {order.review}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 mt-1 border-t border-gray-100 border-dashed w-full">
                <span className="text-gray-900 font-black text-[18px]">
                  {order.totalAmount.toLocaleString()} ₸
                </span>
                <div className="flex items-center gap-1 text-primary font-bold text-[14px]">
                  Подробнее <ChevronRight size={16} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
