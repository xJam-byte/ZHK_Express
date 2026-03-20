import type { Metadata } from 'next';
import Script from 'next/script';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ЖК-EXPRESS — Доставка по ЖК',
  description: 'Быстрая доставка продуктов прямо к двери вашей квартиры',
};

// Inline script to fix SES lockdown in Telegram WebView
// SES patches Array/Object methods which breaks React DevTools hooks
const sesFixScript = `
(function() {
  try {
    if (typeof Array.prototype.filter !== 'function') {
      Object.defineProperty(Array.prototype, 'filter', {
        value: function(callback, thisArg) {
          var result = [];
          for (var i = 0; i < this.length; i++) {
            if (i in this && callback.call(thisArg, this[i], i, this)) {
              result.push(this[i]);
            }
          }
          return result;
        },
        writable: true,
        configurable: true
      });
    }
    if (typeof Array.prototype.map !== 'function') {
      Object.defineProperty(Array.prototype, 'map', {
        value: function(callback, thisArg) {
          var result = [];
          for (var i = 0; i < this.length; i++) {
            if (i in this) {
              result.push(callback.call(thisArg, this[i], i, this));
            }
          }
          return result;
        },
        writable: true,
        configurable: true
      });
    }
    if (typeof Array.prototype.forEach !== 'function') {
      Object.defineProperty(Array.prototype, 'forEach', {
        value: function(callback, thisArg) {
          for (var i = 0; i < this.length; i++) {
            if (i in this) {
              callback.call(thisArg, this[i], i, this);
            }
          }
        },
        writable: true,
        configurable: true
      });
    }
  } catch(e) {}
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
