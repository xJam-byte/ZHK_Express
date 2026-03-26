'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Star, MessageSquare } from 'lucide-react';
import { fetchMe, fetchShopReviews, fetchShopRating } from '@/lib/api';
import { getTelegramWebApp } from '@/lib/telegram';

interface Review {
  id: number;
  rating: number;
  review: string | null;
  createdAt: string;
  deliveredAt: string | null;
  user: {
    firstName: string | null;
    lastName: string | null;
  };
}

interface RatingStats {
  averageRating: number | null;
  totalReviews: number;
  breakdown: Record<number, number>;
}

export default function ShopReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.BackButton?.show();
      webapp.BackButton?.onClick(() => router.push('/shop'));
    }
    loadData();
    return () => { webapp?.BackButton?.hide(); };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const me = await fetchMe();
      if (!me.shopId) return;

      const [reviewsData, statsData] = await Promise.all([
        fetchShopReviews(me.shopId),
        fetchShopRating(me.shopId),
      ]);

      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const maxBreakdownCount = stats
    ? Math.max(...Object.values(stats.breakdown), 1)
    : 1;

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/shop')}
            className="w-9 h-9 rounded-full bg-tg-secondary-bg flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-tg-hint" />
          </button>
          <h1 className="text-lg font-bold text-tg-text">Отзывы</h1>
          <span className="text-tg-hint text-xs ml-auto">
            {stats?.totalReviews ?? 0} отзывов
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-tg-button animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Card */}
            {stats && stats.totalReviews > 0 && (
              <div className="bg-tg-secondary-bg rounded-2xl p-5">
                <div className="flex items-center gap-5">
                  {/* Big Rating Number */}
                  <div className="text-center">
                    <p className="text-4xl font-black text-tg-text">
                      {stats.averageRating}
                    </p>
                    <div className="flex items-center gap-0.5 mt-1.5 justify-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={`${
                            (stats.averageRating ?? 0) >= star
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-white/20'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-tg-hint mt-1">
                      {stats.totalReviews} отзывов
                    </p>
                  </div>

                  {/* Breakdown Bars */}
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-[11px] text-tg-hint w-3 text-right">{star}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                            style={{
                              width: `${(stats.breakdown[star] / maxBreakdownCount) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] text-tg-hint w-5 text-left">
                          {stats.breakdown[star]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reviews List */}
            {reviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <MessageSquare size={48} className="text-tg-hint/40" />
                <p className="text-tg-hint text-sm">Пока нет отзывов</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div
                    key={r.id}
                    className="bg-tg-secondary-bg rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-tg-text text-sm font-semibold">
                        {[r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || 'Клиент'}
                      </span>
                      <span className="text-tg-hint text-[11px]">
                        {formatDate(r.deliveredAt || r.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={`${
                            r.rating >= star
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-white/20'
                          }`}
                        />
                      ))}
                      <span className="text-tg-hint text-[11px] ml-1.5">
                        Заказ #{r.id}
                      </span>
                    </div>

                    {r.review && (
                      <p className="text-tg-text text-[13px] leading-relaxed">
                        {r.review}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
