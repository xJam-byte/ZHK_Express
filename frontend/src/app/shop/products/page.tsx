'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Package,
  Search,
  Eye,
  EyeOff,
  Save,
  Minus,
  Plus,
} from 'lucide-react';
import { fetchAllProducts, updateProduct, toggleProduct } from '@/lib/api';
import { getTelegramWebApp, hapticFeedback, hapticNotification } from '@/lib/telegram';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl?: string;
}

export default function ShopProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ stock: number; price: number }>({
    stock: 0,
    price: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.BackButton?.show();
      webapp.BackButton?.onClick(() => router.push('/shop'));
    }
    loadProducts();
    return () => { webapp?.BackButton?.hide(); };
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchAllProducts();
      setProducts(Array.isArray(data) ? [...data] : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditValues({ stock: product.stock, price: product.price });
    hapticFeedback('light');
  };

  const saveProduct = async (id: number) => {
    try {
      setSaving(true);
      await updateProduct(id, {
        stock: editValues.stock,
        price: editValues.price,
      });
      // Update local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, stock: editValues.stock, price: editValues.price }
            : p,
        ),
      );
      setEditingId(null);
      hapticNotification('success');
    } catch (err) {
      console.error(err);
      hapticNotification('error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number, currentActive: boolean) => {
    try {
      await toggleProduct(id, !currentActive);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p)),
      );
      hapticFeedback('medium');
    } catch (err) {
      console.error(err);
      hapticNotification('error');
    }
  };

  const searchLower = search.toLowerCase();
  const filtered: Product[] = [];
  for (let i = 0; i < products.length; i++) {
    if (products[i].name.toLowerCase().indexOf(searchLower) !== -1) {
      filtered.push(products[i]);
    }
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.push('/shop')}
            className="w-9 h-9 rounded-full bg-tg-secondary-bg flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-tg-hint" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">Товары</h1>
          <span className="text-tg-hint text-xs ml-auto">{filtered.length} шт.</span>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tg-hint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти товар..."
            className="w-full py-2.5 pl-10 pr-4 bg-tg-secondary-bg rounded-xl text-sm text-tg-text placeholder:text-tg-hint/60 border border-white/5"
          />
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-tg-button animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package size={48} className="text-tg-hint/40" />
            <p className="text-tg-hint text-sm">Товары не найдены</p>
          </div>
        ) : (
          filtered.map((product) => {
            const isEditing = editingId === product.id;
            return (
              <div
                key={product.id}
                className={`bg-tg-secondary-bg rounded-2xl p-4 transition-all ${
                  !product.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-tg-text font-semibold text-sm truncate">
                      {product.name}
                    </p>
                    <p className="text-tg-hint text-xs mt-0.5">
                      ID: {product.id}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggle(product.id, product.isActive)}
                    className={`ml-2 p-2 rounded-xl transition-colors ${
                      product.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {product.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    {/* Stock Editor */}
                    <div>
                      <label className="text-tg-hint text-xs block mb-1">Остаток</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setEditValues((v) => ({
                              ...v,
                              stock: Math.max(0, v.stock - 1),
                            }))
                          }
                          className="w-9 h-9 rounded-xl bg-tg-bg flex items-center justify-center text-tg-hint"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          type="number"
                          value={editValues.stock}
                          onChange={(e) =>
                            setEditValues((v) => ({
                              ...v,
                              stock: Math.max(0, parseInt(e.target.value) || 0),
                            }))
                          }
                          className="flex-1 text-center py-2 bg-tg-bg rounded-xl text-tg-text text-sm border border-white/5"
                        />
                        <button
                          onClick={() =>
                            setEditValues((v) => ({ ...v, stock: v.stock + 1 }))
                          }
                          className="w-9 h-9 rounded-xl bg-tg-bg flex items-center justify-center text-tg-hint"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Price Editor */}
                    <div>
                      <label className="text-tg-hint text-xs block mb-1">Цена (₸)</label>
                      <input
                        type="number"
                        value={editValues.price}
                        onChange={(e) =>
                          setEditValues((v) => ({
                            ...v,
                            price: Math.max(0, parseInt(e.target.value) || 0),
                          }))
                        }
                        className="w-full py-2 px-3 bg-tg-bg rounded-xl text-tg-text text-sm border border-white/5"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex-1 py-2.5 bg-tg-bg rounded-xl text-tg-hint text-sm font-medium"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => saveProduct(product.id)}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-tg-button rounded-xl text-tg-button-text text-sm font-medium flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => startEditing(product)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex gap-4">
                      <div>
                        <p className="text-tg-hint text-xs">Цена</p>
                        <p className="text-tg-text font-medium text-sm">
                          {product.price} ₸
                        </p>
                      </div>
                      <div>
                        <p className="text-tg-hint text-xs">Остаток</p>
                        <p
                          className={`font-medium text-sm ${
                            product.stock <= 5
                              ? 'text-red-400'
                              : 'text-tg-text'
                          }`}
                        >
                          {product.stock} шт.
                        </p>
                      </div>
                    </div>
                    <span className="text-tg-button text-xs">Изменить</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
