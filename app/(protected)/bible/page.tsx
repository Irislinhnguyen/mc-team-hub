'use client'

/**
 * MC Bible (Course Edition) - Main Page
 * Display all learning paths with progress tracking
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Path } from '@/lib/types/bible'
import { getBiblePermissions } from '@/lib/types/bible'
import { useAuth } from '@/app/contexts/AuthContext'
import {
  BookOpen,
  Search,
  Plus,
  BookMarked,
  CheckCircle2,
  Circle,
  TrendingUp,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { bible } from '@/lib/design-tokens'

export default function BiblePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [paths, setPaths] = useState<Path[]>([])
  const [filteredPaths, setFilteredPaths] = useState<Path[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [permissions, setPermissions] = useState<any>(null)

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch paths
        const response = await fetch('/api/bible/paths', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch paths')
        }

        const data = await response.json()
        setPaths(data.paths || [])
        setFilteredPaths(data.paths || [])

        // Set permissions based on user role
        if (user?.role) {
          setPermissions(getBiblePermissions(user.role))
        }
      } catch (error) {
        console.error('Error loading Bible data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  // Handle search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPaths(paths)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = paths.filter(path =>
        path.title?.toLowerCase().includes(query) ||
        path.description?.toLowerCase().includes(query)
      )
      setFilteredPaths(filtered)
    }
  }, [searchQuery, paths])

  const handlePathClick = (pathId: string) => {
    router.push(`/bible/paths/${pathId}`)
  }

  const handleCreatePath = () => {
    router.push('/bible/manage')
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${bible.sizes.loadingMinHeight}`}>
        <div className="text-center">
          <BookOpen className={`${bible.iconSizes.xl} mx-auto mb-4 animate-pulse text-muted-foreground`} />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`container max-w-6xl ${bible.spacing.pagePadding}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MC Bible</h1>
            <p className="text-muted-foreground mt-1">
              Knowledge base and learning platform
            </p>
          </div>
          {permissions?.canCreatePaths && (
            <Button onClick={handleCreatePath}>
              <Plus className={`${bible.iconSizes.sm} mr-2`} />
              Create Path
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${bible.iconSizes.sm} text-muted-foreground`} />
          <Input
            placeholder="Search paths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`${bible.typography.buttonText} font-medium text-muted-foreground`}>
              Total Paths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{paths.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`${bible.typography.buttonText} font-medium text-muted-foreground`}>
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {paths.filter(p => p.progress_percentage! > 0 && p.progress_percentage! < 100).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={`${bible.typography.buttonText} font-medium text-muted-foreground`}>
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {paths.filter(p => p.progress_percentage === 100).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Paths Grid */}
      {filteredPaths.length === 0 ? (
        <div className="text-center py-16">
          <BookMarked className={`${bible.iconSizes.xxl} mx-auto mb-4 text-muted-foreground`} />
          <h3 className={`${bible.typography.quizTitle} font-semibold mb-2`}>
            {searchQuery ? 'No paths found' : 'No learning paths yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery
              ? 'Try a different search term'
              : permissions?.canCreatePaths
              ? 'Create your first learning path to get started'
              : 'Check back later for new content'}
          </p>
          {permissions?.canCreatePaths && !searchQuery && (
            <Button onClick={handleCreatePath}>
              <Plus className={`${bible.iconSizes.sm} mr-2`} />
              Create First Path
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPaths.map((path) => (
            <Card
              key={path.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handlePathClick(path.id)}
              style={{
                borderTop: path.color ? `4px solid ${path.color}` : undefined,
              }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {path.icon && (
                      <div className="text-4xl mb-2">{path.icon}</div>
                    )}
                    <CardTitle className="line-clamp-1">{path.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {path.description}
                    </CardDescription>
                  </div>
                  {path.progress_percentage === 100 && (
                    <CheckCircle2 className={`${bible.iconSizes.md} text-green-500 flex-shrink-0`} />
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className={bible.spacing.sectionGap}>
                  {/* Progress */}
                  {path.article_count! > 0 && (
                    <div>
                      <div className={`flex items-center justify-between ${bible.typography.buttonText} mb-1`}>
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {path.completed_count || 0} / {path.article_count}
                        </span>
                      </div>
                      <Progress value={path.progress_percentage || 0} />
                    </div>
                  )}

                  {/* Article count badge */}
                  <div className={`flex items-center ${bible.spacing.buttonGap}`}>
                    <Badge variant="secondary" className={bible.typography.badgeText}>
                      <BookOpen className={`${bible.iconSizes.xs} mr-1`} />
                      {path.article_count || 0} {path.article_count === 1 ? 'article' : 'articles'}
                    </Badge>
                    {path.progress_percentage! > 0 && path.progress_percentage! < 100 && (
                      <Badge variant="outline" className={bible.typography.badgeText}>
                        <TrendingUp className={`${bible.iconSizes.xs} mr-1`} />
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  variant={path.progress_percentage! > 0 ? 'default' : 'outline'}
                  className="w-full"
                >
                  {path.progress_percentage! > 0 ? 'Continue' : 'Start'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
