'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash2, MapPin, Loader2 } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { createOrder } from '@/lib/api';
import { getTelegramWebApp, hapticFeedback, hapticNotification } from '@/lib/telegram';

const DELIVERY_FEE = 200;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, addItem, decrementItem, removeItem, clearCart, totalAmount } = useCartStore();

  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = totalAmount();
  const total = subtotal + DELIVERY_FEE;
  const isValid = entrance.trim() && floor.trim() && apartment.trim() && items.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!isValid || loading) return;

    try {
      setLoading(true);
      const webapp = getTelegramWebApp();
      webapp?.MainButton?.showProgress(true);

      await createOrder({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        entrance: entrance.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        comment: comment.trim() || undefined,
      });

      hapticNotification('success');
      clearCart();

      webapp?.showPopup({
        title: 'Заказ оформлен! ✅',
        message: `Ваш заказ на ${total.toLocaleString()} ₸ принят.\nОжидайте — доставим к двери!`,
        buttons: [{ type: 'ok', text: 'Отлично!' }],
      });

      router.push('/');
    } catch (err) {
      hapticNotification('error');
      const webapp = getTelegramWebApp();
      webapp?.showAlert('Ошибка при оформлении заказа. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
      const webapp = getTelegramWebApp();
      webapp?.MainButton?.hideProgress();
    }
  }, [isValid, loading, items, entrance, floor, apartment, comment, total, clearCart, router]);

  // Setup Telegram MainButton and BackButton
  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (!webapp) return;

    // Back button
    webapp.BackButton.show();
    const handleBack = () => router.push('/');
    webapp.BackButton.onClick(handleBack);

    return () => {
      webapp.BackButton.hide();
      webapp.BackButton.offClick(handleBack);
    };
  }, [router]);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (!webapp) return;

    // Main button
    if (isValid) {
      webapp.MainButton.setParams({
        text: `Заказать — ${total.toLocaleString()} ₸`,
        is_active: !loading,
        is_visible: true,
      });
      webapp.MainButton.onClick(handleSubmit);
    } else {
      webapp.MainButton.hide();
    }

    return () => {
      webapp.MainButton.offClick(handleSubmit);
      webapp.MainButton.hide();
    };
  }, [isValid, total, loading, handleSubmit]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-tg-secondary-bg flex items-center justify-center">
          <span className="text-4xl">🛒</span>
        </div>
        <p className="text-tg-text font-semibold text-lg">Корзина пуста</p>
        <p className="text-tg-hint text-sm text-center">
          Добавьте товары из каталога
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-2 px-6 py-3 bg-tg-button rounded-xl text-tg-button-text font-medium transition-transform active:scale-95"
        >
          В каталог
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 page-enter">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-9 h-9 rounded-xl bg-tg-secondary-bg flex items-center justify-center transition-transform active:scale-90"
          >
            <ArrowLeft size={18} className="text-tg-text" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">Оформление</h1>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Cart Items */}
        <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold text-tg-text">Ваш заказ</h2>
          </div>

          {items.map((item) => (
            <div
              key={item.productId}
              className="px-4 py-3 flex items-center gap-3 border-b border-white/5 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-tg-text font-medium truncate">
                  {item.name}
                </p>
                <p className="text-xs text-tg-hint mt-0.5">
                  {item.price.toLocaleString()} ₸ × {item.quantity}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { decrementItem(item.productId); hapticFeedback('light'); }}
                  className="w-7 h-7 rounded-lg bg-tg-bg flex items-center justify-center transition-transform active:scale-90"
                >
                  <Minus size={12} className="text-tg-hint" />
                </button>

                <span className="w-5 text-center text-sm font-bold text-tg-text">
                  {item.quantity}
                </span>

                <button
                  onClick={() => { addItem({ id: item.productId, name: item.name, price: item.price }); hapticFeedback('light'); }}
                  className="w-7 h-7 rounded-lg bg-tg-button/20 flex items-center justify-center transition-transform active:scale-90"
                >
                  <Plus size={12} className="text-tg-button" />
                </button>

                <button
                  onClick={() => { removeItem(item.productId); hapticFeedback('medium'); }}
                  className="w-7 h-7 rounded-lg bg-tg-destructive/10 flex items-center justify-center ml-1 transition-transform active:scale-90"
                >
                  <Trash2 size={12} className="text-tg-destructive" />
                </button>
              </div>

              <span className="text-sm font-bold text-tg-text w-16 text-right">
                {(item.price * item.quantity).toLocaleString()} ₸
              </span>
            </div>
          ))}
        </div>

        {/* Delivery Address */}
        <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
            <MapPin size={16} className="text-tg-button" />
            <h2 className="text-sm font-semibold text-tg-text">Адрес доставки</h2>
          </div>

          <div className="p-4 grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-tg-hint font-medium uppercase tracking-wide">
                Подъезд
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={entrance}
                onChange={(e) => setEntrance(e.target.value)}
                placeholder="1"
                className="mt-1 w-full py-2.5 px-3 bg-tg-bg rounded-xl text-sm text-tg-text text-center 
                           border border-white/5 focus:border-tg-button/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-tg-hint font-medium uppercase tracking-wide">
                Этаж
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="5"
                className="mt-1 w-full py-2.5 px-3 bg-tg-bg rounded-xl text-sm text-tg-text text-center 
                           border border-white/5 focus:border-tg-button/40 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-tg-hint font-medium uppercase tracking-wide">
                Квартира
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="42"
                className="mt-1 w-full py-2.5 px-3 bg-tg-bg rounded-xl text-sm text-tg-text text-center 
                           border border-white/5 focus:border-tg-button/40 transition-colors"
              />
            </div>
          </div>

          <div className="px-4 pb-4">
            <label className="text-[11px] text-tg-hint font-medium uppercase tracking-wide">
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Код домофона, пожелания..."
              rows={2}
              className="mt-1 w-full py-2.5 px-3 bg-tg-bg rounded-xl text-sm text-tg-text resize-none
                         border border-white/5 focus:border-tg-button/40 transition-colors placeholder:text-tg-hint/50"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-tg-secondary-bg rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-tg-hint">Товары</span>
            <span className="text-tg-text">{subtotal.toLocaleString()} ₸</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-tg-hint">Доставка</span>
            <span className="text-tg-text">{DELIVERY_FEE} ₸</span>
          </div>
          <div className="border-t border-white/5 pt-2 mt-2 flex justify-between">
            <span className="text-tg-text font-bold">Итого</span>
            <span className="text-tg-text font-bold text-lg">{total.toLocaleString()} ₸</span>
          </div>
        </div>

        {/* Fallback submit button (for non-Telegram browser testing) */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full py-4 bg-tg-button rounded-2xl text-tg-button-text font-semibold text-[15px]
                     transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-lg shadow-tg-button/20 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Заказать — {total.toLocaleString()} ₸
        </button>
      </div>
    </div>
  );
}
