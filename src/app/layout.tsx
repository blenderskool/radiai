import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Radiai | AI music radio',
  description: 'Delivering AI music since 2025',
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      url: '/icons/favicon-16x16.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      url: '/icons/favicon-32x32.png',
    },
  ],
  openGraph: {
    images: [
      {
        url: 'https://radiai.appwrite.network/site-preview.jpg',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#27201d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="antialiased h-full">{children}</body>
    </html>
  );
}
