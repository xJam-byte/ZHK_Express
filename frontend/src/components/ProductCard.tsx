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
    <div className="bg-white rounded-3xl overflow-hidden animate-fade-in transition-transform shadow-sm hover:shadow-md border border-gray-100 flex flex-col h-full">
      {/* Product Image */}
      <div className="relative aspect-[4/3] bg-gray-50/50 w-full overflow-hidden flex-shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-2 mix-blend-multiply"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
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
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="text-gray-900 text-[14px] font-bold leading-snug line-clamp-2 h-[2.6rem]">
            {product.name}
          </h3>
          <div className="mt-1.5">
            <span className="text-gray-900 font-black text-[17px] tracking-tight">
              {product.price.toLocaleString()} ₸
            </span>
          </div>
        </div>

        <div>
          {quantity === 0 ? (
            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="w-full h-10 rounded-2xl bg-gray-100 flex items-center justify-center 
                         transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                         hover:bg-primary group gap-1.5"
            >
              <Plus size={16} className="text-gray-600 group-hover:text-white transition-colors" />
              <span className="text-[13px] font-bold text-gray-800 group-hover:text-white transition-colors">
                {product.stock === 0 ? 'Нет в наличии' : 'Добавить'}
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between w-full h-10 bg-primary rounded-2xl px-1.5 shadow-sm shadow-primary/20 animate-scale-in">
              <button
                onClick={handleDecrement}
                className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center 
                           transition-transform active:scale-90 hover:bg-white/30"
              >
                <Minus size={16} className="text-white" />
              </button>

              <span className="text-center text-white font-bold text-[15px]">
                {quantity}
              </span>

              <button
                onClick={handleAdd}
                className="w-8 h-8 rounded-xl bg-white flex items-center justify-center 
                           transition-transform active:scale-90 shadow-sm"
              >
                <Plus size={16} className="text-primary" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
