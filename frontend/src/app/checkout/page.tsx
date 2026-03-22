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
        <div className="w-20 h-20 rounded-[2rem] bg-gray-50 flex items-center justify-center shadow-inner">
          <span className="text-4xl">🛒</span>
        </div>
        <p className="text-gray-900 font-bold text-[19px]">Корзина пуста</p>
        <p className="text-gray-500 text-[15px] font-medium text-center">
          Добавьте товары из каталога
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-3 px-6 py-3 bg-primary rounded-2xl text-white font-semibold transition-transform active:scale-95 hover:bg-secondary shadow-md shadow-primary/20"
        >
          В каталог
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 page-enter">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-transform active:scale-90 hover:bg-gray-50"
          >
            <ArrowLeft size={20} className="text-gray-800" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Оформление</h1>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-5">
        {/* Cart Items */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-900">Ваш заказ</h2>
          </div>

          {items.map((item) => (
            <div
              key={item.productId}
              className="px-5 py-4 flex items-center gap-4 border-b border-gray-100 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-gray-800 font-semibold truncate leading-tight">
                  {item.name}
                </p>
                <p className="text-sm text-gray-500 mt-1 font-medium">
                  {item.price.toLocaleString()} ₸ × {item.quantity}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { decrementItem(item.productId); hapticFeedback('light'); }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform active:scale-90 hover:bg-gray-200"
                >
                  <Minus size={14} className="text-gray-600" />
                </button>

                <span className="w-6 text-center text-[15px] font-bold text-gray-900">
                  {item.quantity}
                </span>

                <button
                  onClick={() => { addItem({ id: item.productId, name: item.name, price: item.price }); hapticFeedback('light'); }}
                  className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-90 hover:bg-primary/20"
                >
                  <Plus size={14} className="text-primary" />
                </button>

                <button
                  onClick={() => { removeItem(item.productId); hapticFeedback('medium'); }}
                  className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center ml-2 transition-transform active:scale-90 hover:bg-red-100"
                >
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>

              <span className="text-sm font-bold text-tg-text w-16 text-right">
                {(item.price * item.quantity).toLocaleString()} ₸
              </span>
            </div>
          ))}
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <MapPin size={18} className="text-primary" />
            <h2 className="text-[15px] font-bold text-gray-900">Адрес доставки</h2>
          </div>

          <div className="p-5 grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                Подъезд
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={entrance}
                onChange={(e) => setEntrance(e.target.value)}
                placeholder="1"
                className="mt-1.5 w-full py-3 px-3 bg-gray-50 rounded-xl text-[15px] text-gray-900 font-medium text-center 
                           border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                Этаж
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="5"
                className="mt-1.5 w-full py-3 px-3 bg-gray-50 rounded-xl text-[15px] text-gray-900 font-medium text-center 
                           border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                Квартира
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                placeholder="42"
                className="mt-1.5 w-full py-3 px-3 bg-gray-50 rounded-xl text-[15px] text-gray-900 font-medium text-center 
                           border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          <div className="px-5 pb-5">
            <label className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
              Комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Код домофона, пожелания..."
              rows={2}
              className="mt-1.5 w-full py-3 px-4 bg-gray-50 rounded-xl text-[15px] text-gray-900 font-medium resize-none
                         border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white px-5 py-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between text-[15px] font-medium">
            <span className="text-gray-500">Товары</span>
            <span className="text-gray-900">{subtotal.toLocaleString()} ₸</span>
          </div>
          <div className="flex justify-between text-[15px] font-medium">
            <span className="text-gray-500">Доставка</span>
            <span className="text-gray-900">{DELIVERY_FEE} ₸</span>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between">
            <span className="text-gray-900 font-bold text-lg">Итого</span>
            <span className="text-gray-900 font-bold text-xl">{total.toLocaleString()} ₸</span>
          </div>
        </div>

        {/* Fallback submit button (for non-Telegram browser testing) */}
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full py-4 bg-primary rounded-2xl text-white font-semibold text-[16px]
                     transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
                     shadow-md shadow-primary/30 flex items-center justify-center gap-2 mt-2 hover:bg-secondary"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Заказать — {total.toLocaleString()} ₸
        </button>
      </div>
    </div>
  );
}
