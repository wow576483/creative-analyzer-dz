import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: '3ARSI · نظام تنظيم العرس الجزائري',
  description: 'باقة رقمية فاخرة للعروس الجزائرية: لوحة تحكم، ميزانية، جدول زمني، قائمة مهام، إدارة المدعوّين وكتاب عرس PDF فاخر.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: '3ARSI', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#8F2F38',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Montserrat:wght@400;500;600&family=Playfair+Display:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
