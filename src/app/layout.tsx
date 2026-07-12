import type { Metadata } from 'next';
import { Bodoni_Moda, Geist_Mono, Outfit, Syne } from 'next/font/google';

import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

/* Merisca-like: high-contrast condensed Didone for display */
const bodoni = Bodoni_Moda({
  variable: '--font-bodoni',
  subsets: ['latin'],
});

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Aruna — Maps for Photographers',
  description:
    'Pin a place, read the light, and shoot the frame — location scouting built for photographers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${bodoni.variable} ${syne.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  );
}
