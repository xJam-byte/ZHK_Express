'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Package, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchOrderHistory } from '@/lib/api';
import { getTelegramWebApp } from '@/lib/telegram';

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
};

export default function ShopHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.BackButton?.show();
      webapp.BackButton?.onClick(() => router.push('/shop'));
    }
    loadHistory();
    return () => { webapp?.BackButton?.hide(); };
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchOrderHistory();
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
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/shop')}
            className="w-9 h-9 rounded-full bg-tg-secondary-bg flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-tg-hint" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">История заказов</h1>
          <span className="text-tg-hint text-xs ml-auto">{orders.length} заказов</span>
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
            <p className="text-tg-hint text-sm">История пуста</p>
          </div>
        ) : (
          orders.map((order: any) => {
            const isDelivered = order.status === 'DELIVERED';
            return (
              <div
                key={order.id}
                className="bg-tg-secondary-bg rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-tg-text font-semibold">
                    Заказ #{order.id}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      isDelivered
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-tg-hint text-xs mb-2">
                  <Clock size={12} />
                  <span>{formatDate(order.createdAt)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-tg-hint text-xs">
                    {order.items?.length || 0} товаров · {order.user?.firstName || 'Клиент'}
                  </span>
                  <span className="text-tg-text font-bold text-sm">
                    {order.totalAmount} ₸
                  </span>
                </div>

                {order.deliveryAddress && (
                  <p className="text-tg-hint text-xs mt-2 pt-2 border-t border-white/5">
                    {order.deliveryAddress}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
