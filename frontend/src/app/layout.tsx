import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ScenarioProvider } from '@/context/ScenarioContext'

export const metadata: Metadata = {
  title: 'Trung tâm Luyện tập',
  description: 'Ứng dụng luyện tập kỹ năng nói tiếng Việt',
  generator: 'v0.app',
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
        <ScenarioProvider>
          {children}
          <Analytics />
        </ScenarioProvider>
      </body>
    </html>
  )
}
