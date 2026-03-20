import type { Metadata } from 'next';
import Script from 'next/script';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ЖК-EXPRESS — Доставка по ЖК',
  description: 'Быстрая доставка продуктов прямо к двери вашей квартиры',
};

// Aggressive SES lockdown fix for Telegram WebView
// Saves native Array methods BEFORE SES can remove them,
// then re-applies them on multiple timing hooks (sync + microtask + timeout)
const sesFixScript = `
(function() {
  var nativeFilter = Array.prototype.filter;
  var nativeMap = Array.prototype.map;
  var nativeForEach = Array.prototype.forEach;
  var nativeReduce = Array.prototype.reduce;
  var nativeFind = Array.prototype.find;
  var nativeFindIndex = Array.prototype.findIndex;
  var nativeSome = Array.prototype.some;
  var nativeEvery = Array.prototype.every;
  var nativeIncludes = Array.prototype.includes;

  function restore() {
    try {
      if (typeof Array.prototype.filter !== 'function' && nativeFilter) {
        Array.prototype.filter = nativeFilter;
      }
      if (typeof Array.prototype.map !== 'function' && nativeMap) {
        Array.prototype.map = nativeMap;
      }
      if (typeof Array.prototype.forEach !== 'function' && nativeForEach) {
        Array.prototype.forEach = nativeForEach;
      }
      if (typeof Array.prototype.reduce !== 'function' && nativeReduce) {
        Array.prototype.reduce = nativeReduce;
      }
      if (typeof Array.prototype.find !== 'function' && nativeFind) {
        Array.prototype.find = nativeFind;
      }
      if (typeof Array.prototype.findIndex !== 'function' && nativeFindIndex) {
        Array.prototype.findIndex = nativeFindIndex;
      }
      if (typeof Array.prototype.some !== 'function' && nativeSome) {
        Array.prototype.some = nativeSome;
      }
      if (typeof Array.prototype.every !== 'function' && nativeEvery) {
        Array.prototype.every = nativeEvery;
      }
      if (typeof Array.prototype.includes !== 'function' && nativeIncludes) {
        Array.prototype.includes = nativeIncludes;
      }
    } catch(e) {}
  }

  // Try to restore at multiple timing points to beat SES
  restore();
  if (typeof Promise !== 'undefined') {
    Promise.resolve().then(restore);
  }
  if (typeof setTimeout !== 'undefined') {
    setTimeout(restore, 0);
    setTimeout(restore, 50);
    setTimeout(restore, 150);
  }
  if (typeof queueMicrotask !== 'undefined') {
    queueMicrotask(restore);
  }

  // Also override lockdown if it exists
  var origLockdown = window.lockdown;
  if (typeof origLockdown === 'function') {
    window.lockdown = function() {
      var result = origLockdown.apply(this, arguments);
      restore();
      return result;
    };
  }

  // MutationObserver to restore after any script injection
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function() { restore(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function() { observer.disconnect(); }, 3000);
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <script dangerouslySetInnerHTML={{ __html: sesFixScript }} />
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-tg-bg text-tg-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
