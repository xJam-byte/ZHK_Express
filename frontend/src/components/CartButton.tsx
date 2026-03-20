'use client';

import { ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { hapticFeedback } from '@/lib/telegram';

interface CartButtonProps {
  onClick: () => void;
}

export default function CartButton({ onClick }: CartButtonProps) {
  const { totalAmount, totalItems } = useCartStore();
  const count = totalItems();
  const amount = totalAmount();

  if (count === 0) return null;

  const handleClick = () => {
    hapticFeedback('medium');
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 left-4 right-4 z-50 animate-slide-up"
    >
      <div className="bg-tg-button rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl shadow-tg-button/30 transition-transform active:scale-[0.98]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart size={22} className="text-tg-button-text" />
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
              <span className="text-tg-button text-[10px] font-bold">{count}</span>
            </div>
          </div>
          <span className="text-tg-button-text font-semibold text-[15px]">
            Корзина
          </span>
        </div>

        <span className="text-tg-button-text font-bold text-[15px]">
          {amount.toLocaleString()} ₸
        </span>
      </div>
    </button>
  );
}
