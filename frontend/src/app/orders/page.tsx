'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Package, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
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
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-9 h-9 rounded-full bg-tg-secondary-bg flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-tg-hint" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">Мои заказы</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-tg-button animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={48} className="text-tg-hint/40" />
            <p className="text-tg-hint text-sm">Заказов пока нет</p>
          </div>
        ) : (
          orders.map((order: any) => (
            <button
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className="w-full bg-tg-secondary-bg rounded-2xl p-4 text-left transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-tg-text font-semibold">
                  Заказ #{order.id}
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] || ''}`}
                >
                  {STATUS_LABELS[order.status] || order.status}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-tg-hint text-xs mb-2">
                <Clock size={12} />
                <span>{formatDate(order.createdAt)}</span>
              </div>

              <div className="text-tg-hint text-xs mb-2">
                {order.items?.length || 0} товаров
              </div>

              <div className="flex items-center justify-between">
                <span className="text-tg-text font-bold">
                  {order.totalAmount} ₸
                </span>
                <ChevronRight size={16} className="text-tg-hint" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
