import type { Metadata, Viewport } from 'next';
import { Bodoni_Moda, Kalam, Literata, Noto_Serif_Telugu, Patrick_Hand, Permanent_Marker } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { BookShell } from '@/components/book/BookShell';
import './globals.css';

const bodoni = Bodoni_Moda({ variable: '--font-bodoni', subsets: ['latin'], style: ['normal', 'italic'], display: 'swap' });
const literata = Literata({ variable: '--font-literata', subsets: ['latin'], display: 'swap' });
const telugu = Noto_Serif_Telugu({ variable: '--font-telugu', subsets: ['telugu'], display: 'swap' });
const kalam = Kalam({ variable: '--font-kalam', subsets: ['latin'], weight: ['400', '700'], display: 'swap' });
// "Bindu explains" whiteboard: marker heading + hand-written lines (the canvas reads the families from these variables).
const marker = Permanent_Marker({ variable: '--font-marker', subsets: ['latin'], weight: '400', display: 'swap' });
const boardHand = Patrick_Hand({ variable: '--font-board', subsets: ['latin'], weight: '400', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'VigyanVerse AI', template: '%s | VigyanVerse AI' },
  description: 'Class 10 Science (Physics, Chemistry, Biology) with an AI tutor that answers from the NCERT textbook.',
};

export const viewport: Viewport = {
  themeColor: '#102b29',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${bodoni.variable} ${literata.variable} ${telugu.variable} ${kalam.variable} ${marker.variable} ${boardHand.variable}`}>
      <body>
        <AuthProvider>
          <BookShell />
          {/* Route pages render nothing themselves: the book shows the page for the current URL. */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
