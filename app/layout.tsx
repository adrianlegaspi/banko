import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';
export const metadata: Metadata = {
  title: 'Banko',
  description: 'Your game. Your money. Your bank.',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
