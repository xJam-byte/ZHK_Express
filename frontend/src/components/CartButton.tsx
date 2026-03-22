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
      <div className="bg-primary rounded-[22px] px-6 py-4 flex items-center justify-between shadow-2xl shadow-primary/30 transition-all active:scale-[0.98] hover:bg-secondary group border border-white/20">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <ShoppingCart size={24} className="text-white group-hover:text-gray-900 transition-colors duration-300" />
            <div className="absolute -top-2.5 -right-2 w-5 h-5 bg-accent rounded-full flex items-center justify-center shadow-sm border border-white/50">
              <span className="text-gray-900 text-[11px] font-extrabold">{count}</span>
            </div>
          </div>
          <span className="text-white group-hover:text-gray-900 font-bold text-[16px] tracking-wide transition-colors duration-300">
            В корзину
          </span>
        </div>

        <div className="bg-white/20 group-hover:bg-gray-900/10 px-3 py-1.5 rounded-xl transition-colors duration-300">
          <span className="text-white group-hover:text-gray-900 font-extrabold text-[16px] transition-colors duration-300">
            {amount.toLocaleString()} ₸
          </span>
        </div>
      </div>
    </button>
  );
}
