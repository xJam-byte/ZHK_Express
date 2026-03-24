'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Minus, Plus, Trash2, MapPin, Loader2, Tag, CheckCircle2 } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { createOrder, validatePromoCode } from '@/lib/api';
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

  // Promo code states
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const subtotal = totalAmount();
  
  // Calculate discounts
  let discountAmount = 0;
  let finalDeliveryFee = DELIVERY_FEE;

  if (appliedPromo) {
    if (appliedPromo.type === 'PERCENT') {
      discountAmount = (subtotal * appliedPromo.value) / 100;
    } else if (appliedPromo.type === 'FIXED') {
      discountAmount = appliedPromo.value;
    } else if (appliedPromo.type === 'FREE_DELIVERY') {
      finalDeliveryFee = 0;
    }
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }
  }

  const total = subtotal - discountAmount + finalDeliveryFee;
  const isValid = entrance.trim() && floor.trim() && apartment.trim() && items.length > 0;

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    try {
      setPromoLoading(true);
      setPromoError(null);
      const promo = await validatePromoCode(promoInput.trim(), subtotal);
      setAppliedPromo(promo);
      hapticNotification('success');
    } catch (err: any) {
      setPromoError(err.response?.data?.message || 'Неверный промокод');
      setAppliedPromo(null);
      hapticNotification('error');
    } finally {
      setPromoLoading(false);
    }
  };

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
        ...(appliedPromo ? { promoCode: appliedPromo.code } : {}),
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
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-[16px] font-extrabold text-gray-900 tracking-tight">Ваш заказ</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.productId} className="p-5 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-[15px] text-gray-900 font-bold leading-snug flex-1">
                    {item.name}
                  </p>
                  <span className="text-[16px] font-black text-gray-900 whitespace-nowrap mt-0.5">
                    {(item.price * item.quantity).toLocaleString()} ₸
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="text-[13px] text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                    {item.price.toLocaleString()} ₸ / шт
                  </p>

                  <div className="flex items-center bg-gray-50 rounded-2xl p-1 shadow-inner border border-gray-200/60">
                    <button
                      onClick={() => {
                        if (item.quantity === 1) removeItem(item.productId);
                        else decrementItem(item.productId);
                        hapticFeedback('light');
                      }}
                      className="w-8 h-8 rounded-xl bg-white flex items-center justify-center transition-transform active:scale-95 shadow-sm border border-gray-100"
                    >
                      {item.quantity === 1 ? (
                        <Trash2 size={16} className="text-red-500" />
                      ) : (
                        <Minus size={16} className="text-gray-700" />
                      )}
                    </button>

                    <span className="w-10 text-center text-[15px] font-bold text-gray-900">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => {
                        addItem({ id: item.productId, name: item.name, price: item.price });
                        hapticFeedback('light');
                      }}
                      className="w-8 h-8 rounded-xl bg-white flex items-center justify-center transition-transform active:scale-95 shadow-sm border border-gray-100"
                    >
                      <Plus size={16} className="text-primary" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2.5">
            <MapPin size={18} className="text-primary" />
            <h2 className="text-[16px] font-extrabold text-gray-900 tracking-tight">Куда привезти?</h2>
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

        {/* Promo Code */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 flex flex-col gap-3">
            <label className="text-[13px] text-gray-900 font-bold flex items-center gap-2">
              <Tag size={16} className="text-primary" />
              Промокод
            </label>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => {
                  setPromoInput(e.target.value.toUpperCase());
                  setPromoError(null);
                }}
                disabled={!!appliedPromo || promoLoading}
                placeholder="PROMO2024"
                className="flex-1 py-3 px-4 bg-gray-50 rounded-xl text-[15px] uppercase font-bold text-gray-900
                           border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none disabled:opacity-60"
              />
              {!appliedPromo ? (
                <button
                  onClick={handleApplyPromo}
                  disabled={!promoInput || promoLoading}
                  className="px-5 py-3 bg-gray-900 text-white rounded-xl font-bold text-[14px] 
                             disabled:opacity-50 transition-transform active:scale-95 flex items-center justify-center min-w-[100px]"
                >
                  {promoLoading ? <Loader2 size={18} className="animate-spin" /> : 'Ввод'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoInput('');
                  }}
                  className="px-5 py-3 bg-red-50 text-red-500 rounded-xl font-bold text-[14px] 
                             transition-transform active:scale-95 border border-red-100"
                >
                  Удалить
                </button>
              )}
            </div>
            
            {promoError && (
              <p className="text-[13px] text-red-500 font-medium animate-fade-in pl-1">
                {promoError}
              </p>
            )}
            {appliedPromo && (
              <p className="text-[13px] text-green-600 font-medium animate-fade-in pl-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Промокод успешно применён!
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-[16px] font-extrabold text-gray-900 tracking-tight">Чек</h2>
          </div>
          
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-[15px]">
              <span className="text-gray-500 font-medium">Товары</span>
              <span className="text-gray-900 font-bold">{subtotal.toLocaleString()} ₸</span>
            </div>
            <div className="flex justify-between text-[15px]">
              <span className="text-gray-500 font-medium">Доставка</span>
              <span className={finalDeliveryFee === 0 ? "text-green-600 font-bold" : "text-gray-900 font-bold"}>
                {finalDeliveryFee === 0 ? 'Бесплатно' : `${finalDeliveryFee.toLocaleString()} ₸`}
              </span>
            </div>
            
            {discountAmount > 0 && (
              <div className="flex justify-between text-[15px] text-primary font-bold animate-fade-in">
                <span>Скидка</span>
                <span>-{discountAmount.toLocaleString()} ₸</span>
              </div>
            )}

            <div className="pt-4 mt-2 border-t border-gray-100 border-dashed flex justify-between items-center">
              <span className="text-[16px] font-bold text-gray-900">К оплате</span>
              <span className="text-[20px] font-black text-gray-900">
                {total.toLocaleString()} ₸
              </span>
            </div>
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
