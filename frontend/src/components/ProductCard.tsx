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
    <div className="bg-white rounded-3xl overflow-hidden animate-fade-in transition-transform active:scale-[0.97] shadow-sm hover:shadow-md border border-gray-100/50">
      {/* Product Image */}
      <div className="relative aspect-square bg-white overflow-hidden p-2">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain rounded-2xl"
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
        <h3 className="text-tg-text text-[13px] font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
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
              className="w-9 h-9 rounded-full bg-primary flex items-center justify-center 
                         transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed
                         shadow-md shadow-primary/30 hover:bg-secondary group"
            >
              <Plus size={18} className="text-white group-hover:text-gray-900 transition-colors" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 animate-scale-in">
              <button
                onClick={handleDecrement}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center 
                           transition-all active:scale-90 hover:bg-gray-200"
              >
                <Minus size={16} className="text-gray-600" />
              </button>

              <span className="w-5 text-center text-tg-text font-bold text-sm">
                {quantity}
              </span>

              <button
                onClick={handleAdd}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center 
                           transition-all active:scale-90 shadow-sm shadow-primary/30 hover:bg-secondary group"
              >
                <Plus size={16} className="text-white group-hover:text-gray-900 transition-colors" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
