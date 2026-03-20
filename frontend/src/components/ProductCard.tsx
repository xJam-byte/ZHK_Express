'use client';

import { Plus, Minus } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { hapticFeedback } from '@/lib/telegram';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  stock: number;
}

export default function ProductCard({ product }: { product: Product }) {
  const { addItem, decrementItem, getItemQuantity } = useCartStore();
  const quantity = getItemQuantity(product.id);

  const handleAdd = () => {
    addItem(product);
    hapticFeedback('light');
  };

  const handleDecrement = () => {
    decrementItem(product.id);
    hapticFeedback('light');
  };

  return (
    <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden animate-fade-in transition-transform active:scale-[0.97]">
      {/* Product Image */}
      <div className="relative aspect-square bg-tg-bg overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-tg-button/20 to-tg-accent/10 flex items-center justify-center">
              <span className="text-3xl opacity-40">📦</span>
            </div>
          </div>
        )}

        {product.stock <= 3 && product.stock > 0 && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-orange-500/90 text-white text-[10px] font-semibold rounded-full backdrop-blur-sm">
            Осталось {product.stock}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-tg-text text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-tg-text font-bold text-base">
            {product.price.toLocaleString()} ₸
          </span>

          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="w-9 h-9 rounded-xl bg-tg-button flex items-center justify-center 
                         transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed
                         shadow-lg shadow-tg-button/20 hover:shadow-tg-button/40"
            >
              <Plus size={18} className="text-tg-button-text" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 animate-scale-in">
              <button
                onClick={handleDecrement}
                className="w-8 h-8 rounded-xl bg-tg-secondary-bg border border-tg-hint/20 flex items-center justify-center 
                           transition-all active:scale-90"
              >
                <Minus size={14} className="text-tg-hint" />
              </button>

              <span className="w-6 text-center text-tg-text font-bold text-sm">
                {quantity}
              </span>

              <button
                onClick={handleAdd}
                className="w-8 h-8 rounded-xl bg-tg-button flex items-center justify-center 
                           transition-all active:scale-90 shadow-md shadow-tg-button/20"
              >
                <Plus size={14} className="text-tg-button-text" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
