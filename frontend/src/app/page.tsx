'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, Loader2, ClipboardList, Heart } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import CartButton from '@/components/CartButton';
import { fetchProducts, fetchMe, fetchCategories, fetchWishlist, toggleWishlistItem, Category } from '@/lib/api';
import { getTelegramWebApp, getTelegramUser } from '@/lib/telegram';
import { useDebounce } from '@/hooks/useDebounce';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
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
    loadData();
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
      // CLIENT: check if shop is selected (first-time onboarding)
      if (me.role === 'CLIENT' && !me.selectedShopId) {
        router.replace('/select-shop');
        return;
      }
    } catch (err) {
      // If auth fails (no initData), stay on catalog — it works without auth
      console.log('[Auth] Not authenticated, showing public catalog');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);

      const pArr: Product[] = Array.isArray(productsData) ? [...productsData] : [];
      setProducts(pArr);

      const cArr: Category[] = Array.isArray(categoriesData) ? [...categoriesData] : [];
      setCategories(cArr);

      // Load wishlist if auth might work
      loadWishlist();
    } catch (err) {
      setError('Не удалось загрузить каталог');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadWishlist = async () => {
    try {
      const wishes: Product[] = await fetchWishlist();
      const ids = new Set(wishes.map(w => w.id));
      setWishlistIds(ids);
    } catch (e) {
      console.log('User unauthenticated, skipping wishlist');
    }
  };

  const handleToggleWishlist = async (productId: number) => {
    try {
      const isAdded = !wishlistIds.has(productId);
      // Optimistic UI update
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (isAdded) next.add(productId);
        else next.delete(productId);
        return next;
      });

      const res = await toggleWishlistItem(productId);

      // Sync with real state if needed
      setWishlistIds(prev => {
        const next = new Set(prev);
        if (res.added) next.add(productId);
        else next.delete(productId);
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle wishlist', err);
    }
  };

  // SES-safe filtering: avoid relying on Array.prototype.filter
  const searchLower = debouncedSearch.toLowerCase();
  const filtered: Product[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const matchesSearch = p.name.toLowerCase().indexOf(searchLower) !== -1;
    // We assume backend returns categoryId in Product (need to ensure Product interface has it, but it's okay for JS)
    const matchesCategory = selectedCategory === null || (p as any).categoryId === selectedCategory;
    const matchesFavorites = activeTab === 'all' || wishlistIds.has(p.id);

    if (matchesSearch && matchesCategory && matchesFavorites) {
      filtered.push(p);
    }
  }

  const user = getTelegramUser();

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-gray-900 tracking-tight">
              ЖК-EXPRESS
            </h1>
            <div className="flex items-center gap-1.5 mt-1 text-primary font-semibold text-[13px]">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft shadow-[0_0_8px_rgba(82,200,107,0.6)]" />
              <span>Доставка 15 минут</span>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => router.push('/orders')}
                className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center transition-transform active:scale-95 border border-gray-100 shadow-sm"
              >
                <ClipboardList size={20} className="text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
                <span className="text-sm font-bold text-gray-900">
                  {user.first_name?.[0] || '?'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Search & Categories */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm px-5 pt-3 pb-3">
        <div className="relative mb-3">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти вкусненькое..."
            className="w-full py-3 pl-11 pr-4 bg-gray-50/80 rounded-2xl text-[15px] text-gray-900 placeholder:text-gray-400 font-medium
                       border border-gray-200 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
          />
        </div>

        {/* Categories Scroller */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-1">
          <button
            onClick={() => { setActiveTab('all'); setSelectedCategory(null); }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[14px] font-semibold transition-colors
              ${activeTab === 'all' && selectedCategory === null
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'}`}
          >
            Все
          </button>

          <button
            onClick={() => { setActiveTab('favorites'); setSelectedCategory(null); }}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-[14px] font-semibold transition-all flex items-center gap-1.5
              ${activeTab === 'favorites'
                ? 'bg-red-500 text-white shadow-sm shadow-red-500/25'
                : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'}`}
          >
            <Heart size={14} className={activeTab === 'favorites' ? 'fill-white' : ''} />
            Избранное
            {wishlistIds.size > 0 && (
              <span className={`ml-0.5 text-[11px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center
                ${activeTab === 'favorites' ? 'bg-white/25 text-white' : 'bg-gray-300/60 text-gray-700'}`}>
                {wishlistIds.size}
              </span>
            )}
          </button>

          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveTab('all'); setSelectedCategory(cat.id); }}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[14px] font-semibold transition-colors
                ${activeTab === 'all' && selectedCategory === cat.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-5">
        {!search && !loading && !error && filtered.length > 0 && (
          <div className="mb-6 bg-gradient-to-br from-primary via-[#5edb7d] to-secondary rounded-3xl p-6 shadow-xl shadow-primary/20 relative overflow-hidden group">
            {/* Background decorative elements */}
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />

            <div className="relative z-10 w-3/5">
              <h2 className="text-[20px] font-black text-white leading-tight mb-2 drop-shadow-md">
                Свежие продукты <br />прямо к двери
              </h2>
              <div className="inline-flex items-center px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg border border-white/30">
                <p className="text-[13px] text-white font-bold tracking-wide">Первая доставка — бесплатно</p>
              </div>
            </div>

            {/* Floating Ingredients */}
            <div className="absolute -right-4 -bottom-6 text-[90px] drop-shadow-2xl animate-float select-none z-0">
              🥦
            </div>
            <div className="absolute right-12 top-2 text-[45px] drop-shadow-lg animate-float-delayed opacity-90 select-none">
              🥑
            </div>
            <div className="absolute right-2 top-10 text-[35px] drop-shadow-lg animate-float opacity-80 select-none" style={{ animationDelay: '0.5s' }}>
              🍅
            </div>
            <div className="absolute right-24 bottom-2 text-[30px] drop-shadow-md animate-float-delayed opacity-70 select-none" style={{ animationDelay: '1.2s' }}>
              🍋
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-gray-500 text-[15px] font-medium">Свежие продукты уже близко...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={56} className="text-gray-300" />
            <p className="text-gray-500 text-[15px] font-medium">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-6 py-3 bg-primary rounded-2xl text-white text-[15px] font-bold transition-transform active:scale-95 shadow-md shadow-primary/20 hover:bg-secondary group"
            >
              <span className="group-hover:text-gray-900 transition-colors">Попробовать снова</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            {activeTab === 'favorites' ? (
              <>
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-1">
                  <Heart size={36} className="text-red-300" />
                </div>
                <p className="text-gray-400 text-[15px] font-medium text-center leading-relaxed">
                  Вы пока ничего не добавили<br />в избранное
                </p>
                <p className="text-gray-300 text-[13px] text-center">
                  Нажмите 🤍 на карточке товара
                </p>
              </>
            ) : (
              <>
                <Search size={56} className="text-gray-300" />
                <p className="text-gray-500 text-[15px] font-medium">
                  {search ? 'Ничего не найдено' : 'Каталог пуст'}
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                {search ? 'Результаты поиска' : 'Популярное'}
              </h2>
              <span className="text-gray-400 font-bold text-[12px] uppercase">
                {filtered.length} {filtered.length === 1 ? 'товар' : 'товаров'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.has(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
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
