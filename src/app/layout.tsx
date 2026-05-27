import type { ReactNode } from 'react';
import './globals.css';
import { BUSINESS_PROFILE } from '../lib/business-profile';
import { AppFeedbackProvider } from '../components/app-feedback';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata = {
  title: BUSINESS_PROFILE.shopName,
  description: 'Minimal finance and sales workflow dashboard.',
  authors: [{ name: 'Abdul Hakeem Shah' }],
  creator: 'Abdul Hakeem Shah',
  publisher: 'Abdul Hakeem Shah',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth hide-scrollbars-global">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="hide-scrollbars-global">
        <AppFeedbackProvider>{children}</AppFeedbackProvider>
      </body>
    </html>
  );
}
