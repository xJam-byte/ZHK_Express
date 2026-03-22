'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Loader2, ClipboardList } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import CartButton from '@/components/CartButton';
import { fetchProducts, fetchMe } from '@/lib/api';
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

    // Check user role and auto-redirect
    checkRoleAndRedirect();
    loadProducts();
  }, []);

  const checkRoleAndRedirect = async () => {
    try {
      const me = await fetchMe();
      if (me.role === 'ADMIN') {
        router.replace('/admin');
        return;
      }
      if (me.role === 'SHOP') {
        router.replace('/shop');
        return;
      }
    } catch (err) {
      // If auth fails (no initData), stay on catalog — it works without auth
      console.log('[Auth] Not authenticated, showing public catalog');
    }
  };

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
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/orders')}
                  className="w-9 h-9 rounded-full bg-tg-secondary-bg flex items-center justify-center"
                >
                  <ClipboardList size={20} className="text-gray-600" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-tg-button to-tg-accent flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user.first_name?.[0] || '?'}
                  </span>
                </div>
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
              className="w-full py-2.5 pl-10 pr-4 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 
                         border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-primary animate-spin" />
            <p className="text-gray-500 text-sm font-medium">Загружаем каталог...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={48} className="text-gray-300" />
            <p className="text-gray-500 text-sm font-medium">{error}</p>
            <button
              onClick={loadProducts}
              className="mt-2 px-5 py-2.5 bg-primary rounded-xl text-white text-sm font-semibold transition-transform active:scale-95 shadow-md shadow-primary/20 hover:bg-secondary group"
            >
              <span className="group-hover:text-gray-900 transition-colors">Попробовать снова</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Search size={48} className="text-gray-300" />
            <p className="text-gray-500 text-sm font-medium">
              {search ? 'Ничего не найдено' : 'Каталог пуст'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 font-medium tracking-wide text-[11px] uppercase">
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
