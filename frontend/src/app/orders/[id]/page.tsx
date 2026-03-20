'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, MessageSquare, CheckCircle2, Clock, Package, Truck, ShoppingBag, XCircle } from 'lucide-react';
import { fetchOrderById } from '@/lib/api';
import { getTelegramWebApp } from '@/lib/telegram';

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  PENDING: { label: 'Ожидает подтверждения', icon: Clock, color: 'text-yellow-400' },
  ACCEPTED: { label: 'Принят магазином', icon: CheckCircle2, color: 'text-blue-400' },
  ASSEMBLING: { label: 'Собирается', icon: ShoppingBag, color: 'text-purple-400' },
  READY: { label: 'Готов к доставке', icon: Package, color: 'text-green-400' },
  DELIVERING: { label: 'В пути', icon: Truck, color: 'text-cyan-400' },
  DELIVERED: { label: 'Доставлен', icon: CheckCircle2, color: 'text-emerald-400' },
  CANCELLED: { label: 'Отменён', icon: XCircle, color: 'text-red-400' },
};

const STATUS_STEPS = ['PENDING', 'ACCEPTED', 'ASSEMBLING', 'READY', 'DELIVERING', 'DELIVERED'];

export default function OrderTrackingPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = Number(params.id);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.BackButton?.show();
      webapp.BackButton?.onClick(() => router.push('/orders'));
    }
    loadOrder();
    // Auto-refresh every 10s
    const interval = setInterval(loadOrder, 10000);
    return () => {
      clearInterval(interval);
      webapp?.BackButton?.hide();
    };
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const data = await fetchOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="text-tg-button animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Package size={48} className="text-tg-hint/40" />
        <p className="text-tg-hint">Заказ не найден</p>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/orders')}
            className="w-9 h-9 rounded-full bg-tg-secondary-bg flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-tg-hint" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">Заказ #{order.id}</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Status Card */}
        <div className="bg-tg-secondary-bg rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full bg-tg-bg flex items-center justify-center ${config.color}`}>
              <StatusIcon size={24} />
            </div>
            <div>
              <p className={`font-semibold text-lg ${config.color}`}>{config.label}</p>
              <p className="text-tg-hint text-xs">
                {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          {!isCancelled && (
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentStepIndex
                      ? 'bg-tg-button'
                      : 'bg-tg-bg'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="bg-tg-secondary-bg rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-tg-hint mt-0.5 shrink-0" />
            <div>
              <p className="text-tg-text text-sm font-medium">Адрес доставки</p>
              <p className="text-tg-hint text-xs mt-1">{order.deliveryAddress}</p>
            </div>
          </div>
          {order.comment && (
            <div className="flex items-start gap-3 mt-3 pt-3 border-t border-white/5">
              <MessageSquare size={18} className="text-tg-hint mt-0.5 shrink-0" />
              <div>
                <p className="text-tg-text text-sm font-medium">Комментарий</p>
                <p className="text-tg-hint text-xs mt-1">{order.comment}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-tg-secondary-bg rounded-2xl p-4">
          <h3 className="text-tg-text font-semibold text-sm mb-3">Товары</h3>
          <div className="space-y-3">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-tg-text text-sm truncate">
                    {item.product?.name || 'Товар'}
                  </p>
                  <p className="text-tg-hint text-xs">
                    {item.quantity} × {item.priceAtPurchase} ₸
                  </p>
                </div>
                <span className="text-tg-text text-sm font-medium ml-3">
                  {item.quantity * item.priceAtPurchase} ₸
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
            <div className="flex justify-between text-xs text-tg-hint">
              <span>Доставка</span>
              <span>{order.deliveryFee} ₸</span>
            </div>
            <div className="flex justify-between text-tg-text font-bold">
              <span>Итого</span>
              <span>{order.totalAmount} ₸</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
