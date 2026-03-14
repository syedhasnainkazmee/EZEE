import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Process',
  description: 'Approval workflows for any kind of work.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-p-bg text-p-text font-sans antialiased">
        <AuthProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
