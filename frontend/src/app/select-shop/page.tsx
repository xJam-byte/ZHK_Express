'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Navigation,
  Loader2,
  ChevronRight,
  Store,
  Home,
  ArrowLeft,
  Check,
} from 'lucide-react';
import {
  fetchActiveShops,
  resolveGeoShop,
  saveUserAddress,
  ShopInfo,
} from '@/lib/api';
import { getTelegramWebApp, hapticFeedback, hapticNotification } from '@/lib/telegram';

type Step = 'select' | 'address';

export default function SelectShopPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [shops, setShops] = useState<ShopInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoLoading, setGeoLoading] = useState(false);
  const [selectedShop, setSelectedShop] = useState<ShopInfo | null>(null);

  // Address form
  const [entrance, setEntrance] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.expand();
    }
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      setLoading(true);
      const data = await fetchActiveShops();
      setShops(Array.isArray(data) ? [...data] : []);
    } catch (err) {
      console.error('Failed to load shops', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      const webapp = getTelegramWebApp();
      webapp?.showAlert('Геолокация не поддерживается вашим устройством');
      return;
    }

    setGeoLoading(true);
    hapticFeedback('medium');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await resolveGeoShop(
            position.coords.latitude,
            position.coords.longitude,
          );
          if (result.shop) {
            setSelectedShop(result.shop);
            if (result.outOfRange) {
              const webapp = getTelegramWebApp();
              webapp?.showAlert(
                `Ближайший магазин — "${result.shop.name}" (${result.distance}м). Вы находитесь вне зоны доставки, но мы выбрали ближайший.`,
              );
            }
            hapticNotification('success');
            setStep('address');
          }
        } catch (err) {
          hapticNotification('error');
          console.error('Geo resolve failed', err);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        hapticNotification('error');
        const webapp = getTelegramWebApp();
        webapp?.showAlert('Не удалось получить геолокацию. Выберите магазин из списка.');
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSelectShop = (shop: ShopInfo) => {
    setSelectedShop(shop);
    hapticFeedback('light');
    setStep('address');
  };

  const handleSaveAddress = async () => {
    if (!selectedShop || !entrance.trim() || !floor.trim() || !apartment.trim()) return;

    try {
      setSaving(true);
      await saveUserAddress({
        shopId: selectedShop.id,
        entrance: entrance.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        comment: comment.trim() || undefined,
      });
      hapticNotification('success');
      router.replace('/');
    } catch (err) {
      hapticNotification('error');
      const webapp = getTelegramWebApp();
      webapp?.showAlert('Ошибка сохранения адреса. Попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const isAddressValid = entrance.trim() && floor.trim() && apartment.trim();

  if (step === 'address' && selectedShop) {
    return (
      <div className="min-h-screen pb-8 page-enter">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shadow-sm">
          <div className="px-4 py-4 flex items-center gap-3">
            <button
              onClick={() => { setStep('select'); hapticFeedback('light'); }}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center transition-transform active:scale-90"
            >
              <ArrowLeft size={20} className="text-gray-800" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Ваш адрес</h1>
              <p className="text-xs text-gray-500 font-medium">{selectedShop.name}</p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-6 space-y-5">
          {/* Selected Shop Card */}
          <div className="bg-gradient-to-r from-primary to-secondary rounded-3xl p-5 shadow-lg shadow-primary/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Store size={18} className="text-white/90" />
                <h2 className="text-[17px] font-bold text-white">{selectedShop.name}</h2>
              </div>
              <p className="text-[13px] text-white/80 font-medium">{selectedShop.address || 'Адрес не указан'}</p>
            </div>
            <div className="absolute -right-4 -bottom-6 text-[80px] drop-shadow-xl transform -rotate-12 select-none opacity-30">
              🏪
            </div>
          </div>

          {/* Address Form */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2.5">
              <Home size={18} className="text-primary" />
              <h2 className="text-[16px] font-extrabold text-gray-900 tracking-tight">Точный адрес</h2>
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

          {/* Save Button */}
          <button
            onClick={handleSaveAddress}
            disabled={!isAddressValid || saving}
            className="w-full py-4 bg-primary rounded-2xl text-white font-semibold text-[16px]
                       transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed
                       shadow-md shadow-primary/30 flex items-center justify-center gap-2 hover:bg-secondary"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Check size={18} />
            )}
            {saving ? 'Сохранение...' : 'Сохранить и продолжить'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 page-enter">
      {/* Header */}
      <div className="bg-white px-5 pt-6 pb-4">
        <h1 className="text-[24px] font-extrabold text-gray-900 tracking-tight">
          Добро пожаловать! 👋
        </h1>
        <p className="text-[15px] text-gray-500 font-medium mt-1">
          Выберите ближайший магазин для доставки
        </p>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {/* Geolocation Button */}
        <button
          onClick={handleGeolocate}
          disabled={geoLoading}
          className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl text-white font-semibold text-[15px]
                     transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg shadow-blue-500/20
                     flex items-center justify-center gap-2.5 hover:shadow-xl hover:shadow-blue-500/30"
        >
          {geoLoading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Navigation size={20} />
          )}
          {geoLoading ? 'Определяем...' : '📍 Использовать геолокацию'}
        </button>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">или выберите</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Shop List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={36} className="text-primary animate-spin" />
            <p className="text-gray-500 text-[15px] font-medium">Загрузка магазинов...</p>
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Store size={56} className="text-gray-300" />
            <p className="text-gray-500 text-[15px] font-medium">Нет доступных магазинов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shops.map((shop) => (
              <button
                key={shop.id}
                onClick={() => handleSelectShop(shop)}
                className="w-full bg-white border border-gray-100 shadow-sm hover:shadow-md rounded-2xl p-5 text-left
                           transition-all active:scale-[0.98] flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0
                              group-hover:from-primary/20 group-hover:to-accent/20 transition-colors">
                  <Store size={22} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-bold text-gray-900 truncate">
                    {shop.name}
                  </h3>
                  {shop.address && (
                    <p className="text-[13px] text-gray-500 font-medium mt-0.5 truncate flex items-center gap-1">
                      <MapPin size={12} />
                      {shop.address}
                    </p>
                  )}
                </div>
                <ChevronRight size={20} className="text-gray-300 flex-shrink-0 group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
