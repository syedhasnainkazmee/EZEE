import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'EZEE',
  description: 'Design review & approval workflows.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-p-bg text-p-text font-sans antialiased">
        <AuthProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto" id="main-scroll">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
