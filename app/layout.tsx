import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL('https://dice.nilmamano.com'),
  title: 'Dice Battler',
  description:
    'A dice roguelike: roll your die to battle, collect power-ups, and climb as far as you can.',
  openGraph: {
    title: 'Dice Battler',
    description:
      'A dice roguelike: roll your die to battle, collect power-ups, and climb as far as you can.',
    url: 'https://dice.nilmamano.com',
    siteName: 'Dice Battler',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Dice Battler — a dice roguelike',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dice Battler',
    description:
      'A dice roguelike: roll your die to battle, collect power-ups, and climb as far as you can.',
    images: ['/og.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
