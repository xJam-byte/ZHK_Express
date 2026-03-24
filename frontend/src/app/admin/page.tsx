'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Store,
  Upload,
  FileSpreadsheet,
  Loader2,
  TrendingUp,
  ShoppingCart,
  Users,
  DollarSign,
  Pause,
  Play,
  AlertCircle,
  Check,
  X,
  Package,
  Clock, // <-- Needed for SLA stats
} from 'lucide-react';
import {
  fetchDashboard,
  fetchShops,
  suspendShop,
  resumeShop,
  importProducts,
  exportOrders,
  DashboardData,
} from '@/lib/api';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { hapticFeedback, hapticNotification } from '@/lib/telegram';

type Tab = 'analytics' | 'shops' | 'import';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('analytics');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Import state
  const [file, setFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardData, shopsData] = await Promise.all([
        fetchDashboard(),
        fetchShops(),
      ]);
      setDashboard(dashboardData);
      setShops(Array.isArray(shopsData) ? [...shopsData] : []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (id: number) => {
    try {
      setActionLoading(id);
      hapticFeedback('medium');
      await suspendShop(id);
      hapticNotification('success');
      await loadData();
    } catch (err) {
      hapticNotification('error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: number) => {
    try {
      setActionLoading(id);
      hapticFeedback('medium');
      await resumeShop(id);
      hapticNotification('success');
      await loadData();
    } catch (err) {
      hapticNotification('error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExport = async () => {
    try {
      hapticFeedback('medium');
      const orders = await exportOrders();
      
      const headers = ['ID', 'Дата', 'Сумма', 'Доставка', 'Скидка', 'Промокод', 'Статус', 'Клиент', 'Адрес'];
      const rows = orders.map((o: any) => [
        o.id,
        new Date(o.createdAt).toLocaleString('ru-RU'),
        o.totalAmount,
        o.deliveryFee,
        o.discountAmount,
        o.promoCode?.code || '',
        o.status,
        `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim(),
        o.deliveryAddress
      ]);
      const csvContent = [
        headers.join(','),
        ...rows.map((r: any[]) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      hapticNotification('success');
    } catch (err) {
      console.error(err);
      hapticNotification('error');
    }
  };

  // Import handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImportResult(null);
      setImportError(null);
      hapticFeedback('light');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setImportResult(null);
      setImportError(null);
      hapticFeedback('light');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setImportLoading(true);
      setImportError(null);
      setImportResult(null);
      const data = await importProducts(file);
      setImportResult(data);
      hapticNotification('success');
      setFile(null);
      const input = document.getElementById('admin-file-input') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err: any) {
      setImportError(err.response?.data?.message || 'Ошибка при загрузке файла');
      hapticNotification('error');
    } finally {
      setImportLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
    { id: 'shops', label: 'Магазины', icon: Store },
    { id: 'import', label: 'Импорт', icon: Upload },
  ];

  return (
    <div className="min-h-screen pb-8 page-enter">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-tg-text">Панель управления</h1>
            <p className="text-xs text-tg-hint mt-0.5">Администратор</p>
          </div>
          {tab === 'analytics' && (
            <button
              onClick={handleExport}
              className="px-3 py-1.5 bg-tg-button/10 text-tg-button text-[11px] font-bold rounded-lg flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <FileSpreadsheet size={14} />
              Экспорт CSV
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 pb-3 flex gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); hapticFeedback('light'); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all
                  ${isActive
                    ? 'bg-tg-button text-tg-button-text shadow-md'
                    : 'bg-tg-secondary-bg text-tg-hint'
                  }`}
              >
                <Icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="text-tg-button animate-spin" />
            <p className="text-tg-hint text-sm">Загрузка данных...</p>
          </div>
        ) : (
          <>
            {/* ─── Analytics Tab ────────────────────── */}
            {tab === 'analytics' && dashboard && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign size={16} className="text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-tg-text">
                      {dashboard.totalRevenue.toLocaleString()} ₸
                    </p>
                    <p className="text-[10px] text-tg-hint uppercase tracking-wide mt-1">Общий доход</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-2xl p-4 border border-blue-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <ShoppingCart size={16} className="text-blue-400" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-tg-text">
                      {dashboard.totalOrders}
                    </p>
                    <p className="text-[10px] text-tg-hint uppercase tracking-wide mt-1">Всего заказов</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl p-4 border border-purple-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <TrendingUp size={16} className="text-purple-400" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-tg-text">
                      {dashboard.averageOrderAmount.toLocaleString()} ₸
                    </p>
                    <p className="text-[10px] text-tg-hint uppercase tracking-wide mt-1">Средний чек</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-2xl p-4 border border-amber-500/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Users size={16} className="text-amber-400" />
                      </div>
                    </div>
                    <p className="text-lg font-bold text-tg-text">
                      {dashboard.totalClients}
                    </p>
                    <p className="text-[10px] text-tg-hint uppercase tracking-wide mt-1">Клиентов</p>
                  </div>
                </div>

                {/* Platform Revenue Card */}
                <div className="bg-tg-secondary-bg rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-tg-text mb-3 flex items-center gap-2">
                    <DollarSign size={16} className="text-tg-button" />
                    Наш заработок (доставка)
                  </h3>
                  <p className="text-2xl font-bold text-emerald-400">
                    {dashboard.platformFee.toLocaleString()} ₸
                  </p>
                  <p className="text-xs text-tg-hint mt-1">
                    Комиссия с {dashboard.deliveredOrders} доставленных заказов
                  </p>
                </div>

                {/* Order Stats */}
                <div className="bg-tg-secondary-bg rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-tg-text mb-3 flex items-center gap-2">
                    <ShoppingCart size={16} className="text-tg-button" />
                    Статистика заказов
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-tg-bg rounded-xl p-3">
                      <p className="text-lg font-bold text-green-400">{dashboard.deliveredOrders}</p>
                      <p className="text-[10px] text-tg-hint uppercase">Доставлено</p>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-3">
                      <p className="text-lg font-bold text-yellow-400">{dashboard.activeOrders}</p>
                      <p className="text-[10px] text-tg-hint uppercase">Активных</p>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-3">
                      <p className="text-lg font-bold text-orange-400">{dashboard.pendingOrders}</p>
                      <p className="text-[10px] text-tg-hint uppercase">Ожидают</p>
                    </div>
                    <div className="bg-tg-bg rounded-xl p-3">
                      <p className="text-lg font-bold text-red-400">{dashboard.cancelledOrders}</p>
                      <p className="text-[10px] text-tg-hint uppercase">Отменено</p>
                    </div>
                  </div>
                </div>

                {/* Charts Area */}
                {dashboard.salesTrend && dashboard.salesTrend.length > 0 && (
                  <div className="bg-tg-secondary-bg rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-tg-text mb-3 flex items-center gap-2">
                      <TrendingUp size={16} className="text-tg-button" />
                      Динамика продаж (30 дней)
                    </h3>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboard.salesTrend}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#4ADE80" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(tick) => tick.slice(5)} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#8e8e93'}} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#8e8e93'}}
                            width={40}
                            tickFormatter={(val) => val > 1000 ? `${(val/1000).toFixed(0)}k` : val}
                          />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#4ADE80', fontWeight: 'bold' }}
                            formatter={(value: any) => [`${value?.toLocaleString() || value} ₸`, '']}
                            labelStyle={{ color: '#8e8e93', marginBottom: '4px' }}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#4ADE80" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {dashboard.topProducts && dashboard.topProducts.length > 0 && (
                  <div className="bg-tg-secondary-bg rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-tg-text mb-3 flex items-center gap-2">
                      <BarChart3 size={16} className="text-tg-button" />
                      Топ 5 товаров
                    </h3>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboard.topProducts} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#8e8e93'}} 
                            width={90}
                          />
                          <RechartsTooltip 
                            cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ color: '#60A5FA', fontWeight: 'bold' }}
                            formatter={(value: any) => [value, 'шт']}
                          />
                          <Bar dataKey="quantity" fill="#60A5FA" radius={[0, 4, 4, 0]} barSize={16}>
                            {dashboard.topProducts.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'][index % 5]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {dashboard.slaStats && dashboard.slaStats.length > 0 && (
                  <div className="bg-tg-secondary-bg rounded-2xl p-4">
                    <h3 className="text-sm font-semibold text-tg-text mb-3 flex items-center gap-2">
                      <Clock size={16} className="text-tg-button" />
                      SLA доставки
                    </h3>
                    <div className="h-44 w-full flex items-center justify-center">
                      <ResponsiveContainer width="50%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboard.slaStats}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                          >
                            {dashboard.slaStats.map((entry, index) => {
                              const colors = ['#4ADE80', '#FBBF24', '#F87171'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ fontWeight: 'bold' }}
                            formatter={(value: any) => [value, 'заказов']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="w-1/2 flex flex-col justify-center gap-2 pl-4">
                        {dashboard.slaStats.map((stat, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2.5 h-2.5 rounded-full`} style={{ backgroundColor: ['#4ADE80', '#FBBF24', '#F87171'][i % 3] }} />
                              <span className="text-tg-hint">{stat.name}</span>
                            </div>
                            <span className="font-bold text-tg-text">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Per-Shop Revenue */}
                {dashboard.shops.length > 0 && (
                  <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                      <Store size={16} className="text-tg-button" />
                      <h3 className="text-sm font-semibold text-tg-text">Доход по магазинам</h3>
                    </div>
                    <div className="divide-y divide-white/5">
                      {dashboard.shops.map((shop) => (
                        <div key={shop.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${shop.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-tg-text truncate">{shop.name}</p>
                              <p className="text-xs text-tg-hint">
                                {shop.deliveredOrderCount} заказов · {shop.totalProducts} товаров
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-tg-text whitespace-nowrap ml-3">
                            {shop.revenue.toLocaleString()} ₸
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ─── Shops Tab ───────────────────────── */}
            {tab === 'shops' && (
              <>
                {/* Overview */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-tg-secondary-bg rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{dashboard?.activeShops || 0}</p>
                    <p className="text-[10px] text-tg-hint uppercase tracking-wide mt-1">Активных</p>
                  </div>
                  <div className="bg-tg-secondary-bg rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{dashboard?.suspendedShops || 0}</p>
                    <p className="text-[10px] text-tg-hint uppercase tracking-wide mt-1">Приостановлено</p>
                  </div>
                </div>

                {/* Shop List */}
                {shops.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Store size={48} className="text-tg-hint/40" />
                    <p className="text-tg-hint text-sm">Нет магазинов</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shops.map((shop: any) => {
                      const isLoading = actionLoading === shop.id;
                      return (
                        <div
                          key={shop.id}
                          className={`bg-tg-secondary-bg rounded-2xl overflow-hidden transition-opacity ${
                            !shop.isActive ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                shop.isActive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]' : 'bg-red-400'
                              }`} />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-tg-text truncate">{shop.name}</p>
                                <p className="text-xs text-tg-hint">
                                  {shop.user?.firstName || ''} {shop.user?.lastName || ''} 
                                  {shop.user?.username ? ` @${shop.user.username}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              shop.isActive
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {shop.isActive ? 'Активен' : 'Приостановлен'}
                            </span>
                          </div>

                          <div className="px-4 py-3 grid grid-cols-3 gap-2">
                            <div className="bg-tg-bg rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-tg-text">{shop._count?.products || 0}</p>
                              <p className="text-[9px] text-tg-hint uppercase">Товаров</p>
                            </div>
                            <div className="bg-tg-bg rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-tg-text">{shop._count?.orders || 0}</p>
                              <p className="text-[9px] text-tg-hint uppercase">Заказов</p>
                            </div>
                            <div className="bg-tg-bg rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold text-emerald-400">{(shop.revenue || 0).toLocaleString()}</p>
                              <p className="text-[9px] text-tg-hint uppercase">Доход ₸</p>
                            </div>
                          </div>

                          <div className="px-4 pb-3">
                            {shop.isActive ? (
                              <button
                                onClick={() => handleSuspend(shop.id)}
                                disabled={isLoading}
                                className="w-full py-2.5 bg-red-500/10 rounded-xl text-red-400 text-xs font-semibold
                                           flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Pause size={14} />
                                )}
                                Приостановить
                              </button>
                            ) : (
                              <button
                                onClick={() => handleResume(shop.id)}
                                disabled={isLoading}
                                className="w-full py-2.5 bg-green-500/10 rounded-xl text-green-400 text-xs font-semibold
                                           flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                              >
                                {isLoading ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Play size={14} />
                                )}
                                Возобновить
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ─── Import Tab ──────────────────────── */}
            {tab === 'import' && (
              <>
                <div className="bg-tg-secondary-bg rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-tg-button" />
                    <h2 className="text-sm font-semibold text-tg-text">
                      Импорт прайс-листа
                    </h2>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-tg-hint mb-4">
                      Загрузите файл CSV или Excel (.xlsx) с колонками: 
                      <span className="text-tg-text font-medium"> Название, Цена, Остаток</span>
                    </p>

                    <label
                      htmlFor="admin-file-input"
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`block w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                        ${dragOver
                          ? 'border-tg-button bg-tg-button/10'
                          : file
                            ? 'border-green-500/40 bg-green-500/5'
                            : 'border-white/10 hover:border-tg-button/30'
                        }`}
                    >
                      <input
                        id="admin-file-input"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                            <FileSpreadsheet size={24} className="text-green-400" />
                          </div>
                          <p className="text-sm text-tg-text font-medium">{file.name}</p>
                          <p className="text-xs text-tg-hint">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-tg-button/10 flex items-center justify-center">
                            <Upload size={24} className="text-tg-button" />
                          </div>
                          <p className="text-sm text-tg-text">Нажмите для выбора файла</p>
                          <p className="text-xs text-tg-hint">CSV, XLS, XLSX</p>
                        </div>
                      )}
                    </label>

                    {file && (
                      <div className="mt-4 flex gap-2 animate-slide-up">
                        <button
                          onClick={handleUpload}
                          disabled={importLoading}
                          className="flex-1 py-3 bg-tg-button rounded-xl text-tg-button-text font-semibold text-sm
                                     transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {importLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          {importLoading ? 'Загрузка...' : 'Импортировать'}
                        </button>
                        <button
                          onClick={() => {
                            setFile(null);
                            setImportResult(null);
                            setImportError(null);
                            const input = document.getElementById('admin-file-input') as HTMLInputElement;
                            if (input) input.value = '';
                          }}
                          className="w-12 h-12 bg-tg-bg rounded-xl flex items-center justify-center transition-transform active:scale-90"
                        >
                          <X size={16} className="text-tg-hint" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {importResult && (
                  <div className="bg-tg-secondary-bg rounded-2xl p-4 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <Check size={16} className="text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-tg-text">Импорт завершён</p>
                        <p className="text-xs text-tg-hint">Обработано {importResult.total} записей</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="bg-tg-bg rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-green-400">{importResult.created}</p>
                        <p className="text-[10px] text-tg-hint uppercase tracking-wide">Создано</p>
                      </div>
                      <div className="bg-tg-bg rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-blue-400">{importResult.updated}</p>
                        <p className="text-[10px] text-tg-hint uppercase tracking-wide">Обновлено</p>
                      </div>
                      <div className="bg-tg-bg rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-red-400">{importResult.errors?.length || 0}</p>
                        <p className="text-[10px] text-tg-hint uppercase tracking-wide">Ошибок</p>
                      </div>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="mt-3 bg-red-500/10 rounded-xl p-3">
                        <p className="text-xs font-semibold text-red-400 mb-1">Ошибки:</p>
                        {importResult.errors.map((err: string, i: number) => (
                          <p key={i} className="text-xs text-tg-hint">{err}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {importError && (
                  <div className="bg-red-500/10 rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
                    <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-400">Ошибка</p>
                      <p className="text-xs text-tg-hint mt-1">{importError}</p>
                    </div>
                  </div>
                )}

                <div className="bg-tg-secondary-bg/50 rounded-2xl p-4">
                  <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-3">Формат файла</h3>
                  <div className="bg-tg-bg rounded-xl p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-tg-hint">
                          <th className="text-left p-1.5">Название</th>
                          <th className="text-left p-1.5">Цена</th>
                          <th className="text-left p-1.5">Остаток</th>
                        </tr>
                      </thead>
                      <tbody className="text-tg-text">
                        <tr className="border-t border-white/5">
                          <td className="p-1.5">Молоко 1л</td>
                          <td className="p-1.5">650</td>
                          <td className="p-1.5">20</td>
                        </tr>
                        <tr className="border-t border-white/5">
                          <td className="p-1.5">Хлеб белый</td>
                          <td className="p-1.5">250</td>
                          <td className="p-1.5">15</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-tg-hint mt-2">
                    Поддерживаются колонки на русском и английском языке
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
