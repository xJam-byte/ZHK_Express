'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Loader2 } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import CartButton from '@/components/CartButton';
import { fetchProducts } from '@/lib/api';
import { getTelegramWebApp, getTelegramUser } from '@/lib/telegram';

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  stock: number;
  isActive: boolean;
}

export default function CatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Telegram WebApp
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.expand();
    }

    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProducts();
      // Ensure data is a real Array (SES lockdown can break Array.from too)
      const arr: Product[] = Array.isArray(data) ? [...data] : [];
      setProducts(arr);
    } catch (err) {
      setError('Не удалось загрузить товары');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // SES-safe filtering: avoid relying on Array.prototype.filter
  const searchLower = search.toLowerCase();
  const filtered: Product[] = [];
  for (let i = 0; i < products.length; i++) {
    if (products[i].name.toLowerCase().indexOf(searchLower) !== -1) {
      filtered.push(products[i]);
    }
  }

  const user = getTelegramUser();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-tg-text">
                ЖК-EXPRESS
              </h1>
              <p className="text-xs text-tg-hint mt-0.5">
                Доставка за 15 минут 🚀
              </p>
            </div>
            {user && (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tg-button to-tg-accent flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {user.first_name?.[0] || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Найти товар..."
              className="w-full py-2.5 pl-10 pr-4 bg-tg-secondary-bg rounded-xl text-sm text-tg-text placeholder:text-tg-hint/60 
                         border border-white/5 focus:border-tg-button/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-tg-button animate-spin" />
            <p className="text-tg-hint text-sm">Загружаем каталог...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={48} className="text-tg-hint/40" />
            <p className="text-tg-hint text-sm">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-2 px-4 py-2 bg-tg-button rounded-xl text-tg-button-text text-sm font-medium transition-transform active:scale-95"
            >
              Попробовать снова
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Search size={48} className="text-tg-hint/40" />
            <p className="text-tg-hint text-sm">
              {search ? 'Ничего не найдено' : 'Каталог пуст'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-tg-hint text-xs">
                {filtered.length} {filtered.length === 1 ? 'товар' : 'товаров'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      <CartButton onClick={() => router.push('/checkout')} />
    </div>
  );
}
