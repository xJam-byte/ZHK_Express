'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Check, Package, Truck, Loader2, ChevronRight, History, ShoppingBag, Upload, Star } from 'lucide-react';
import OrderTimer from '@/components/OrderTimer';
import { fetchOrders, updateOrderStatus, fetchMe, fetchShopRating } from '@/lib/api';
import { useSocketEvent } from '@/lib/socket';
import { hapticFeedback, hapticNotification } from '@/lib/telegram';

interface OrderItem {
  id: number;
  quantity: number;
  priceAtPurchase: number;
  product: { name: string };
}

interface Order {
  id: number;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  comment?: string;
  createdAt: string;
  acceptedAt?: string;
  items: OrderItem[];
  user: {
    firstName?: string;
    lastName?: string;
    telegramId: string;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  PENDING: { label: 'Новый', color: 'bg-blue-500', next: 'ACCEPTED', nextLabel: 'Принять' },
  ACCEPTED: { label: 'Принят', color: 'bg-yellow-500', next: 'ASSEMBLING', nextLabel: 'Собирать' },
  ASSEMBLING: { label: 'Сборка', color: 'bg-orange-500', next: 'READY', nextLabel: 'Готов' },
  READY: { label: 'Готов', color: 'bg-purple-500', next: 'DELIVERING', nextLabel: 'Доставляю' },
  DELIVERING: { label: 'Доставка', color: 'bg-indigo-500', next: 'DELIVERED', nextLabel: 'Доставлен' },
  DELIVERED: { label: 'Доставлен', color: 'bg-green-500' },
  CANCELLED: { label: 'Отменён', color: 'bg-red-500' },
};

export default function ShopPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [ratingStats, setRatingStats] = useState<{ averageRating: number | null; totalReviews: number } | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(Array.isArray(data) ? [...data] : []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadRatingStats();
  }, [loadOrders]);

  // Real-time updates via WebSocket
  useSocketEvent('order:created', () => loadOrders());
  useSocketEvent('order:updated', () => loadOrders());
  useSocketEvent('order:rated', () => loadRatingStats());

  const loadRatingStats = async () => {
    try {
      const me = await fetchMe();
      if (me.shopId) {
        const stats = await fetchShopRating(me.shopId);
        setRatingStats(stats);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      setUpdatingId(orderId);
      hapticFeedback('medium');
      await updateOrderStatus(orderId, newStatus);
      hapticNotification('success');
      await loadOrders();
    } catch (err) {
      hapticNotification('error');
      console.error('Failed to update status', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const activeOrders: Order[] = [];
  const completedOrders: Order[] = [];
  for (let i = 0; i < orders.length; i++) {
    if (orders[i].status === 'DELIVERED' || orders[i].status === 'CANCELLED') {
      completedOrders.push(orders[i]);
    } else {
      activeOrders.push(orders[i]);
    }
  }

  return (
    <div className="min-h-screen pb-8 page-enter">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-tg-text">Заказы</h1>
            <p className="text-xs text-tg-hint mt-0.5">
              Панель магазина
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/shop/products')}
              className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center"
              title="Товары"
            >
              <ShoppingBag size={16} className="text-tg-hint" />
            </button>
            <button
              onClick={() => router.push('/shop/import')}
              className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center"
              title="Импорт"
            >
              <Upload size={16} className="text-tg-hint" />
            </button>
            <button
              onClick={() => router.push('/shop/reviews')}
              className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center"
              title="Отзывы"
            >
              <Star size={16} className="text-tg-hint" />
            </button>
            <button
              onClick={() => router.push('/shop/history')}
              className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center"
              title="История"
            >
              <History size={16} className="text-tg-hint" />
            </button>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center transition-transform active:scale-90"
            >
              <RefreshCw
                size={16}
                className={`text-tg-hint ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Rating Summary Card */}
        {ratingStats && ratingStats.totalReviews > 0 && (
          <button
            onClick={() => router.push('/shop/reviews')}
            className="w-full bg-tg-secondary-bg rounded-2xl p-4 flex items-center gap-4 transition-transform active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Star size={22} className="fill-yellow-400 text-yellow-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-tg-text">
                  {ratingStats.averageRating}
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      className={`${
                        (ratingStats.averageRating ?? 0) >= star
                          ? 'fill-yellow-400 text-yellow-400'
                          : (ratingStats.averageRating ?? 0) >= star - 0.5
                          ? 'fill-yellow-400/50 text-yellow-400'
                          : 'text-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-tg-hint mt-0.5">
                {ratingStats.totalReviews} {ratingStats.totalReviews === 1 ? 'отзыв' : ratingStats.totalReviews < 5 ? 'отзыва' : 'отзывов'}
              </p>
            </div>
            <ChevronRight size={16} className="text-tg-hint" />
          </button>
        )}
        {loading && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-tg-button animate-spin" />
            <p className="text-tg-hint text-sm">Загрузка заказов...</p>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={48} className="text-tg-hint/40" />
            <p className="text-tg-hint text-sm">Нет активных заказов</p>
          </div>
        ) : (
          <>
            <h2 className="text-xs font-semibold text-tg-hint uppercase tracking-wider">
              Активные ({activeOrders.length})
            </h2>

            {activeOrders.map((order) => {
              const config = STATUS_CONFIG[order.status];
              const isUpdating = updatingId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-tg-secondary-bg rounded-2xl overflow-hidden animate-fade-in"
                >
                  {/* Order Header */}
                  <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${config.color}`} />
                      <span className="text-sm font-bold text-tg-text">
                        #{order.id}
                      </span>
                      <span className="text-xs text-tg-hint px-2 py-0.5 bg-tg-bg rounded-lg">
                        {config.label}
                      </span>
                    </div>

                    {order.status === 'PENDING' && (
                      <OrderTimer createdAt={order.createdAt} slaMinutes={3} />
                    )}
                  </div>

                  {/* Customer & Address */}
                  <div className="px-4 py-2 border-b border-white/5">
                    <p className="text-xs text-tg-hint">
                      👤 {[order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || `TG: ${order.user.telegramId}`}
                    </p>
                    <p className="text-xs text-tg-text mt-1">
                      📍 {order.deliveryAddress}
                    </p>
                    {order.comment && (
                      <p className="text-xs text-tg-hint mt-1 italic">
                        💬 {order.comment}
                      </p>
                    )}
                  </div>

                  {/* Items */}
                  <div className="px-4 py-2 space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-tg-text">
                          {item.product.name} × {item.quantity}
                        </span>
                        <span className="text-tg-hint">
                          {(item.priceAtPurchase * item.quantity).toLocaleString()} ₸
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Total & Action */}
                  <div className="px-4 py-3 flex items-center justify-between border-t border-white/5">
                    <span className="text-sm font-bold text-tg-text">
                      {order.totalAmount.toLocaleString()} ₸
                    </span>

                    {config.next && (
                      <button
                        onClick={() => handleStatusChange(order.id, config.next!)}
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 bg-tg-button rounded-xl text-tg-button-text text-xs font-semibold
                                   transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            {config.next === 'DELIVERED' ? <Check size={14} /> : <ChevronRight size={14} />}
                          </>
                        )}
                        {config.nextLabel}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Completed */}
        {completedOrders.length > 0 && (
          <>
            <h2 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mt-6">
              Завершённые ({completedOrders.length})
            </h2>
            {completedOrders.slice(0, 10).map((order) => {
              const config = STATUS_CONFIG[order.status];
              return (
                <div
                  key={order.id}
                  className="bg-tg-secondary-bg/50 rounded-2xl px-4 py-3 flex items-center justify-between opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${config.color}`} />
                    <span className="text-sm font-medium text-tg-text">#{order.id}</span>
                    <span className="text-xs text-tg-hint">{config.label}</span>
                  </div>
                  <span className="text-sm text-tg-hint">
                    {order.totalAmount.toLocaleString()} ₸
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
