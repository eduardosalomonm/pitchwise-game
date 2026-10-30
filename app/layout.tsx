import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './compact-play.css';
import { PlaytestProvider } from './playtest-provider';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});
const description =
  'Decide the next move. Play tactical football matches, chase a cup, or build your own league season. Learn the roles in Training Ground.';

export const metadata: Metadata = {
  metadataBase: new URL(
    'https://the-invisible-game-full-back.eduardosalomonm.chatgpt.site',
  ),
  title: 'Pitchwise | Interactive football tactics',
  description,
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Pitchwise | Interactive football tactics',
    description,
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Pitchwise: decide the next move. A tactical pitch diagram with a pass and a forward run.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pitchwise | Interactive football tactics',
    description,
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <PlaytestProvider>{children}</PlaytestProvider>
      </body>
    </html>
  );
}
