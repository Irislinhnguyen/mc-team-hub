'use client'

import { useRouter } from 'next/navigation'
import { Wrench, ArrowLeft } from 'lucide-react'
import { ProductCard } from '@/app/components/home/ProductCard'
import { Header } from '@/app/components/layout/Header'
import { Button } from '@/components/ui/button'

export default function ToolsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-8 py-16">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </div>

          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              Tools
            </h2>
            <p className="text-gray-600">
              AI-powered tools to automate your workflow
            </p>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProductCard
              title="AI Tag Creation Assistant"
              description="Generate zone CSV files, extract Zone IDs from screenshots, and sync to Google Sheets"
              icon={<Wrench className="h-full w-full" />}
              status="active"
              onClick={() => router.push('/tools/tag-creation')}
            />
          </div>

          {/* Footer Info */}
          <div className="mt-16 text-center text-sm text-slate-500">
            <p>Need help or have questions? Contact the MC Team</p>
          </div>
        </div>
      </main>
    </div>
  )
}
