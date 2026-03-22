'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { importProducts } from '@/lib/api';
import { getTelegramWebApp, hapticFeedback, hapticNotification } from '@/lib/telegram';
import { useEffect } from 'react';

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: string[];
}

export default function ShopImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const webapp = getTelegramWebApp();
    if (webapp) {
      webapp.ready();
      webapp.BackButton?.show();
      webapp.BackButton?.onClick(() => router.push('/shop'));
    }
    return () => { webapp?.BackButton?.hide(); };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
      hapticFeedback('light');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setResult(null);
      setError(null);
      hapticFeedback('light');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const data = await importProducts(file);
      setResult(data);
      hapticNotification('success');
      setFile(null);

      const input = document.getElementById('shop-file-input') as HTMLInputElement;
      if (input) input.value = '';
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Ошибка при загрузке файла';
      setError(message);
      hapticNotification('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-8 page-enter">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-tg-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/shop')}
            className="w-9 h-9 rounded-full bg-tg-secondary-bg flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-tg-hint" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-tg-text">Импорт товаров</h1>
            <p className="text-xs text-tg-hint mt-0.5">Загрузите прайс-лист</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Import Section */}
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

            {/* Drop Zone */}
            <label
              htmlFor="shop-file-input"
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`block w-full border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                ${
                  dragOver
                    ? 'border-tg-button bg-tg-button/10'
                    : file
                      ? 'border-green-500/40 bg-green-500/5'
                      : 'border-white/10 hover:border-tg-button/30'
                }`}
            >
              <input
                id="shop-file-input"
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
                  <p className="text-xs text-tg-hint">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-tg-button/10 flex items-center justify-center">
                    <Upload size={24} className="text-tg-button" />
                  </div>
                  <p className="text-sm text-tg-text">
                    Нажмите для выбора файла
                  </p>
                  <p className="text-xs text-tg-hint">CSV, XLS, XLSX</p>
                </div>
              )}
            </label>

            {/* Upload Button */}
            {file && (
              <div className="mt-4 flex gap-2 animate-slide-up">
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="flex-1 py-3 bg-tg-button rounded-xl text-tg-button-text font-semibold text-sm
                             transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Upload size={16} />
                  )}
                  {loading ? 'Загрузка...' : 'Импортировать'}
                </button>

                <button
                  onClick={() => {
                    setFile(null);
                    setResult(null);
                    setError(null);
                    const input = document.getElementById('shop-file-input') as HTMLInputElement;
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

        {/* Result */}
        {result && (
          <div className="bg-tg-secondary-bg rounded-2xl p-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Check size={16} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-tg-text">Импорт завершён</p>
                <p className="text-xs text-tg-hint">Обработано {result.total} записей</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-tg-bg rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-400">{result.created}</p>
                <p className="text-[10px] text-tg-hint uppercase tracking-wide">Создано</p>
              </div>
              <div className="bg-tg-bg rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-blue-400">{result.updated}</p>
                <p className="text-[10px] text-tg-hint uppercase tracking-wide">Обновлено</p>
              </div>
              <div className="bg-tg-bg rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-red-400">{result.errors.length}</p>
                <p className="text-[10px] text-tg-hint uppercase tracking-wide">Ошибок</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="mt-3 bg-red-500/10 rounded-xl p-3">
                <p className="text-xs font-semibold text-red-400 mb-1">Ошибки:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-tg-hint">{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
            <AlertCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Ошибка</p>
              <p className="text-xs text-tg-hint mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Format Help */}
        <div className="bg-tg-secondary-bg/50 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-tg-hint uppercase tracking-wider mb-3">
            Формат файла
          </h3>
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
      </div>
    </div>
  );
}
