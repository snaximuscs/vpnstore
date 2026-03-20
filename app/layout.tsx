import type { Metadata } from 'next'
// Inter served from local node_modules — no network request at runtime
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './globals.css'

export const metadata: Metadata = {
  title: '1stCS VPN — Найдвартай VPN үйлчилгээ',
  description: 'WireGuard суурьт хурдан, найдвартай VPN үйлчилгээ. QPay-р төлж шууд ашиглана.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: '1stCS VPN',
    description: 'WireGuard суурьт хурдан, найдвартай VPN үйлчилгээ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
