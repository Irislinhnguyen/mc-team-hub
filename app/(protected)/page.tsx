'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { LineChart, Shield, GitBranch, BookOpen, Trophy, Newspaper, Heart, Wrench } from 'lucide-react'
import { ProductCard } from '../components/home/ProductCard'
import { Header } from '../components/layout/Header'
import { useAuth } from '../contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  // Get time-based greeting - memoized to prevent random changes on re-render
  const greeting = useMemo(() => {
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
  }, [user?.name]) // Only recalculate when user name changes

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-8 py-8 md:py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-96 mx-auto mb-3" />
                <Skeleton className="h-5 w-80 mx-auto" />
              </>
            ) : (
              <>
                <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-3">
                  {greeting}
                </h2>
                <p className="text-sm md:text-base text-gray-600">
                  Access all your tools and resources in one place
                </p>
              </>
            )}
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <ProductCard
              title="GCPP Check"
              description="Monitor and validate GCPP compliance across all publishers and products"
              icon={<Shield className="h-full w-full" />}
              status="active"
              onClick={() => router.push('/gcpp-check/market-overview')}
            />

            <ProductCard
              title="Performance Tracker"
              description="Track and analyze performance metrics with comprehensive analytics dashboards"
              icon={<LineChart className="h-full w-full" />}
              status="active"
              onClick={() => router.push('/performance-tracker/business-health')}
            />

            <ProductCard
              title="Tools"
              description="AI-powered tools to automate your workflow"
              icon={<Wrench className="h-full w-full" />}
              status="active"
              onClick={() => router.push('/tools')}
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
              status="active"
              onClick={() => router.push('/challenges')}
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
          <div className="mt-12 md:mt-16 text-center text-sm text-slate-500">
            <p>Need help or have questions? Contact the MC Team</p>
          </div>
        </div>
      </main>
    </div>
  )
}
