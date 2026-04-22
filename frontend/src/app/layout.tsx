import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ScenarioProvider } from '@/context/ScenarioContext'
import DemoDataSeeder from '@/components/DemoDataSeeder'

export const metadata: Metadata = {
  title: 'SpeakMate',
  description: 'Ứng dụng luyện tập kỹ năng nói tiếng Việt',
  generator: 'v0.app',
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Be+Vietnam+Pro:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased overflow-x-hidden">
        <ScenarioProvider>
          <DemoDataSeeder />
          {children}
          <Analytics />
        </ScenarioProvider>
      </body>
    </html>
  )
}
