'use client'

import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/config/queryClient'
import { AuthProvider } from './contexts/AuthContext'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/*
          Desktop-only viewport: Forces 1280px width on all devices
          Mobile users can pinch-to-zoom and pan (Looker Studio approach)
          This viewport MUST be paired with FORCE_DESKTOP_LAYOUT=true in use-mobile.tsx
        */}
        <meta name="viewport" content="width=1280, user-scalable=yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              {children}
              <Toaster />
              <SonnerToaster />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
