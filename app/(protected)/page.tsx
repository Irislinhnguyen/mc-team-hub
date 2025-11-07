'use client'

import { useRouter } from 'next/navigation'
import { LineChart, Shield, GitBranch, LogOut, BookOpen, Trophy, Newspaper, Heart } from 'lucide-react'
import { ProductCard } from '../components/home/ProductCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    const userName = user?.name || 'there'

    // Different greeting styles based on time of day
    const morningGreetings = [
      `Good morning, ${userName}! What would you like to work on?`,
      `Rise and shine, ${userName}! How can I help you today?`,
      `Morning, ${userName}! What do you need?`,
      `Good morning, ${userName}! Where should we start?`,
      `Hey ${userName}! Ready to tackle the day?`,
      `Good morning, ${userName}! Let's get started!`,
    ]

    const afternoonGreetings = [
      `Good afternoon, ${userName}! What would you like to work on?`,
      `Hey ${userName}! How can I help you today?`,
      `Afternoon, ${userName}! What do you need?`,
      `Good afternoon, ${userName}! Where should we start?`,
      `Hi ${userName}! What brings you here today?`,
      `Good afternoon, ${userName}! Ready to dive in?`,
    ]

    const eveningGreetings = [
      `Good evening, ${userName}! What would you like to work on?`,
      `Evening, ${userName}! How can I help you today?`,
      `Good evening, ${userName}! What do you need?`,
      `Hey ${userName}! Still working hard?`,
      `Good evening, ${userName}! What brings you here?`,
      `Hi ${userName}! Ready to wrap things up?`,
    ]

    const nightGreetings = [
      `Burning the midnight oil, ${userName}? How can I help?`,
      `Working late, ${userName}? What do you need?`,
      `Hey night owl! What would you like to work on?`,
      `Hi ${userName}! What brings you here at this hour?`,
      `Good night, ${userName}! How can I assist you?`,
      `Still at it, ${userName}? Let's get it done!`,
    ]

    // Select greeting array based on time
    let greetingArray = []
    if (hour >= 5 && hour < 12) {
      greetingArray = morningGreetings
    } else if (hour >= 12 && hour < 18) {
      greetingArray = afternoonGreetings
    } else if (hour >= 18 && hour < 22) {
      greetingArray = eveningGreetings
    } else {
      greetingArray = nightGreetings
    }

    // Pick a random greeting from the appropriate array
    const randomIndex = Math.floor(Math.random() * greetingArray.length)
    return greetingArray[randomIndex]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1565C0]">MC Team Hub</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive data analytics and monitoring tools
              </p>
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <p className="text-sm font-medium text-gray-900">{user.name || 'User'}</p>
                    {user.role === 'admin' && (
                      <Badge className="text-xs bg-[#1565C0] hover:bg-[#0D47A1]">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-gray-800 mb-3">
              {getGreeting()}
            </h2>
            <p className="text-gray-600">
              Choose from our suite of data tools to get started
            </p>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ProductCard
              title="GCPP Check"
              description="Monitor and validate GCPP compliance across all publishers and products"
              icon={<Shield className="h-full w-full" />}
              status="developing"
              onClick={null}
            />

            <ProductCard
              title="Performance Tracker"
              description="Track and analyze performance metrics with comprehensive analytics dashboards"
              icon={<LineChart className="h-full w-full" />}
              status="active"
              onClick={() => router.push('/performance-tracker/business-health')}
            />

            <ProductCard
              title="Pipeline"
              description="Data pipeline monitoring and management for seamless data flow"
              icon={<GitBranch className="h-full w-full" />}
              status="developing"
              onClick={null}
            />

            <ProductCard
              title="MC Bible (Course Edition)"
              description="Training resources and course materials for MC team development"
              icon={<BookOpen className="h-full w-full" />}
              status="developing"
              onClick={null}
            />

            <ProductCard
              title="Knowledge Championship"
              description="Monthly testing challenges with competitive leaderboard and performance rankings"
              icon={<Trophy className="h-full w-full" />}
              status="developing"
              onClick={null}
            />

            <ProductCard
              title="Industry Update"
              description="Latest industry trends, news, and market insights"
              icon={<Newspaper className="h-full w-full" />}
              status="developing"
              onClick={null}
            />

            <ProductCard
              title="MC Story"
              description="Share your journey and memories with the team - building our collective memory hall"
              icon={<Heart className="h-full w-full" />}
              status="developing"
              onClick={null}
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
