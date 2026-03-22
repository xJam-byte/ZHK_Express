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
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/orders')}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Заказ #{order.id}</h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* Status Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center shadow-inner ${config.color}`}>
              <StatusIcon size={26} />
            </div>
            <div>
              <p className={`font-bold text-[17px] ${config.color}`}>{config.label}</p>
              <p className="text-gray-500 text-[13px] font-medium mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          {!isCancelled && (
            <div className="flex items-center gap-1.5 mt-2">
              {STATUS_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    i <= currentStepIndex
                      ? 'bg-primary'
                      : 'bg-gray-100'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start gap-4">
            <MapPin size={20} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-900 text-[15px] font-bold">Адрес доставки</p>
              <p className="text-gray-500 text-[13px] mt-1 font-medium leading-relaxed">{order.deliveryAddress}</p>
            </div>
          </div>
          {order.comment && (
            <div className="flex items-start gap-4 mt-4 pt-4 border-t border-gray-100">
              <MessageSquare size={20} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-gray-900 text-[15px] font-bold">Комментарий</p>
                <p className="text-gray-500 text-[13px] mt-1 font-medium leading-relaxed">{order.comment}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-gray-900 font-bold text-[15px] mb-4">Товары</h3>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="text-gray-800 text-[14px] font-medium truncate">
                    {item.product?.name || 'Товар'}
                  </p>
                  <p className="text-gray-500 text-[13px] mt-0.5 font-medium">
                    {item.quantity} × {item.priceAtPurchase.toLocaleString()} ₸
                  </p>
                </div>
                <span className="text-gray-900 text-[15px] font-bold whitespace-nowrap">
                  {(item.quantity * item.priceAtPurchase).toLocaleString()} ₸
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-[14px] font-medium text-gray-500">
              <span>Доставка</span>
              <span>{order.deliveryFee} ₸</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-[16px]">
              <span>Итого</span>
              <span>{order.totalAmount.toLocaleString()} ₸</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
